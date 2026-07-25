"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, leads } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { buildCustomerFromFormData } from "@/server/build-customer-form";
import { recordAuditEvent } from "@/server/audit-log";
import { recordNote } from "@/server/notes";
import type { NoteActionState } from "@/server/notes";
import { isUniqueViolation } from "@/server/is-unique-violation";

// Every admin write for customers, plus the one Lead → Customer creation
// path (createCustomerAction handles both "manual create" and "create
// from lead" — see the fromLeadId branch below — since both cases insert
// the exact same customer row, and combining them keeps the lead-linking
// step inside the SAME transaction as the customer insert, per the
// approved architecture). Every export independently calls
// requireAdminUser() — Server Actions aren't covered by the protected
// layout's own check, per the rule established since Phase 12.

export type CustomerFormState = { errors: string[] } | null;

// customers.email is unique at the database level (customers_email_unique)
// — that constraint is the real, race-safe authority. This proactive
// SELECT-before-INSERT (matching create-order.ts's own find-or-create
// pattern) exists only to return a friendlier, specific error instead of
// relying solely on the exception path. Never silently merges or
// overwrites an existing row.
export async function createCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildCustomerFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const db = getDb();
  let createdId: string;

  try {
    createdId = await db.transaction(async (tx) => {
      const existing = await tx.query.customers.findFirst({ where: eq(customers.email, parsed.customer.email) });
      if (existing) {
        throw new Error(`DUPLICATE_EMAIL:${existing.id}`);
      }

      if (parsed.fromLeadId) {
        const leadRow = await tx.query.leads.findFirst({ where: eq(leads.id, parsed.fromLeadId) });
        if (!leadRow) {
          throw new Error("LEAD_NOT_FOUND");
        }
        if (leadRow.customerId) {
          throw new Error("LEAD_ALREADY_LINKED");
        }
      }

      const [created] = await tx
        .insert(customers)
        .values({
          firstName: parsed.customer.firstName,
          lastName: parsed.customer.lastName,
          email: parsed.customer.email,
          phone: parsed.customer.phone,
          company: parsed.customer.company,
        })
        .returning({ id: customers.id });

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "customer.created",
        entityType: "customer",
        entityId: created.id,
        metadata: { source: parsed.fromLeadId ? "lead" : "manual" },
      });

      if (parsed.fromLeadId) {
        await tx
          .update(leads)
          .set({ customerId: created.id, updatedAt: new Date() })
          .where(eq(leads.id, parsed.fromLeadId));

        await recordAuditEvent(tx, {
          adminUserId: adminUser.id,
          action: "lead.customer_linked",
          entityType: "lead",
          entityId: parsed.fromLeadId,
          metadata: { customerId: created.id },
        });
      }

      return created.id;
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("DUPLICATE_EMAIL:")) {
      const existingId = error.message.slice("DUPLICATE_EMAIL:".length);
      return { errors: [`A customer with this email already exists — view it at /admin/customers/${existingId}.`] };
    }
    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return { errors: ["That lead no longer exists."] };
    }
    if (error instanceof Error && error.message === "LEAD_ALREADY_LINKED") {
      return { errors: ["That lead is already linked to a customer."] };
    }
    if (isUniqueViolation(error, "customers_email_unique")) {
      return { errors: ["A customer with this email already exists."] };
    }
    console.error("Customer creation failed", { error });
    return { errors: ["We couldn't save this customer. Please try again."] };
  }

  revalidatePath("/admin/customers");
  if (parsed.fromLeadId) {
    revalidatePath(`/admin/leads/${parsed.fromLeadId}`);
  }
  redirect(`/admin/customers/${createdId}`);
}

export async function updateCustomerAction(
  id: string,
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const adminUser = await requireAdminUser();

  const db = getDb();
  const existing = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  if (!existing) {
    return { errors: ["This customer no longer exists."] };
  }

  const parsed = buildCustomerFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  try {
    await db.transaction(async (tx) => {
      if (parsed.customer.email !== existing.email) {
        const collision = await tx.query.customers.findFirst({ where: eq(customers.email, parsed.customer.email) });
        if (collision && collision.id !== id) {
          throw new Error("DUPLICATE_EMAIL");
        }
      }

      await tx
        .update(customers)
        .set({
          firstName: parsed.customer.firstName,
          lastName: parsed.customer.lastName,
          email: parsed.customer.email,
          phone: parsed.customer.phone,
          company: parsed.customer.company,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id));

      // No email/phone/name/company values in metadata — small and
      // non-PII, matching the rest of this codebase's audit convention.
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "customer.updated",
        entityType: "customer",
        entityId: id,
        metadata: {},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_EMAIL") {
      return { errors: ["Another customer already uses this email address."] };
    }
    if (isUniqueViolation(error, "customers_email_unique")) {
      return { errors: ["Another customer already uses this email address."] };
    }
    console.error("Customer update failed", { id, error });
    return { errors: ["We couldn't save this customer. Please try again."] };
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  redirect(`/admin/customers/${id}`);
}

export async function addCustomerNoteAction(
  id: string,
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const adminUser = await requireAdminUser();

  const body = formData.get("body");
  const trimmedBody = typeof body === "string" ? body.trim() : "";
  if (!trimmedBody) {
    return { errors: ["Note can't be empty."] };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.customers.findFirst({ where: eq(customers.id, id) });
      if (!existing) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }

      await recordNote(tx, { entityType: "customer", entityId: id, adminUserId: adminUser.id, body: trimmedBody });

      // Metadata deliberately excludes the note body.
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "customer.note_added",
        entityType: "customer",
        entityId: id,
        metadata: {},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return { errors: ["This customer no longer exists."] };
    }
    console.error("Customer note add failed", { id, error });
    return { errors: ["We couldn't save this note. Please try again."] };
  }

  revalidatePath(`/admin/customers/${id}`);
  return { success: true };
}
