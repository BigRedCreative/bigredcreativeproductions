import "server-only";
import { slugify } from "@/data/products";
import { MAX_FILENAME_LENGTH } from "@/data/creative-studio";

// Phase 20C-2 — the ONE place a Creative-Studio-saved asset's owner-typed
// filename becomes a real, safe media_assets.filename value. Metadata
// only — this never touches storageKey/url, and the Blob object itself is
// never renamed or moved (see save-discard.ts's handleSaveToMediaLibrary).
//
// A generation's storage key always ends in one of exactly these three
// extensions — buildStorageKey() (src/server/media-storage.ts) is the ONLY
// place that ever generates one, and it only ever uses these three. The
// extension is ALWAYS derived from this server-known fact, never from
// owner input — an owner cannot forge a ".exe"/".html"/anything-else
// extension no matter what they type into the filename field.
export function extensionFromStorageKey(storageKey: string): "png" | "jpg" | "webp" {
  if (storageKey.endsWith(".png")) return "png";
  if (storageKey.endsWith(".jpg")) return "jpg";
  if (storageKey.endsWith(".webp")) return "webp";
  return "png";
}

export function mimeTypeFromExtension(extension: "png" | "jpg" | "webp"): string {
  if (extension === "jpg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "image/png";
}

// Reuses slugify() (src/data/products.ts) verbatim — its output alphabet
// is exactly [a-z0-9-], which makes path traversal (`../`, `/`, `\`, a
// null byte, a bare `.`) structurally impossible, not merely checked for:
// there is no character in the allowed set that could ever form one.
// Returns "" when the owner left the field blank OR typed something that
// slugifies to nothing (e.g. only punctuation) — the caller treats an
// empty result as "use the default filename," never a hard validation
// error, since a filename is a nice-to-have, not a required field.
export function sanitizeFilename(rawInput: string, storageKey: string): string {
  const extension = extensionFromStorageKey(storageKey);
  const base = slugify(rawInput).slice(0, MAX_FILENAME_LENGTH).replace(/-+$/, "");
  if (!base) return "";
  return `${base}.${extension}`;
}
