import "server-only";
import { auditLog } from "@/db/schema";
import type { getDb } from "@/db";

type Database = ReturnType<typeof getDb>;
// Accepts either a live db.transaction() callback's `tx` or the plain
// db client — same shape either way, since Drizzle's transaction object
// supports the same .insert() call the top-level client does.
type Executor = Pick<Database, "insert">;

export type AuditEventInput = {
  // Phase 21C-1 — nullable: every event before this phase originated from
  // an authenticated admin action, so this was always a real id. The
  // checkout-originated order.created event (src/server/create-order.ts)
  // is the first genuinely admin-less event this codebase writes — a real
  // customer, unauthenticated, triggered it — so `null` here honestly
  // records "no admin was involved" rather than requiring a fake id.
  // audit_log.admin_user_id was already a nullable column (ON DELETE SET
  // NULL) before this change; this only widens the TS type to match what
  // the schema already allowed.
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  // Small, structured, non-sensitive context only — e.g. { slug, title }
  // or { from: "draft", to: "published" }. Never a full entity payload,
  // never secrets, never customer/order PII. See src/db/schema.ts's
  // auditLog comment for the same rule.
  metadata?: Record<string, unknown>;
};

// The one place an audit_log row gets written. Pass the `tx` from inside
// a db.transaction() call (see src/server/mutate-product.ts) so the audit
// event and the mutation it describes commit or roll back together —
// never call this outside a transaction for anything that also writes
// other tables.
export async function recordAuditEvent(executor: Executor, event: AuditEventInput): Promise<void> {
  await executor.insert(auditLog).values({
    adminUserId: event.adminUserId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    metadata: event.metadata,
  });
}
