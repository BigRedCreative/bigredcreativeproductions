import "server-only";
import { imageSize } from "image-size";

// The one place an uploaded file's actual bytes get inspected before
// anything is trusted about it. Never relies on the browser's declared
// filename or Content-Type — every check here reads the real bytes.
//
// Allowlist-based on purpose: only PNG/JPEG/WebP are ever accepted, per
// Phase 15 approval. This rejects executables/scripts/HTML/SVG by
// construction — there's no denylist to keep complete, because nothing
// outside the allowlist can ever pass.

export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB, per Phase 15 approval

export type AllowedImageFormat = "png" | "jpeg" | "webp";

const FORMAT_MIME_TYPES: Record<AllowedImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const FORMAT_EXTENSIONS: Record<AllowedImageFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

// Magic-byte signatures — real format identity, independent of whatever
// filename/MIME type the browser claims.
function sniffImageFormat(bytes: Uint8Array): AllowedImageFormat | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 // "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export type ImageValidationResult =
  | {
      ok: true;
      format: AllowedImageFormat;
      mimeType: string;
      extension: string;
      width: number | undefined;
      height: number | undefined;
    }
  | { ok: false; error: string };

// Validates real bytes already read into memory — the caller (the upload
// Server Action) is responsible for enforcing the size cap on the actual
// read byte count before this is ever called with the full buffer.
export function validateImageUpload(bytes: Uint8Array): ImageValidationResult {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "The uploaded file is empty." };
  }
  if (bytes.byteLength > MAX_IMAGE_UPLOAD_BYTES) {
    return { ok: false, error: `Images must be ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.` };
  }

  const format = sniffImageFormat(bytes);
  if (!format) {
    return { ok: false, error: "Only PNG, JPEG, and WebP images are supported." };
  }

  // Cross-check against image-size's own independent format detection —
  // defense in depth, not the primary check (the magic-byte sniff above
  // already is). Dimension extraction can throw on a truncated/corrupt
  // file; that's treated as a validation failure, not a crash.
  let width: number | undefined;
  let height: number | undefined;
  try {
    const size = imageSize(bytes);
    const detectedType = size.type === "jpg" ? "jpeg" : size.type;
    if (detectedType !== format) {
      return { ok: false, error: "The file's contents don't match a supported image format." };
    }
    width = size.width;
    height = size.height;
  } catch {
    return { ok: false, error: "Couldn't read this file as a valid image." };
  }

  return {
    ok: true,
    format,
    mimeType: FORMAT_MIME_TYPES[format],
    extension: FORMAT_EXTENSIONS[format],
    width,
    height,
  };
}
