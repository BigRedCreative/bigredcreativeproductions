import "server-only";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { brainRequests, customers, orders, portfolioProjectVersions, serviceVersions, mediaAssets } from "@/db/schema";
import type { BrainRelatedEntityType } from "@/data/brain";

// Server-only, read-only — zero insert/update/delete calls, never imported
// by a client component, mirroring every other src/server/queries/*.ts
// module in this codebase.

export type BrainRequestHistoryRow = {
  id: string;
  requestType: string;
  requestSource: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
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
      requestSource: brainRequests.requestSource,
      relatedEntityType: brainRequests.relatedEntityType,
      relatedEntityId: brainRequests.relatedEntityId,
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
// Counts EVERY requestSource combined — the dashboard and all five entity
// entry points share one daily counter, never a separate cap per source.
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

// --- Phase 20B — Recent Brain Activity entity-label resolution -----------

export type EntityLabelRef = { label: string; href: string };

// Resolves a small batch of (type, id) pairs found in the recent activity
// list into human-readable labels + admin links, at READ TIME — nothing
// about a customer/order/project/service/media name is ever persisted
// onto brain_requests just to make this list prettier (per the approved
// Phase 20B decision). Groups by type so each type is one batched query
// (inArray), not N individual lookups — cheap at this business's scale
// (max 10 recent rows). A pair with no match (the entity was somehow
// removed) is simply absent from the returned map; the caller renders a
// safe fallback.
export async function resolveEntityLabels(
  refs: Array<{ type: BrainRelatedEntityType; id: string }>,
): Promise<Map<string, EntityLabelRef>> {
  const result = new Map<string, EntityLabelRef>();
  if (refs.length === 0) return result;

  const db = getDb();
  const idsByType = new Map<BrainRelatedEntityType, string[]>();
  for (const ref of refs) {
    const list = idsByType.get(ref.type) ?? [];
    list.push(ref.id);
    idsByType.set(ref.type, list);
  }

  const customerIds = idsByType.get("customer");
  if (customerIds && customerIds.length > 0) {
    const rows = await db
      .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName })
      .from(customers)
      .where(inArray(customers.id, customerIds));
    for (const row of rows) {
      result.set(`customer:${row.id}`, { label: `${row.firstName} ${row.lastName}`.trim(), href: `/admin/customers/${row.id}` });
    }
  }

  const orderIds = idsByType.get("order");
  if (orderIds && orderIds.length > 0) {
    const rows = await db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders).where(inArray(orders.id, orderIds));
    for (const row of rows) {
      result.set(`order:${row.id}`, { label: row.orderNumber, href: `/admin/orders/${row.id}` });
    }
  }

  const portfolioIds = idsByType.get("portfolio_project");
  if (portfolioIds && portfolioIds.length > 0) {
    const rows = await db
      .select({ projectId: portfolioProjectVersions.projectId, title: portfolioProjectVersions.title })
      .from(portfolioProjectVersions)
      .where(and(inArray(portfolioProjectVersions.projectId, portfolioIds), eq(portfolioProjectVersions.versionType, "draft")));
    for (const row of rows) {
      result.set(`portfolio_project:${row.projectId}`, { label: row.title, href: `/admin/portfolio/${row.projectId}` });
    }
  }

  const serviceIds = idsByType.get("service");
  if (serviceIds && serviceIds.length > 0) {
    const rows = await db
      .select({ serviceId: serviceVersions.serviceId, title: serviceVersions.title })
      .from(serviceVersions)
      .where(and(inArray(serviceVersions.serviceId, serviceIds), eq(serviceVersions.versionType, "draft")));
    for (const row of rows) {
      result.set(`service:${row.serviceId}`, { label: row.title, href: `/admin/services/${row.serviceId}` });
    }
  }

  const mediaIds = idsByType.get("media_asset");
  if (mediaIds && mediaIds.length > 0) {
    const rows = await db.select({ id: mediaAssets.id, filename: mediaAssets.filename }).from(mediaAssets).where(inArray(mediaAssets.id, mediaIds));
    for (const row of rows) {
      result.set(`media_asset:${row.id}`, { label: row.filename, href: `/admin/media/${row.id}` });
    }
  }

  return result;
}
