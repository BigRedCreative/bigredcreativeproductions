import "server-only";
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_UPLOAD_BYTES } from "@/data/media";

// The one place an uploaded video's actual bytes get inspected before a
// media_assets row is ever created. Mirrors validate-media-upload.ts's
// exact philosophy (real magic-byte sniffing, never trusting the
// browser's declared filename/Content-Type as the real check) — but
// operates on a byte PREFIX (a few hundred bytes), not the full file,
// since video bytes never pass through our server as a single in-memory
// buffer the way images do (see CLAUDE.md "Video Media Library" — video
// uses a client-direct-to-Blob upload, not a Server Action body).
//
// Allowlist-based on purpose, same as images: only MP4/WebM are ever
// accepted. Nothing outside the allowlist can ever pass — there is no
// denylist to keep complete.
//
// MAX_VIDEO_UPLOAD_BYTES / ALLOWED_VIDEO_CONTENT_TYPES live in
// src/data/media.ts (plain data, not server-only) since the client
// upload form needs them too — re-exported here so every SERVER caller
// can keep importing size/format constants from this one file, matching
// the existing validate-media-upload.ts import shape.
export { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_UPLOAD_BYTES };

export type AllowedVideoFormat = "mp4" | "webm";

const FORMAT_MIME_TYPES: Record<AllowedVideoFormat, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

const FORMAT_EXTENSIONS: Record<AllowedVideoFormat, string> = {
  mp4: "mp4",
  webm: "webm",
};

// MP4 (ISO-BMFF): the first box is almost always `ftyp` — 4 bytes of box
// size, then the ASCII bytes "ftyp" at offset 4-7, then a 4-byte major
// brand. This is the same signature every real MP4 file starts with,
// independent of codec/encoder — checking for it is the standard,
// reliable way tools identify "this is an MP4-family container."
function isMp4(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  );
}

// WebM/Matroska both start with the same EBML magic number
// (0x1A45DFA3) — WebM is a constrained profile of Matroska, so the
// magic number alone can't distinguish them. The EBML header's DocType
// element (ID 0x4282) carries the literal ASCII string "webm" or
// "matroska" a short distance into the file. Rather than fully parsing
// the EBML element tree (real complexity: variable-length integers,
// nested master elements — exactly the "fragile hand-written container
// parser" this project deliberately avoided for duration parsing), this
// does a bounded search for the ASCII bytes "webm" within the first 512
// bytes, which is well past where every real encoder places the DocType
// element. This is a practical, not a perfect, check — documented
// honestly: a deliberately malformed Matroska file containing the byte
// sequence "webm" somewhere in its first 512 bytes could misclassify as
// WebM. That is a correctness/UX risk (the file may simply fail to play
// in some browsers), not a security one — both WebM and Matroska are
// legitimate binary media containers, neither is script/HTML/executable,
// and the EBML magic-number check already confirms it's a real
// EBML-based container before this heuristic ever runs.
function isWebm(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x1a || bytes[1] !== 0x45 || bytes[2] !== 0xdf || bytes[3] !== 0xa3) {
    return false;
  }
  const searchWindow = bytes.subarray(0, Math.min(bytes.length, 512));
  const needle = [0x77, 0x65, 0x62, 0x6d]; // "webm"
  for (let i = 0; i <= searchWindow.length - needle.length; i++) {
    if (
      searchWindow[i] === needle[0] &&
      searchWindow[i + 1] === needle[1] &&
      searchWindow[i + 2] === needle[2] &&
      searchWindow[i + 3] === needle[3]
    ) {
      return true;
    }
  }
  return false;
}

function sniffVideoFormat(bytes: Uint8Array): AllowedVideoFormat | null {
  if (isMp4(bytes)) return "mp4";
  if (isWebm(bytes)) return "webm";
  return null;
}

export type VideoValidationResult =
  | { ok: true; format: AllowedVideoFormat; mimeType: string; extension: string }
  | { ok: false; error: string };

// Validates a byte PREFIX already read into memory (the caller fetches
// only the first ~512 bytes of the uploaded Blob object via a ranged
// request — see fetchAndValidateUploadedVideo() below). Total file size
// is verified separately, server-side, from the real Content-Range the
// Blob storage itself reports — never from a client-supplied number.
export function validateVideoUpload(bytes: Uint8Array): VideoValidationResult {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "The uploaded file is empty." };
  }

  const format = sniffVideoFormat(bytes);
  if (!format) {
    return { ok: false, error: "Only MP4 and WebM videos are supported." };
  }

  return {
    ok: true,
    format,
    mimeType: FORMAT_MIME_TYPES[format],
    extension: FORMAT_EXTENSIONS[format],
  };
}

export type FetchedVideoValidation =
  | { ok: true; format: AllowedVideoFormat; mimeType: string; extension: string; sizeBytes: number }
  | { ok: false; error: string };

// The real server-side check for a client-direct-uploaded video: the
// server never received the file's bytes as part of an incoming request
// (that's the whole point of the direct-to-Blob upload), so it fetches a
// small byte range directly from the now-public Blob URL — the same
// mechanism a video player's scrubbing relies on — to (a) sniff the real
// magic bytes and (b) read the REAL total size from the response's
// Content-Range header, never trusting whatever size the browser's File
// object claimed. A file whose real bytes don't match an allowed format
// is rejected here even though it already passed the upload token's
// allowedContentTypes check — that check only constrains the DECLARED
// content type, not the real bytes (see CLAUDE.md "Video Media Library"
// for why both checks exist).
export async function fetchAndValidateUploadedVideo(url: string): Promise<FetchedVideoValidation> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Range: "bytes=0-511" } });
  } catch (error) {
    console.error("Fetching uploaded video for validation failed", { error });
    return { ok: false, error: "We couldn't verify the uploaded file. Please try again." };
  }

  if (!response.ok && response.status !== 206) {
    return { ok: false, error: "We couldn't verify the uploaded file. Please try again." };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const validation = validateVideoUpload(bytes);
  if (!validation.ok) {
    return validation;
  }

  // Content-Range on a satisfied range request looks like
  // "bytes 0-511/52428800" — the number after "/" is the real, full
  // object size as Blob storage itself reports it. Falls back to
  // Content-Length (a full, non-ranged response) only if the range
  // request wasn't honored for some reason.
  const contentRange = response.headers.get("content-range");
  const rangeMatch = contentRange?.match(/\/(\d+)$/);
  const sizeBytes = rangeMatch
    ? Number(rangeMatch[1])
    : Number(response.headers.get("content-length") ?? bytes.byteLength);

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "We couldn't determine the uploaded file's size. Please try again." };
  }

  return { ok: true, format: validation.format, mimeType: validation.mimeType, extension: validation.extension, sizeBytes };
}
