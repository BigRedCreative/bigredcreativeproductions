"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orderLines, orders } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { buildManualOrderFromFormData, buildOrderLinesFromFormData } from "@/server/build-order-form";
import { createManualOrder } from "@/server/create-manual-order";
import { recordAuditEvent } from "@/server/audit-log";
import { recordNote } from "@/server/notes";
import type { NoteActionState } from "@/server/notes";
import { ORDER_STATUSES, PAYMENT_STATUSES, isValidOrderStatusTransition, isValidPaymentStatusTransition } from "@/data/orders";
import type { OrderStatus, PaymentStatus } from "@/data/orders";

// Every admin write for orders. Every export independently calls
// requireAdminUser() — Server Actions aren't covered by the protected
// layout's own check, per the rule established since Phase 12.

export type ManualOrderFormState = { errors: string[] } | null;
export type OrderActionState = { errors: string[] } | { success: true } | null;

export async function createManualOrderAction(
  _prevState: ManualOrderFormState,
  formData: FormData,
): Promise<ManualOrderFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildManualOrderFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const result = await createManualOrder(adminUser.id, parsed.customerId, parsed.lines);
  if (!result.ok) {
    return { errors: [result.error] };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/customers/${parsed.customerId}`);
  redirect(`/admin/orders/${result.id}`);
}

// Line items/pricing are editable ONLY while status = "draft" — once an
// order leaves draft, its pricing is a frozen historical snapshot, per the
// approved architecture. This is enforced here server-side, not just by
// hiding the UI: even a direct POST to this action on a non-draft order is
// rejected.
export async function updateOrderLinesAction(
  orderId: string,
  _prevState: ManualOrderFormState,
  formData: FormData,
): Promise<ManualOrderFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildOrderLinesFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!existing) {
        throw new Error("ORDER_NOT_FOUND");
      }
      if (existing.status !== "draft") {
        throw new Error("NOT_DRAFT");
      }

      const linesWithSubtotal = parsed.lines.map((line) => ({ ...line, lineSubtotal: line.unitPrice * line.quantity }));
      const subtotal = linesWithSubtotal.reduce((sum, line) => sum + line.lineSubtotal, 0);

      await tx.delete(orderLines).where(eq(orderLines.orderId, orderId));
      await tx.insert(orderLines).values(
        linesWithSubtotal.map((line) => ({
          orderId,
          productId: line.productId,
          productSlug: line.productSlug,
          productTitle: line.productTitle,
          description: line.description,
          productType: line.productType,
          purchaseMode: "fixed-price",
          quantity: line.quantity,
          selectedOptions: [],
          selectedAddOns: [],
          unitPrice: line.unitPrice,
          lineSubtotal: line.lineSubtotal,
        })),
      );

      await tx
        .update(orders)
        .set({ pricingSummary: { subtotal, depositDue: 0, hasEstimatedPricing: false }, updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "order.lines_updated",
        entityType: "order",
        entityId: orderId,
        metadata: { lineCount: parsed.lines.length },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return { errors: ["This order no longer exists."] };
    }
    if (error instanceof Error && error.message === "NOT_DRAFT") {
      return { errors: ["Line items can only be edited while the order is a draft."] };
    }
    console.error("Order lines update failed", { orderId, error });
    return { errors: ["We couldn't save these line items. Please try again."] };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

export async function setOrderStatusAction(
  orderId: string,
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const adminUser = await requireAdminUser();

  const nextStatus = formData.get("status");
  if (typeof nextStatus !== "string" || !(ORDER_STATUSES as readonly string[]).includes(nextStatus)) {
    return { errors: ["Not a valid order status."] };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!existing) {
        throw new Error("ORDER_NOT_FOUND");
      }
      const from = existing.status as OrderStatus;
      const to = nextStatus as OrderStatus;
      if (!isValidOrderStatusTransition(from, to)) {
        throw new Error("INVALID_TRANSITION");
      }

      await tx.update(orders).set({ status: to, updatedAt: new Date() }).where(eq(orders.id, orderId));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "order.status_changed",
        entityType: "order",
        entityId: orderId,
        metadata: { from, to },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return { errors: ["This order no longer exists."] };
    }
    if (error instanceof Error && error.message === "INVALID_TRANSITION") {
      return { errors: ["That status change isn't allowed from this order's current status."] };
    }
    console.error("Order status change failed", { orderId, error });
    return { errors: ["We couldn't update this order. Please try again."] };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export async function setOrderPaymentStatusAction(
  orderId: string,
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const adminUser = await requireAdminUser();

  const nextStatus = formData.get("paymentStatus");
  if (typeof nextStatus !== "string" || !(PAYMENT_STATUSES as readonly string[]).includes(nextStatus)) {
    return { errors: ["Not a valid payment status."] };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!existing) {
        throw new Error("ORDER_NOT_FOUND");
      }
      const from = existing.paymentStatus as PaymentStatus;
      const to = nextStatus as PaymentStatus;
      if (!isValidPaymentStatusTransition(from, to)) {
        throw new Error("INVALID_TRANSITION");
      }

      await tx.update(orders).set({ paymentStatus: to, updatedAt: new Date() }).where(eq(orders.id, orderId));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "order.payment_status_changed",
        entityType: "order",
        entityId: orderId,
        metadata: { from, to },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return { errors: ["This order no longer exists."] };
    }
    if (error instanceof Error && error.message === "INVALID_TRANSITION") {
      return { errors: ["That payment status change isn't allowed from this order's current status."] };
    }
    console.error("Order payment status change failed", { orderId, error });
    return { errors: ["We couldn't update this order. Please try again."] };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export async function addOrderNoteAction(
  orderId: string,
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
      const existing = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!existing) {
        throw new Error("ORDER_NOT_FOUND");
      }

      await recordNote(tx, { entityType: "order", entityId: orderId, adminUserId: adminUser.id, body: trimmedBody });

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "order.note_added",
        entityType: "order",
        entityId: orderId,
        metadata: {},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return { errors: ["This order no longer exists."] };
    }
    console.error("Order note add failed", { orderId, error });
    return { errors: ["We couldn't save this note. Please try again."] };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
