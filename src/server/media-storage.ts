import "server-only";
import { put, del } from "@vercel/blob";
import type { AllowedImageFormat } from "@/server/validate-media-upload";

// The one place this app talks to Vercel Blob. Storage keys are always
// server-generated (crypto.randomUUID(), never the client's filename) and
// permanently unique — "replace" never overwrites a key in place, it
// uploads a new one, so caching is trivially safe (see CLAUDE.md "Media
// Library" — a URL only ever points at one immutable set of bytes for its
// whole life). Authenticated via Vercel's OIDC federation (VERCEL_OIDC_TOKEN
// + BLOB_STORE_ID) — no BLOB_READ_WRITE_TOKEN is used or required.

export function buildStorageKey(format: AllowedImageFormat): string {
  const extension = format === "jpeg" ? "jpg" : format;
  return `media/${crypto.randomUUID()}.${extension}`;
}

export async function uploadImageBlob(
  storageKey: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ url: string }> {
  const blob = await put(storageKey, Buffer.from(bytes), {
    access: "public",
    addRandomSuffix: false,
    contentType: mimeType,
  });
  return { url: blob.url };
}

// Deliberately NOT called automatically when a media asset is replaced —
// per Phase 15 approval, the previous blob is left in place (recoverable)
// rather than destroyed immediately. This function exists for the future
// storage-maintenance cleanup pass documented in CLAUDE.md, and for
// deleting a blob that was just uploaded moments ago if a later step in
// the SAME request fails (e.g. the database write after a successful
// upload) — never used to delete a blob still referenced by any row.
export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}
