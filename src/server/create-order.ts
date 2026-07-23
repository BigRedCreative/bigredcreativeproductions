import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orderLines, orders } from "@/db/schema";
import { buildOrderDraft } from "@/data/orders";
import type { OrderCustomer } from "@/data/orders";
import type { CartItem } from "@/data/cart";

export type CreateOrderResult =
  | { ok: true; id: string; orderNumber: string; status: string }
  | { ok: false; error: string };

function isUniqueViolation(error: unknown, constraint: string): boolean {
  // Postgres SQLSTATE 23505 = unique_violation. Constraint name is checked
  // too so this only matches the specific constraint we're guarding
  // against, not any unrelated unique violation.
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; constraint?: string; message?: string };
  if (candidate.code !== "23505") return false;
  return candidate.constraint === constraint || (candidate.message?.includes(constraint) ?? false);
}

// The single place Customer + Order + OrderLine rows are created. Runs as
// one atomic transaction — a partial order (e.g. order row created but a
// line insert fails) must never be left behind. `verifiedItems` must
// already be server-verified CartItems (see src/app/api/orders/route.ts) —
// this function does not re-validate pricing/eligibility itself, only
// persists what it's given.
export async function createOrder(
  clientRequestId: string,
  customer: OrderCustomer,
  notes: string | undefined,
  verifiedItems: CartItem[],
): Promise<CreateOrderResult> {
  // Everything below — including getDb() itself — is inside this try block.
  // getDb() throws when DATABASE_URL isn't configured; that must produce
  // the same safe client-facing error as any other persistence failure,
  // never an uncaught exception that leaks a raw stack trace to the client.
  try {
    const db = getDb();

    // Idempotency fast path: if this exact request already produced an
    // order (e.g. a retried request after a flaky response), return it
    // instead of creating a duplicate. The unique constraint on
    // client_request_id below is the real, race-safe authority — this is
    // just an optimization to avoid an unnecessary transaction on repeats.
    const existing = await db.query.orders.findFirst({
      where: eq(orders.clientRequestId, clientRequestId),
    });
    if (existing) {
      return { ok: true, id: existing.id, orderNumber: existing.orderNumber, status: existing.status };
    }

    const draft = buildOrderDraft(verifiedItems, customer, notes ?? "");
    const normalizedEmail = customer.email.trim().toLowerCase();

    return await db.transaction(async (tx) => {
      // Find-or-create customer, non-destructively: only fill in
      // currently-blank fields, never overwrite existing data.
      const existingCustomer = await tx.query.customers.findFirst({
        where: eq(customers.email, normalizedEmail),
      });

      let customerId: string;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        const patch: Partial<typeof customers.$inferInsert> = {};
        if (!existingCustomer.phone && customer.phone) patch.phone = customer.phone;
        if (!existingCustomer.company && customer.company) patch.company = customer.company;
        if (Object.keys(patch).length > 0) {
          await tx
            .update(customers)
            .set({ ...patch, updatedAt: new Date() })
            .where(eq(customers.id, customerId));
        }
      } else {
        const [created] = await tx
          .insert(customers)
          .values({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: normalizedEmail,
            phone: customer.phone,
            company: customer.company,
          })
          .returning({ id: customers.id });
        customerId = created.id;
      }

      // Sequence-generated, never SELECT MAX()+1 — safe under concurrent
      // order creation. See src/db/schema.ts's orderNumberSeq.
      const sequenceResult = await tx.execute(sql`select nextval('order_number_seq') as value`);
      const nextValue = (sequenceResult.rows[0] as { value: string }).value;
      const orderNumber = `BRCP-${nextValue}`;

      let insertedOrder: typeof orders.$inferSelect;
      try {
        const [row] = await tx
          .insert(orders)
          .values({
            id: draft.id,
            orderNumber,
            status: draft.status,
            customerId,
            pricingSummary: draft.pricingSummary,
            notes: draft.notes,
            source: "checkout",
            clientRequestId,
            createdAt: new Date(draft.createdAt),
            updatedAt: new Date(draft.updatedAt),
          })
          .returning();
        insertedOrder = row;
      } catch (error) {
        // A concurrent duplicate request (e.g. a rapid double-click that
        // raced past the fast-path check above) hit the unique constraint
        // on client_request_id first. That's the real idempotency
        // authority — recover by returning the order it created instead
        // of failing.
        if (isUniqueViolation(error, "orders_client_request_id_unique")) {
          const raced = await tx.query.orders.findFirst({
            where: eq(orders.clientRequestId, clientRequestId),
          });
          if (raced) {
            return { ok: true as const, id: raced.id, orderNumber: raced.orderNumber, status: raced.status };
          }
        }
        throw error;
      }

      if (draft.lines.length > 0) {
        await tx.insert(orderLines).values(
          draft.lines.map((line) => ({
            id: line.orderLineId,
            orderId: insertedOrder.id,
            productId: line.productId,
            productSlug: line.productSlug,
            productTitle: line.productTitle,
            productType: line.productType,
            purchaseMode: line.purchaseMode,
            quantity: line.quantity,
            selectedPackage: line.selectedPackage ?? null,
            selectedOptions: line.selectedOptions,
            selectedAddOns: line.selectedAddOns,
            unitPrice: line.unitPrice,
            depositAmount: line.depositAmount,
            lineSubtotal: line.lineSubtotal,
            intakeRequired: line.intakeRequired,
            intakeFormSlug: line.intakeFormSlug,
            intakeStatus: line.intakeStatus,
          })),
        );
      }

      return {
        ok: true as const,
        id: insertedOrder.id,
        orderNumber: insertedOrder.orderNumber,
        status: insertedOrder.status,
      };
    });
  } catch (error) {
    // Never log the full customer/order payload — only a safe identifier
    // and the error itself (no PII lives on the Error object here).
    console.error("Order creation failed", { clientRequestId, error });
    return { ok: false, error: "We couldn't create your order. Please try again." };
  }
}
