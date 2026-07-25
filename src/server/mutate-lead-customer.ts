"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, leads } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";

// Separate from mutate-customer.ts (which owns customer creation, including
// the "create from lead" combined transaction) and mutate-lead.ts (which
// owns lead-only status/archive/note actions) — this file is specifically
// "link an EXISTING customer to a lead," a cross-entity action that
// doesn't belong cleanly to either. Independently calls requireAdminUser().

export type LeadCustomerActionState = { errors: string[] } | { success: true } | null;

// Bound per-row as linkExistingCustomerAction.bind(null, leadId, customerId)
// from a small search-results list on the lead detail page — see
// LinkCustomerButton.tsx. Never merges records; the lead and customer stay
// two separate rows, only leads.customerId changes.
export async function linkExistingCustomerAction(
  leadId: string,
  customerId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: LeadCustomerActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<LeadCustomerActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const lead = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
      if (!lead) {
        throw new Error("LEAD_NOT_FOUND");
      }
      if (lead.customerId) {
        throw new Error("ALREADY_LINKED");
      }

      const customer = await tx.query.customers.findFirst({ where: eq(customers.id, customerId) });
      if (!customer) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }

      // Deliberately does NOT touch lead.status — linking to a customer is
      // not the same thing as winning the lead; those stay two separate,
      // independently-set decisions.
      await tx.update(leads).set({ customerId, updatedAt: new Date() }).where(eq(leads.id, leadId));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "lead.customer_linked",
        entityType: "lead",
        entityId: leadId,
        metadata: { customerId },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return { errors: ["This lead no longer exists."] };
    }
    if (error instanceof Error && error.message === "ALREADY_LINKED") {
      return { errors: ["This lead is already linked to a customer."] };
    }
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return { errors: ["That customer no longer exists."] };
    }
    console.error("Lead-customer link failed", { leadId, error });
    return { errors: ["We couldn't link this customer. Please try again."] };
  }

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true };
}
