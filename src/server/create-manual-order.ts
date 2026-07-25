import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orderLines, orders } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import type { ManualOrderLineCandidate } from "@/server/build-order-form";

export type CreateManualOrderResult = { ok: true; id: string; orderNumber: string } | { ok: false; error: string };

// Deliberately NOT reusing create-order.ts/buildOrderDraft() — those are
// tightly coupled to CartItem/Product-shaped checkout data (see
// src/data/orders.ts's OrderLine type, which assumes a required productId/
// productSlug that manual lines don't have). This is a parallel, admin-
// only path so the working, tested checkout flow stays completely
// undisturbed. Callers (mutate-order.ts) are responsible for
// requireAdminUser() and passing a real adminUserId — this function is
// plain server-only, not a Server Action itself, matching create-order.ts's
// own separation between the pure DB operation and its caller's auth check.
export async function createManualOrder(
  adminUserId: string,
  customerId: string,
  lines: ManualOrderLineCandidate[],
): Promise<CreateManualOrderResult> {
  const db = getDb();

  try {
    const result = await db.transaction(async (tx) => {
      const customer = await tx.query.customers.findFirst({ where: eq(customers.id, customerId) });
      if (!customer) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }

      // Same order_number_seq checkout orders use — no second numbering
      // system. nextval() is safe under concurrent access by design.
      const sequenceResult = await tx.execute(sql`select nextval('order_number_seq') as value`);
      const nextValue = (sequenceResult.rows[0] as { value: string }).value;
      const orderNumber = `BRCP-${nextValue}`;

      // Server-calculated, never trusted from the client.
      const linesWithSubtotal = lines.map((line) => ({ ...line, lineSubtotal: line.unitPrice * line.quantity }));
      const subtotal = linesWithSubtotal.reduce((sum, line) => sum + line.lineSubtotal, 0);

      const orderId = crypto.randomUUID();
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        status: "draft",
        paymentStatus: "unpaid",
        customerId,
        pricingSummary: { subtotal, depositDue: 0, hasEstimatedPricing: false },
        // Customer-submitted checkout context stays a separate concept —
        // a manual order has none, so this stays null. Internal admin
        // commentary goes in the `notes` table, not this column.
        notes: null,
        source: "manual",
        // No real "client retry" concept for an admin-created order — this
        // purely satisfies the NOT NULL + unique constraint.
        clientRequestId: crypto.randomUUID(),
      });

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

      await recordAuditEvent(tx, {
        adminUserId,
        action: "order.created",
        entityType: "order",
        entityId: orderId,
        metadata: { orderNumber, source: "manual", lineCount: lines.length },
      });

      return { id: orderId, orderNumber };
    });

    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return { ok: false, error: "That customer no longer exists." };
    }
    console.error("Manual order creation failed", { customerId, error });
    return { ok: false, error: "We couldn't create this order. Please try again." };
  }
}
