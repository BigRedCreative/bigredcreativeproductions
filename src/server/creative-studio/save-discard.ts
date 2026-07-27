import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { aiGenerationJobs, mediaAssets } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import { getGenerationJobById } from "@/server/queries/creative-studio";

// Phase 20C-1 — "Save to Media Library" and "Discard," the two explicit
// owner actions that end an unsaved generation's review. Both kept free of
// any "use server"/requireAdminUser()/next/navigation dependency (unlike
// mutate-creative-studio.ts, the real Server Action boundary that calls
// these) so they're directly exercisable by the automated regression
// suite.

export type SaveToMediaResult = { errors: string[] } | { success: true; mediaAssetId: string };

// A generation's storage key always ends in one of exactly these three
// extensions — buildStorageKey() (src/server/media-storage.ts) is the ONLY
// place that ever generates one, and it only ever uses these three. No new
// column was added to store mime type separately; deriving it from the
// key we ourselves generated is exact and avoids a schema change for a
// fact we already know.
function mimeTypeFromStorageKey(storageKey: string): string {
  if (storageKey.endsWith(".png")) return "image/png";
  if (storageKey.endsWith(".jpg")) return "image/jpeg";
  if (storageKey.endsWith(".webp")) return "image/webp";
  return "image/png";
}

export async function handleSaveToMediaLibrary(adminUserId: string, jobId: string): Promise<SaveToMediaResult> {
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
      const mimeType = mimeTypeFromStorageKey(freshRow.outputStorageKey);

      // Reuses the ALREADY-uploaded, already byte-validated Blob object —
      // no re-generation, no duplicate upload. This is the same permanent
      // storageKey/url the generation step wrote; Save only ever adds a
      // media_assets row pointing at it, exactly as approved.
      await tx.insert(mediaAssets).values({
        id: newAssetId,
        storageProvider: "vercel-blob",
        storageKey: freshRow.outputStorageKey,
        url: freshRow.outputUrl,
        type: "image",
        mimeType,
        filename: `ai-generated-${newAssetId}`,
        originalFilename: `ai-generated-${newAssetId}`,
        width: freshRow.outputWidth,
        height: freshRow.outputHeight,
        sizeBytes: freshRow.outputSizeBytes ?? 0,
        // A helpful starting point from the reviewed brief's own
        // objective (already sanitized/bounded at brief-build time) — the
        // owner can edit it normally afterward via the existing
        // MediaEditForm, exactly like any other asset.
        alt: job.brief.objective,
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
