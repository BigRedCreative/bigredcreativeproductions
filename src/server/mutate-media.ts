"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import { validateImageUpload, MAX_IMAGE_UPLOAD_BYTES } from "@/server/validate-media-upload";
import { MAX_VIDEO_UPLOAD_BYTES, fetchAndValidateUploadedVideo } from "@/server/validate-video-upload";
import { buildStorageKey, uploadImageBlob, deleteBlob } from "@/server/media-storage";
import { getMediaAssetById, findProductsReferencingMediaAsset } from "@/server/queries/media";

// Every media_assets write lives here. Every export independently calls
// requireAdminUser() as its first line — Server Actions aren't covered by
// the protected admin layout's own check, per the standing rule
// established in "Admin foundation" and followed by every mutation file
// since. Each database write is wrapped in a db.transaction() alongside
// its recordAuditEvent(tx, ...) call.

export type MediaFormState = { errors: string[] } | { success: true } | null;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function maxSizeErrorMessage(): string {
  return `Images must be ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`;
}

export async function uploadMediaAction(
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: ["Choose an image file to upload."] };
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return { errors: [maxSizeErrorMessage()] };
  }

  const alt = getString(formData, "alt");
  const caption = getString(formData, "caption");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateImageUpload(bytes);
  if (!validation.ok) {
    return { errors: [validation.error] };
  }

  const storageKey = buildStorageKey(validation.format);
  let url: string;
  try {
    const uploaded = await uploadImageBlob(storageKey, bytes, validation.mimeType);
    url = uploaded.url;
  } catch (error) {
    console.error("Media upload to storage failed", { error });
    return { errors: ["We couldn't upload this file. Please try again."] };
  }

  const id = `media_${crypto.randomUUID()}`;
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        id,
        storageProvider: "vercel-blob",
        storageKey,
        url,
        type: "image",
        mimeType: validation.mimeType,
        filename: file.name || `${id}.${validation.extension}`,
        originalFilename: file.name || "unknown",
        width: validation.width ?? null,
        height: validation.height ?? null,
        sizeBytes: bytes.byteLength,
        alt,
        caption: caption || null,
        status: "active",
        createdByAdminUserId: adminUser.id,
      });
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "media.uploaded",
        entityType: "media",
        entityId: id,
        metadata: { filename: file.name || undefined, mimeType: validation.mimeType, sizeBytes: bytes.byteLength },
      });
    });
  } catch (error) {
    // The blob was just written moments ago under a brand-new key nothing
    // could possibly reference yet — safe to roll back here, unlike the
    // "leave the old blob" rule for a REPLACE of an existing asset below.
    try {
      await deleteBlob(url);
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned blob after failed media insert", { cleanupError });
    }
    console.error("Media asset insert failed", { error });
    return { errors: ["We couldn't save this upload. Please try again."] };
  }

  revalidatePath("/admin/media");
  redirect(`/admin/media/${id}`);
}

export async function updateMediaAssetAction(
  id: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const alt = getString(formData, "alt");
  const caption = getString(formData, "caption");

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(mediaAssets)
        .set({ alt, caption: caption || null, updatedAt: new Date() })
        .where(eq(mediaAssets.id, id));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "media.updated",
        entityType: "media",
        entityId: id,
        metadata: { fields: ["alt", "caption"] },
      });
    });
  } catch (error) {
    console.error("Media asset update failed", { id, error });
    return { errors: ["We couldn't save these changes. Please try again."] };
  }

  revalidatePath(`/admin/media/${id}`);
  revalidatePath("/admin/media");
  return { success: true };
}

// Bound to (id, "archived") or (id, "active") from the admin UI's two
// buttons. Only the transition TO archived gets its own audit action
// (media.archived, per the approved event list) — going back to active is
// logged as a generic media.updated, matching "no media.unarchived event"
// exactly as approved.
export async function setMediaAssetStatusAction(
  id: string,
  status: "active" | "archived",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: MediaFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.update(mediaAssets).set({ status, updatedAt: new Date() }).where(eq(mediaAssets.id, id));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: status === "archived" ? "media.archived" : "media.updated",
        entityType: "media",
        entityId: id,
        metadata: { to: status },
      });
    });
  } catch (error) {
    console.error("Media asset status change failed", { id, error });
    return { errors: ["We couldn't update this asset. Please try again."] };
  }

  revalidatePath(`/admin/media/${id}`);
  revalidatePath("/admin/media");
  return { success: true };
}

// Preserves the permanent media_assets.id; uploads the replacement under a
// brand-new immutable storage key; updates url/storageKey/dimensions/size
// to point at it; revalidates every page a usage scan finds currently
// referencing this asset. Per Phase 15 approval (favoring recoverability
// over immediate cleanup), the PREVIOUS blob is deliberately left in
// place — not deleted — see CLAUDE.md "Media Library" for the documented
// future storage-maintenance task this defers.
export async function replaceMediaAssetAction(
  id: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const existing = await getMediaAssetById(id);
  if (!existing) {
    return { errors: ["This asset no longer exists."] };
  }
  // Never allow a video asset to be silently replaced through the image
  // path — the image validator would reject real video bytes anyway (its
  // magic-byte sniff only recognizes PNG/JPEG/WebP), but this explicit
  // guard makes the rule readable rather than relying on that as an
  // implicit side effect. Video replacement has its own dedicated action
  // (confirmVideoReplaceAction) since videos need the client-direct-
  // upload path, not this Server Action's body-relay.
  if (existing.type !== "image") {
    return { errors: ["This asset is a video — use the video replace option instead."] };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: ["Choose a replacement image file."] };
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return { errors: [maxSizeErrorMessage()] };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateImageUpload(bytes);
  if (!validation.ok) {
    return { errors: [validation.error] };
  }

  const newStorageKey = buildStorageKey(validation.format);
  let newUrl: string;
  try {
    const uploaded = await uploadImageBlob(newStorageKey, bytes, validation.mimeType);
    newUrl = uploaded.url;
  } catch (error) {
    console.error("Media replace upload failed", { id, error });
    return { errors: ["We couldn't upload the replacement file. Please try again."] };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(mediaAssets)
        .set({
          storageKey: newStorageKey,
          url: newUrl,
          mimeType: validation.mimeType,
          filename: file.name || existing.filename,
          originalFilename: file.name || existing.originalFilename,
          width: validation.width ?? null,
          height: validation.height ?? null,
          sizeBytes: bytes.byteLength,
          updatedAt: new Date(),
        })
        .where(eq(mediaAssets.id, id));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "media.updated",
        entityType: "media",
        entityId: id,
        metadata: { replaced: true, previousStorageKey: existing.storageKey },
      });
    });
  } catch (error) {
    try {
      await deleteBlob(newUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned replacement blob after failed update", { cleanupError });
    }
    console.error("Media asset replace failed", { id, error });
    return { errors: ["We couldn't save the replacement. Please try again."] };
  }

  const usageRefs = await findProductsReferencingMediaAsset(id);
  revalidatePath("/admin/media");
  revalidatePath(`/admin/media/${id}`);
  if (usageRefs.length > 0) {
    revalidatePath("/store");
    for (const ref of usageRefs) {
      revalidatePath(`/store/${ref.productSlug}`);
    }
  }

  return { success: true };
}

function maxVideoSizeErrorMessage(): string {
  return `Videos must be ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`;
}

// Called by VideoUploadForm.tsx AFTER the browser has already uploaded
// the file directly to Vercel Blob via @vercel/blob/client's upload()
// (see /api/media/video-upload-token/route.ts for the token that
// authorized that upload). This action never receives the video's bytes
// in its own request body — only the resulting blob URL/pathname and the
// admin-entered alt/caption text — which is exactly why video doesn't
// need next.config.ts's Server Action bodySizeLimit raised. The real
// content validation happens here, server-side, by fetching a small byte
// range back from the blob URL: an invalid file is deleted from storage
// and NEVER gets a media_assets row, matching "invalid uploads must
// never become active Media Library records."
export async function confirmVideoUploadAction(
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const blobUrl = getString(formData, "blobUrl");
  const blobPathname = getString(formData, "blobPathname");
  const originalFilename = getString(formData, "originalFilename");
  const alt = getString(formData, "alt");
  const caption = getString(formData, "caption");

  if (!blobUrl || !blobPathname) {
    return { errors: ["Upload didn't complete. Please try again."] };
  }

  const validation = await fetchAndValidateUploadedVideo(blobUrl);
  if (!validation.ok) {
    try {
      await deleteBlob(blobUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up invalid video upload", { cleanupError });
    }
    return { errors: [validation.error] };
  }
  if (validation.sizeBytes > MAX_VIDEO_UPLOAD_BYTES) {
    try {
      await deleteBlob(blobUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up oversized video upload", { cleanupError });
    }
    return { errors: [maxVideoSizeErrorMessage()] };
  }

  const id = `media_${crypto.randomUUID()}`;
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        id,
        storageProvider: "vercel-blob",
        storageKey: blobPathname,
        url: blobUrl,
        type: "video",
        mimeType: validation.mimeType,
        filename: originalFilename || `${id}.${validation.extension}`,
        originalFilename: originalFilename || "unknown",
        width: null,
        height: null,
        sizeBytes: validation.sizeBytes,
        alt,
        caption: caption || null,
        status: "active",
        createdByAdminUserId: adminUser.id,
      });
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "media.uploaded",
        entityType: "media",
        entityId: id,
        metadata: { filename: originalFilename || undefined, mimeType: validation.mimeType, sizeBytes: validation.sizeBytes },
      });
    });
  } catch (error) {
    try {
      await deleteBlob(blobUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned blob after failed video insert", { cleanupError });
    }
    console.error("Video media asset insert failed", { error });
    return { errors: ["We couldn't save this upload. Please try again."] };
  }

  revalidatePath("/admin/media");
  redirect(`/admin/media/${id}`);
}

// Video replacement's server-side confirm step — direct mirror of
// confirmVideoUploadAction's validate-then-write logic, but UPDATES the
// existing row instead of inserting one, preserving the permanent
// media_assets.id (and its posterMediaAssetId, untouched here) exactly
// like the image replace path already does. Only a video can replace a
// video — never silently accepts a replacement for a non-video asset.
export async function confirmVideoReplaceAction(
  id: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const existing = await getMediaAssetById(id);
  if (!existing) {
    return { errors: ["This asset no longer exists."] };
  }
  if (existing.type !== "video") {
    return { errors: ["This asset is an image — use the image replace option instead."] };
  }

  const blobUrl = getString(formData, "blobUrl");
  const blobPathname = getString(formData, "blobPathname");
  const originalFilename = getString(formData, "originalFilename");

  if (!blobUrl || !blobPathname) {
    return { errors: ["Upload didn't complete. Please try again."] };
  }

  const validation = await fetchAndValidateUploadedVideo(blobUrl);
  if (!validation.ok) {
    try {
      await deleteBlob(blobUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up invalid video replacement", { cleanupError });
    }
    return { errors: [validation.error] };
  }
  if (validation.sizeBytes > MAX_VIDEO_UPLOAD_BYTES) {
    try {
      await deleteBlob(blobUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up oversized video replacement", { cleanupError });
    }
    return { errors: [maxVideoSizeErrorMessage()] };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(mediaAssets)
        .set({
          storageKey: blobPathname,
          url: blobUrl,
          mimeType: validation.mimeType,
          filename: originalFilename || existing.filename,
          originalFilename: originalFilename || existing.originalFilename,
          width: null,
          height: null,
          sizeBytes: validation.sizeBytes,
          updatedAt: new Date(),
        })
        .where(eq(mediaAssets.id, id));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "media.updated",
        entityType: "media",
        entityId: id,
        metadata: { replaced: true, previousStorageKey: existing.storageKey },
      });
    });
  } catch (error) {
    try {
      await deleteBlob(blobUrl);
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned replacement blob after failed video update", { cleanupError });
    }
    console.error("Video media asset replace failed", { id, error });
    return { errors: ["We couldn't save the replacement. Please try again."] };
  }

  revalidatePath("/admin/media");
  revalidatePath(`/admin/media/${id}`);
  return { success: true };
}

// Sets or clears a video asset's poster (media_assets.posterMediaAssetId).
// A poster is optional; when provided, it must reference a currently
// ACTIVE, IMAGE-type asset — both checked fresh inside the transaction
// (never trusting that the picker UI's own filtering was the only gate),
// so a stale page, a race with someone else archiving the image, or a
// hand-crafted request are all caught the same way. Reuses the existing
// media.updated audit action rather than inventing a video-only one, with
// metadata limited to which field changed — no filenames, no URLs, no
// asset ids.
export async function setMediaAssetPosterAction(
  id: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const adminUser = await requireAdminUser();

  const posterMediaAssetId = getString(formData, "posterMediaAssetId") || null;

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const video = await tx.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
      if (!video) {
        throw new Error("VIDEO_NOT_FOUND");
      }
      if (video.type !== "video") {
        throw new Error("NOT_A_VIDEO");
      }

      if (posterMediaAssetId) {
        const poster = await tx.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, posterMediaAssetId) });
        if (!poster) {
          throw new Error("POSTER_NOT_FOUND");
        }
        if (poster.type !== "image") {
          throw new Error("POSTER_NOT_IMAGE");
        }
        if (poster.status !== "active") {
          throw new Error("POSTER_NOT_ACTIVE");
        }
      }

      await tx.update(mediaAssets).set({ posterMediaAssetId, updatedAt: new Date() }).where(eq(mediaAssets.id, id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "media.updated",
        entityType: "media",
        entityId: id,
        metadata: { fields: ["posterMediaAssetId"] },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VIDEO_NOT_FOUND") {
      return { errors: ["This asset no longer exists."] };
    }
    if (error instanceof Error && error.message === "NOT_A_VIDEO") {
      return { errors: ["Only video assets can have a poster."] };
    }
    if (error instanceof Error && error.message === "POSTER_NOT_FOUND") {
      return { errors: ["That image no longer exists."] };
    }
    if (error instanceof Error && error.message === "POSTER_NOT_IMAGE") {
      return { errors: ["A poster must be an image, not a video."] };
    }
    if (error instanceof Error && error.message === "POSTER_NOT_ACTIVE") {
      return { errors: ["Only active images can be selected as a poster."] };
    }
    console.error("Media poster update failed", { id, error });
    return { errors: ["We couldn't update the poster. Please try again."] };
  }

  revalidatePath(`/admin/media/${id}`);
  revalidatePath("/admin/media");
  return { success: true };
}
