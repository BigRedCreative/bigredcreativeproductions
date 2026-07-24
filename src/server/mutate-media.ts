"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import { validateImageUpload, MAX_IMAGE_UPLOAD_BYTES } from "@/server/validate-media-upload";
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
