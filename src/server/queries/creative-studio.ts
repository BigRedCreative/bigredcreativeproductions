import "server-only";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aiGenerationJobs } from "@/db/schema";
import type {
  CreativeBrief,
  CreativeTaskPreset,
  CreativeContextSourceType,
  ImageGenerationProvider,
  ImageGenerationModel,
  ImageGenerationSize,
  ImageGenerationQuality,
  ImageGenerationStatus,
  ImageGenerationErrorCategory,
  ImageGenerationUsageMetadata,
} from "@/data/creative-studio";
import { MAX_VARIATIONS_PER_BRIEF, GENERATION_JOBS_PAGE_SIZE } from "@/data/creative-studio";

// The ONE place anything in the app reads an ai_generation_jobs row from
// Neon. Server-only, zero insert/update/delete calls — mirrors the exact
// read/write split every other src/server/queries/*.ts module in this
// codebase already establishes.

export type GenerationJob = {
  id: string;
  requestedByAdminUserId: string | null;
  taskPreset: CreativeTaskPreset;
  contextSourceType: CreativeContextSourceType | null;
  contextSourceId: string | null;
  brief: CreativeBrief;
  referenceMediaAssetIds: string[];
  provider: ImageGenerationProvider;
  model: ImageGenerationModel;
  requestedSize: ImageGenerationSize;
  requestedQuality: ImageGenerationQuality;
  status: ImageGenerationStatus;
  errorCategory: ImageGenerationErrorCategory | null;
  outputStorageKey: string | null;
  outputUrl: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
  outputSizeBytes: number | null;
  outputMediaAssetId: string | null;
  usageMetadata: ImageGenerationUsageMetadata | null;
  discardedAt: Date | null;
  createdAt: Date;
  savedAt: Date | null;
};

function mapRow(row: typeof aiGenerationJobs.$inferSelect): GenerationJob {
  return {
    id: row.id,
    requestedByAdminUserId: row.requestedByAdminUserId,
    taskPreset: row.taskPreset as CreativeTaskPreset,
    contextSourceType: row.contextSourceType as CreativeContextSourceType | null,
    contextSourceId: row.contextSourceId,
    brief: row.brief as CreativeBrief,
    referenceMediaAssetIds: row.referenceMediaAssetIds as string[],
    provider: row.provider as ImageGenerationProvider,
    model: row.model as ImageGenerationModel,
    requestedSize: row.requestedSize as ImageGenerationSize,
    requestedQuality: row.requestedQuality as ImageGenerationQuality,
    status: row.status as ImageGenerationStatus,
    errorCategory: row.errorCategory as ImageGenerationErrorCategory | null,
    outputStorageKey: row.outputStorageKey,
    outputUrl: row.outputUrl,
    outputWidth: row.outputWidth,
    outputHeight: row.outputHeight,
    outputSizeBytes: row.outputSizeBytes,
    outputMediaAssetId: row.outputMediaAssetId,
    usageMetadata: row.usageMetadata as ImageGenerationUsageMetadata | null,
    discardedAt: row.discardedAt,
    createdAt: row.createdAt,
    savedAt: row.savedAt,
  };
}

export async function getGenerationJobById(id: string): Promise<GenerationJob | undefined> {
  const db = getDb();
  const row = await db.query.aiGenerationJobs.findFirst({ where: eq(aiGenerationJobs.id, id) });
  return row ? mapRow(row) : undefined;
}

// Powers the daily generation cap — counts every ai_generation_jobs row
// (completed or failed; a failed request still cost a provider call in
// most cases) created since the start of the current UTC day. Mirrors
// src/server/queries/brain.ts's countBrainRequestsToday() exactly,
// including the "counts every admin combined, one shared daily counter"
// rule.
export async function countImageGenerationsToday(): Promise<number> {
  const db = getDb();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({ c: count() })
    .from(aiGenerationJobs)
    .where(gte(aiGenerationJobs.createdAt, startOfToday));
  return row.c;
}

// Powers the monthly image-spend warning — sums actualCostMicros for
// completed generations across the current calendar month, in exact
// integer microdollars. Read-only, informational only — never a shutoff,
// mirroring src/server/queries/brain.ts's getMonthlyCostMicrosSoFar()
// exactly, on this table's own separate counter.
export async function getMonthlyImageCostMicrosSoFar(): Promise<number> {
  const db = getDb();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ usageMetadata: aiGenerationJobs.usageMetadata })
    .from(aiGenerationJobs)
    .where(and(gte(aiGenerationJobs.createdAt, startOfMonth), eq(aiGenerationJobs.status, "completed")));

  return rows.reduce((sum, row) => {
    const usage = row.usageMetadata as ImageGenerationUsageMetadata | null;
    const micros = usage?.actualCostMicros ?? usage?.estimatedCostMicros ?? 0;
    return sum + micros;
  }, 0);
}

// Powers the "max MAX_VARIATIONS_PER_BRIEF variations per reviewed brief"
// server-side cap. There is no dedicated "brief session" column/table (no
// migration was approved this phase for one) — instead, a "variation" is
// detected as another generation, by the SAME admin, carrying a
// byte-identical (JSONB-equal, order/whitespace-insensitive) brief within
// a short recent window. Two truly independent generations sharing the
// exact same fully-specified brief (objective, subject, style,
// composition, required/avoid elements, aspect ratio, references, and
// task preset all identical) within the window is exactly what
// "requesting another variation of the same reviewed brief" means in
// practice — the freeform text fields make an accidental collision from
// an unrelated task vanishingly unlikely, and even if it happened, the
// only consequence is an early rejection, never an incorrect generation
// or a security issue.
const VARIATION_WINDOW_HOURS = 2;

export async function countRecentGenerationsForBrief(adminUserId: string, brief: CreativeBrief): Promise<number> {
  const db = getDb();
  const windowStart = new Date(Date.now() - VARIATION_WINDOW_HOURS * 60 * 60 * 1000);
  const briefJson = JSON.stringify(brief);

  const [row] = await db
    .select({ c: count() })
    .from(aiGenerationJobs)
    .where(
      and(
        eq(aiGenerationJobs.requestedByAdminUserId, adminUserId),
        gte(aiGenerationJobs.createdAt, windowStart),
        sql`${aiGenerationJobs.brief} = ${briefJson}::jsonb`,
      ),
    );
  return row.c;
}

export function hasReachedVariationCap(existingCount: number): boolean {
  return existingCount >= MAX_VARIATIONS_PER_BRIEF;
}

// Provenance reverse lookup for /admin/media/[id] — "was this asset
// generated in Creative Studio, and if so, from what/when/by which
// provider." A plain column-equality check (outputMediaAssetId is a
// scalar FK, not a JSONB array), mirroring
// src/server/queries/media.ts's findAssetsUsingAsPoster() exactly in
// shape. Deliberately returns only small, safe fields — never the brief,
// never the prompt, never a raw provider response.
export type GenerationProvenance = {
  jobId: string;
  taskPreset: CreativeTaskPreset;
  provider: ImageGenerationProvider;
  model: ImageGenerationModel;
  createdAt: Date;
};

export async function findGenerationByOutputMediaAssetId(mediaAssetId: string): Promise<GenerationProvenance | undefined> {
  const db = getDb();
  const row = await db.query.aiGenerationJobs.findFirst({
    where: eq(aiGenerationJobs.outputMediaAssetId, mediaAssetId),
    columns: { id: true, taskPreset: true, provider: true, model: true, createdAt: true },
  });
  if (!row) return undefined;
  return {
    jobId: row.id,
    taskPreset: row.taskPreset as CreativeTaskPreset,
    provider: row.provider as ImageGenerationProvider,
    model: row.model as ImageGenerationModel,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------
// Phase 20C-2 — Generation History. A plain, paginated, newest-first list
// — mirrors listMediaAssets()'s exact shape/pagination convention. Every
// field here already exists on ai_generation_jobs; no migration was
// needed to build this (see CLAUDE.md's Phase 20C-2 architecture report).
// ---------------------------------------------------------------------

export type GenerationJobListRow = {
  id: string;
  taskPreset: CreativeTaskPreset;
  provider: ImageGenerationProvider;
  model: ImageGenerationModel;
  requestedSize: ImageGenerationSize;
  requestedQuality: ImageGenerationQuality;
  status: ImageGenerationStatus;
  outputUrl: string | null;
  outputMediaAssetId: string | null;
  discardedAt: Date | null;
  createdAt: Date;
  actualCostMicros: number | null;
};

export type ListGenerationJobsResult = {
  rows: GenerationJobListRow[];
  totalCount: number;
  page: number;
  pageCount: number;
};

export async function listGenerationJobsForAdmin(page: number): Promise<ListGenerationJobsResult> {
  const db = getDb();
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * GENERATION_JOBS_PAGE_SIZE;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: aiGenerationJobs.id,
        taskPreset: aiGenerationJobs.taskPreset,
        provider: aiGenerationJobs.provider,
        model: aiGenerationJobs.model,
        requestedSize: aiGenerationJobs.requestedSize,
        requestedQuality: aiGenerationJobs.requestedQuality,
        status: aiGenerationJobs.status,
        outputUrl: aiGenerationJobs.outputUrl,
        outputMediaAssetId: aiGenerationJobs.outputMediaAssetId,
        discardedAt: aiGenerationJobs.discardedAt,
        createdAt: aiGenerationJobs.createdAt,
        usageMetadata: aiGenerationJobs.usageMetadata,
      })
      .from(aiGenerationJobs)
      .orderBy(desc(aiGenerationJobs.createdAt))
      .limit(GENERATION_JOBS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(aiGenerationJobs),
  ]);

  const totalCount = totalResult[0]?.value ?? 0;

  return {
    rows: rows.map((row) => {
      const usage = row.usageMetadata as ImageGenerationUsageMetadata | null;
      return {
        id: row.id,
        taskPreset: row.taskPreset as CreativeTaskPreset,
        provider: row.provider as ImageGenerationProvider,
        model: row.model as ImageGenerationModel,
        requestedSize: row.requestedSize as ImageGenerationSize,
        requestedQuality: row.requestedQuality as ImageGenerationQuality,
        status: row.status as ImageGenerationStatus,
        outputUrl: row.outputUrl,
        outputMediaAssetId: row.outputMediaAssetId,
        discardedAt: row.discardedAt,
        createdAt: row.createdAt,
        actualCostMicros: usage?.actualCostMicros ?? null,
      };
    }),
    totalCount,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(totalCount / GENERATION_JOBS_PAGE_SIZE)),
  };
}

// Powers the cost dashboard's "spend today" line — a one-line variant of
// getMonthlyImageCostMicrosSoFar() swapping the truncation unit, same
// exact integer-microdollar discipline, no new table/column.
export async function getTodayImageCostMicrosSoFar(): Promise<number> {
  const db = getDb();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ usageMetadata: aiGenerationJobs.usageMetadata })
    .from(aiGenerationJobs)
    .where(and(gte(aiGenerationJobs.createdAt, startOfToday), eq(aiGenerationJobs.status, "completed")));

  return rows.reduce((sum, row) => {
    const usage = row.usageMetadata as ImageGenerationUsageMetadata | null;
    const micros = usage?.actualCostMicros ?? usage?.estimatedCostMicros ?? 0;
    return sum + micros;
  }, 0);
}
