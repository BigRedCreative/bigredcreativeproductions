import "server-only";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { brainRequests } from "@/db/schema";

// Server-only, read-only — zero insert/update/delete calls, never imported
// by a client component, mirroring every other src/server/queries/*.ts
// module in this codebase.

export type BrainRequestHistoryRow = {
  id: string;
  requestType: string;
  provider: string;
  model: string;
  status: string;
  responseSummary: string | null;
  errorCategory: string | null;
  usageMetadata: { inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; estimatedCostMicros?: number; actualCostMicros?: number } | null;
  createdAt: Date;
};

const RECENT_ACTIVITY_LIMIT = 10;

export async function getRecentBrainActivity(): Promise<BrainRequestHistoryRow[]> {
  const db = getDb();
  return db
    .select({
      id: brainRequests.id,
      requestType: brainRequests.requestType,
      provider: brainRequests.provider,
      model: brainRequests.model,
      status: brainRequests.status,
      responseSummary: brainRequests.responseSummary,
      errorCategory: brainRequests.errorCategory,
      usageMetadata: brainRequests.usageMetadata,
      createdAt: brainRequests.createdAt,
    })
    .from(brainRequests)
    .orderBy(desc(brainRequests.createdAt))
    .limit(RECENT_ACTIVITY_LIMIT);
}

// Powers the daily request cap (handle-request.ts) — counts every request
// (completed or failed; a failed request still cost a provider call in
// most cases) made since the start of the current UTC day. A plain COUNT
// query is sufficient at this business's real scale — no counter/cache
// infrastructure needed, matching the same judgment call already made for
// admin search (ILIKE, not full-text search) elsewhere in this codebase.
export async function countBrainRequestsToday(): Promise<number> {
  const db = getDb();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({ c: count() })
    .from(brainRequests)
    .where(gte(brainRequests.createdAt, startOfToday));
  return row.c;
}

// Powers the monthly cost-warning threshold — sums actualCostMicros (falling
// back to estimatedCostMicros for a row that somehow lacks it, though every
// real success path always writes actualCostMicros) across the current
// calendar month, in exact integer microdollars — never rounded per-request
// cents, so many small sub-cent requests still sum to an accurate total.
// Read-only, informational only — never a shutoff (see CLAUDE.md's Phase 20
// cost-controls approval: the $20 threshold is a WARNING, not a block,
// until explicitly approved otherwise).
export async function getMonthlyCostMicrosSoFar(): Promise<number> {
  const db = getDb();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ usageMetadata: brainRequests.usageMetadata })
    .from(brainRequests)
    .where(and(gte(brainRequests.createdAt, startOfMonth), eq(brainRequests.status, "completed")));

  return rows.reduce((sum, row) => {
    const micros = row.usageMetadata?.actualCostMicros ?? row.usageMetadata?.estimatedCostMicros ?? 0;
    return sum + micros;
  }, 0);
}
