import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { aiGenerationJobs, mediaAssets } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import { getGenerationJobById } from "@/server/queries/creative-studio";
import { sanitizeFilename, extensionFromStorageKey, mimeTypeFromExtension } from "@/server/sanitize-filename";
import { sanitizeForStorage, truncateAtWordBoundary } from "@/server/brain/safe-summary";
import { MAX_SAVE_ALT_LENGTH, MAX_SAVE_CAPTION_LENGTH } from "@/data/creative-studio";

// Phase 20C-1/20C-2 — "Save to Media Library," "Discard," and "Restore,"
// the three explicit owner actions that manage an unsaved generation's
// review lifecycle. All kept free of any "use server"/requireAdminUser()/
// next/navigation dependency (unlike mutate-creative-studio.ts, the real
// Server Action boundary that calls these) so they're directly exercisable
// by the automated regression suite.

export type SaveToMediaResult = { errors: string[] } | { success: true; mediaAssetId: string };

// Phase 20C-2 — optional owner-authored overrides, reviewed just before
// Save. All three are sanitized/bounded here, server-side, regardless of
// what the client claims to have already validated. Blank/omitted fields
// fall back to today's existing defaults (auto-generated filename, the
// brief's own objective as alt, no caption) — none of the three is
// required.
export type SaveMetadataInput = {
  filename?: string;
  alt?: string;
  caption?: string;
};

export async function handleSaveToMediaLibrary(
  adminUserId: string,
  jobId: string,
  metadata: SaveMetadataInput = {},
): Promise<SaveToMediaResult> {
  const job = await getGenerationJobById(jobId);
  if (!job) {
    return { errors: ["That generation could not be found."] };
  }
  if (job.status !== "completed" || !job.outputUrl || !job.outputStorageKey) {
    return { errors: ["This generation did not complete successfully and cannot be saved."] };
  }
  if (job.outputMediaAssetId) {
    return { errors: ["This generation has already been saved to your Media Library."] };
  }

  const db = getDb();
  let mediaAssetId = "";

  try {
    await db.transaction(async (tx) => {
      // Re-check freshness inside the transaction — a double-click or a
      // race between two admins saving the same job must never create two
      // media_assets rows from one generation.
      const [freshRow] = await tx.select().from(aiGenerationJobs).where(eq(aiGenerationJobs.id, jobId)).limit(1);
      if (!freshRow || freshRow.status !== "completed" || !freshRow.outputUrl || !freshRow.outputStorageKey) {
        throw new Error("NOT_SAVABLE");
      }
      if (freshRow.outputMediaAssetId) {
        throw new Error("ALREADY_SAVED");
      }

      const newAssetId = `media_${crypto.randomUUID()}`;
      const extension = extensionFromStorageKey(freshRow.outputStorageKey);
      const mimeType = mimeTypeFromExtension(extension);

      // The extension is ALWAYS the server-derived one above — a filename
      // typed by the owner can only ever influence the base name, never
      // the extension, never the storageKey, never the url. See
      // sanitize-filename.ts's own comment on why path traversal and
      // extension-spoofing are structurally impossible here, not just
      // checked for.
      const requestedFilename = metadata.filename ? sanitizeFilename(metadata.filename, freshRow.outputStorageKey) : "";
      const filename = requestedFilename || `ai-generated-${newAssetId}`;

      const requestedAlt = metadata.alt !== undefined ? truncateAtWordBoundary(sanitizeForStorage(metadata.alt), MAX_SAVE_ALT_LENGTH) : "";
      // A helpful default from the reviewed brief's own objective (already
      // sanitized/bounded at brief-build time) when the owner didn't type
      // their own alt text.
      const alt = requestedAlt || job.brief.objective;

      const requestedCaption = metadata.caption ? truncateAtWordBoundary(sanitizeForStorage(metadata.caption), MAX_SAVE_CAPTION_LENGTH) : "";
      const caption = requestedCaption || null;

      // Reuses the ALREADY-uploaded, already byte-validated Blob object —
      // no re-generation, no duplicate upload, no rename/move of the Blob
      // itself. This is the same permanent storageKey/url the generation
      // step wrote; Save only ever adds a media_assets row pointing at it,
      // with filename/alt/caption as pure display metadata.
      await tx.insert(mediaAssets).values({
        id: newAssetId,
        storageProvider: "vercel-blob",
        storageKey: freshRow.outputStorageKey,
        url: freshRow.outputUrl,
        type: "image",
        mimeType,
        filename,
        originalFilename: filename,
        width: freshRow.outputWidth,
        height: freshRow.outputHeight,
        sizeBytes: freshRow.outputSizeBytes ?? 0,
        alt,
        caption,
        status: "active",
        createdByAdminUserId: adminUserId,
      });

      await tx
        .update(aiGenerationJobs)
        .set({ outputMediaAssetId: newAssetId, savedAt: new Date() })
        .where(eq(aiGenerationJobs.id, jobId));

      await recordAuditEvent(tx, {
        adminUserId,
        action: "media.uploaded",
        entityType: "media_asset",
        entityId: newAssetId,
        metadata: { source: "creative_studio", jobId },
      });
      await recordAuditEvent(tx, {
        adminUserId,
        action: "creative.saved_to_media",
        entityType: "ai_generation_job",
        entityId: jobId,
        metadata: { mediaAssetId: newAssetId },
      });

      mediaAssetId = newAssetId;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SAVED") {
      return { errors: ["This generation has already been saved to your Media Library."] };
    }
    if (error instanceof Error && error.message === "NOT_SAVABLE") {
      return { errors: ["This generation did not complete successfully and cannot be saved."] };
    }
    return { errors: ["This generation couldn't be saved right now. Please try again."] };
  }

  return { success: true, mediaAssetId };
}

export type DiscardResult = { errors: string[] } | { success: true };

export async function handleDiscardGeneration(adminUserId: string, jobId: string): Promise<DiscardResult> {
  const job = await getGenerationJobById(jobId);
  if (!job) {
    return { errors: ["That generation could not be found."] };
  }
  if (job.outputMediaAssetId) {
    return { errors: ["This generation has already been saved to your Media Library and cannot be discarded."] };
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(aiGenerationJobs).set({ discardedAt: new Date() }).where(eq(aiGenerationJobs.id, jobId));
    await recordAuditEvent(tx, {
      adminUserId,
      action: "creative.discarded",
      entityType: "ai_generation_job",
      entityId: jobId,
      metadata: {},
    });
  });

  return { success: true };
}

export type RestoreResult = { errors: string[] } | { success: true };

// Phase 20C-2 — explicitly closes the gap Phase 20C-1 documented up front:
// "if a discarded generation is later recoverable, recovery must be
// explicit." Only ever moves discardedAt back to null — never touches
// outputStorageKey/outputUrl (nothing was ever deleted, so there is
// nothing to restore at the storage layer) and never calls a provider.
// Structurally mirrors Discard's own guard in reverse: a SAVED job can
// never be "restored" (the concept doesn't apply — it isn't discarded),
// and a job that was never discarded in the first place is rejected too,
// so this can't be used as a backdoor status-touch on an active job.
export async function handleRestoreGeneration(adminUserId: string, jobId: string): Promise<RestoreResult> {
  const job = await getGenerationJobById(jobId);
  if (!job) {
    return { errors: ["That generation could not be found."] };
  }
  if (job.outputMediaAssetId) {
    return { errors: ["This generation has already been saved to your Media Library."] };
  }
  if (!job.discardedAt) {
    return { errors: ["This generation was not discarded."] };
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(aiGenerationJobs).set({ discardedAt: null }).where(eq(aiGenerationJobs.id, jobId));
    await recordAuditEvent(tx, {
      adminUserId,
      action: "creative.restored",
      entityType: "ai_generation_job",
      entityId: jobId,
      metadata: {},
    });
  });

  return { success: true };
}
