import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { notes, adminUsers } from "@/db/schema";
import type { NoteEntityType } from "@/db/schema";
import type { getDb } from "@/db";

// Generic, append-only note recording — shared by leads today, and
// designed (via the notes table's own entityType/entityId polymorphic
// shape) to be reused unmodified by customers/orders once those
// subphases build their own admin mutations. Mirrors audit-log.ts's
// exact recordAuditEvent() shape and transactional-executor pattern.

type Database = ReturnType<typeof getDb>;
type InsertExecutor = Pick<Database, "insert">;

export type NoteInput = {
  entityType: NoteEntityType;
  entityId: string;
  adminUserId: string;
  body: string;
};

// Pass the `tx` from inside a db.transaction() call so the note and
// whatever else that transaction does (e.g. an audit_log entry) commit or
// roll back together — never call this outside a transaction for
// anything that also writes other tables.
export async function recordNote(executor: InsertExecutor, input: NoteInput): Promise<void> {
  await executor.insert(notes).values({
    entityType: input.entityType,
    entityId: input.entityId,
    adminUserId: input.adminUserId,
    body: input.body,
  });
}

export type NoteWithAuthor = {
  id: string;
  body: string;
  createdAt: Date;
  authorDisplayName: string | null;
};

// Shared action-result shape for every entity's "add note" Server Action
// (leads, customers, orders) — lets the generic NoteForm client component
// (src/components/admin/NoteForm.tsx) type its `action` prop once instead
// of per entity. Each mutate-*.ts file's addXNoteAction still independently
// calls requireAdminUser() and writes its own audit event — this is only a
// shared TYPE, not shared authorization logic.
export type NoteActionState = { errors: string[] } | { success: true } | null;

// Chronological (oldest first) — append-only history reads most naturally
// top-to-bottom in the order it was written, like a running log.
export async function getNotesForEntity(
  db: Database,
  entityType: NoteEntityType,
  entityId: string,
): Promise<NoteWithAuthor[]> {
  const rows = await db
    .select({
      id: notes.id,
      body: notes.body,
      createdAt: notes.createdAt,
      authorDisplayName: adminUsers.displayName,
    })
    .from(notes)
    .leftJoin(adminUsers, eq(notes.adminUserId, adminUsers.id))
    .where(and(eq(notes.entityType, entityType), eq(notes.entityId, entityId)))
    .orderBy(asc(notes.createdAt));

  return rows;
}
