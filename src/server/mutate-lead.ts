"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import { recordNote } from "@/server/notes";
import { LEAD_STATUSES } from "@/data/leads";
import type { LeadStatus } from "@/data/leads";

// Every admin write for leads. Every export independently calls
// requireAdminUser() as its first line — Server Actions aren't covered by
// the protected admin layout's own check, per the rule established since
// Phase 12. This is the admin-only counterpart to submit-lead.ts's one
// unauthenticated write path — deliberately kept in a separate file so
// that boundary stays obvious.

export type LeadActionState = { errors: string[] } | { success: true } | null;

export async function setLeadStatusAction(
  id: string,
  _prevState: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const adminUser = await requireAdminUser();

  const nextStatus = formData.get("status");
  if (typeof nextStatus !== "string" || !(LEAD_STATUSES as readonly string[]).includes(nextStatus)) {
    return { errors: ["Not a valid lead status."] };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.leads.findFirst({ where: eq(leads.id, id) });
      if (!existing) {
        throw new Error("LEAD_NOT_FOUND");
      }

      await tx.update(leads).set({ status: nextStatus, updatedAt: new Date() }).where(eq(leads.id, id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "lead.status_changed",
        entityType: "lead",
        entityId: id,
        // Only from/to — never name, email, or message.
        metadata: { from: existing.status, to: nextStatus as LeadStatus },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return { errors: ["This lead no longer exists."] };
    }
    console.error("Lead status change failed", { id, error });
    return { errors: ["We couldn't update this lead. Please try again."] };
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { success: true };
}

export async function setLeadArchivedAction(
  id: string,
  archived: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: LeadActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<LeadActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.leads.findFirst({ where: eq(leads.id, id) });
      if (!existing) {
        throw new Error("LEAD_NOT_FOUND");
      }

      // archivedAt is orthogonal to status — this never touches `status`,
      // preserving whatever funnel stage the lead was actually in.
      await tx
        .update(leads)
        .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
        .where(eq(leads.id, id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: archived ? "lead.archived" : "lead.unarchived",
        entityType: "lead",
        entityId: id,
        metadata: {},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return { errors: ["This lead no longer exists."] };
    }
    console.error("Lead archive/unarchive failed", { id, error });
    return { errors: ["We couldn't update this lead. Please try again."] };
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { success: true };
}

export async function addLeadNoteAction(
  id: string,
  _prevState: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const adminUser = await requireAdminUser();

  const body = formData.get("body");
  const trimmedBody = typeof body === "string" ? body.trim() : "";
  if (!trimmedBody) {
    return { errors: ["Note can't be empty."] };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.leads.findFirst({ where: eq(leads.id, id) });
      if (!existing) {
        throw new Error("LEAD_NOT_FOUND");
      }

      await recordNote(tx, { entityType: "lead", entityId: id, adminUserId: adminUser.id, body: trimmedBody });

      // Metadata deliberately excludes the note body — only that a note
      // was added, never its contents.
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "lead.note_added",
        entityType: "lead",
        entityId: id,
        metadata: {},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return { errors: ["This lead no longer exists."] };
    }
    console.error("Lead note add failed", { id, error });
    return { errors: ["We couldn't save this note. Please try again."] };
  }

  revalidatePath(`/admin/leads/${id}`);
  return { success: true };
}
