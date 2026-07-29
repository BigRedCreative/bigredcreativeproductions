import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orderLines, orders } from "@/db/schema";
import { buildOrderDraft } from "@/data/orders";
import type { OrderCustomer } from "@/data/orders";
import type { CartItem } from "@/data/cart";
import { recordAuditEvent } from "@/server/audit-log";
import { issueOrRotatePaymentAccessToken } from "@/server/payments/issue-token";

export type CreateOrderResult =
  // Phase 21C-2B — paymentAccessToken is present ONLY when this specific
  // response corresponds to a payment-eligible order (see
  // src/server/payments/eligibility.ts); absent (never null, never an
  // empty string) for every non-eligible order. See src/app/api/orders/
  // route.ts for how this becomes the public response's own optional
  // field. The raw value is never persisted anywhere — only its SHA-256
  // hash is (src/server/payments/issue-token.ts).
  | { ok: true; id: string; orderNumber: string; status: string; paymentAccessToken?: string }
  | { ok: false; error: string };

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
      // Phase 21C-2B — an idempotent retry of order creation is also the
      // approved token-rotation trigger (see CLAUDE.md "Payment
      // Capability Foundation" → "Token rotation"). This is a fresh,
      // top-level statement, outside any transaction opened above (there
      // isn't one on this fast path) — issueOrRotatePaymentAccessToken's
      // own single UPDATE is its own implicit transaction, which is fine:
      // rotating a token is a pure, local, no-external-call operation
      // with nothing else that needs to commit alongside it atomically.
      const existingLines = await db.query.orderLines.findMany({ where: eq(orderLines.orderId, existing.id) });
      const paymentAccessToken = await issueOrRotatePaymentAccessToken(db, existing, existingLines);
      return { ok: true, id: existing.id, orderNumber: existing.orderNumber, status: existing.status, paymentAccessToken };
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
        // Phase 21C-1 fix — a genuinely concurrent checkout with the same
        // brand-new email can race here: two transactions both see no
        // existing customer and both attempt this insert. `onConflictDoNothing`
        // is used specifically because it never throws on a conflict — a
        // plain INSERT that hits `customers_email_unique` would, and
        // catching that inside this same transaction would leave the
        // transaction aborted for every statement after it (Postgres marks
        // a transaction unusable the moment any statement in it errors),
        // making a same-transaction recovery SELECT unreliable. Racing past
        // the constraint here costs nothing but a second, harmless SELECT.
        const [created] = await tx
          .insert(customers)
          .values({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: normalizedEmail,
            phone: customer.phone,
            company: customer.company,
          })
          .onConflictDoNothing({ target: customers.email })
          .returning({ id: customers.id });

        if (created) {
          customerId = created.id;
        } else {
          // Lost the race — some other concurrent request's insert won.
          // Re-query for the winner's row inside this same, still-healthy
          // transaction (safe: onConflictDoNothing never threw, so nothing
          // here aborted the transaction). Per approved data semantics: the
          // existing/winning row always wins — this request's own
          // first/last name, phone, and company are discarded rather than
          // merged or used to patch the winner. This is deliberately
          // simpler than the non-destructive blank-field patch above (which
          // only applies when this request found a genuinely pre-existing
          // customer up front, not a same-instant race) — no customer-merge
          // logic is invented for the race case.
          const raced = await tx.query.customers.findFirst({
            where: eq(customers.email, normalizedEmail),
          });
          if (!raced) {
            // Structurally shouldn't happen (a conflict implies a row
            // exists) — a real, unexpected condition, not a race to
            // silently paper over. Throwing here aborts and rolls back
            // this whole transaction, which the outer try/catch below
            // turns into the same safe, generic client-facing error every
            // other unexpected failure already produces.
            throw new Error("Customer insert conflicted on customers_email_unique but no row was found on re-query.");
          }
          customerId = raced.id;
        }
      }

      // Sequence-generated, never SELECT MAX()+1 — safe under concurrent
      // order creation. See src/db/schema.ts's orderNumberSeq.
      const sequenceResult = await tx.execute(sql`select nextval('order_number_seq') as value`);
      const nextValue = (sequenceResult.rows[0] as { value: string }).value;
      const orderNumber = `BRCP-${nextValue}`;

      // Phase 21C-1 fix — this used to be a plain INSERT wrapped in a
      // try/catch that, on a caught unique_violation, re-queried for the
      // winning order inside this same transaction. That pattern was
      // proven broken by Phase 21C-1's genuine-concurrency testing: once a
      // statement inside a Postgres transaction errors, the whole
      // transaction is left aborted (Postgres error 25P02, "current
      // transaction is aborted") — every subsequent statement in it,
      // including a recovery SELECT, fails too. `onConflictDoNothing`
      // sidesteps this entirely: it never throws on a conflict, so the
      // transaction is never poisoned and a follow-up SELECT is safe. This
      // exactly mirrors the customer-email race fix above, applied to the
      // same class of problem for `orders_client_request_id_unique`.
      const [insertedRow] = await tx
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
        .onConflictDoNothing({ target: orders.clientRequestId })
        .returning();

      let insertedOrder: typeof orders.$inferSelect;
      if (insertedRow) {
        insertedOrder = insertedRow;
      } else {
        // Lost the race — another concurrent request with this exact
        // clientRequestId already committed (or is about to). Re-query
        // inside this same, still-healthy transaction and return that
        // order directly. Its order_lines and order.created audit event
        // were already written by the winning request — writing them
        // again here would create real duplicates, so this returns early
        // rather than falling through to the inserts below.
        const raced = await tx.query.orders.findFirst({
          where: eq(orders.clientRequestId, clientRequestId),
        });
        if (!raced) {
          // Structurally shouldn't happen (a conflict implies a row
          // exists) — a real, unexpected condition, not a race to
          // silently paper over.
          throw new Error("Order insert conflicted on orders_client_request_id_unique but no row was found on re-query.");
        }
        // Phase 21C-2B — same rotation trigger as the fast-path retry
        // above, reached here specifically when a genuinely concurrent
        // request lost the orders_client_request_id_unique race. Still
        // inside the same, still-healthy transaction (tx), so this
        // commits atomically with everything else the winning request
        // already wrote.
        const racedLines = await tx.query.orderLines.findMany({ where: eq(orderLines.orderId, raced.id) });
        const racedToken = await issueOrRotatePaymentAccessToken(tx, raced, racedLines);
        return { ok: true as const, id: raced.id, orderNumber: raced.orderNumber, status: raced.status, paymentAccessToken: racedToken };
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

      // Phase 21C-1 — the checkout path's own order.created event, the
      // one genuinely admin-less audit event in this codebase (a real,
      // unauthenticated customer triggered it — see AuditEventInput's own
      // comment for why adminUserId is null here, not a fake id). Placed
      // strictly after both inserts above succeed, and strictly INSIDE
      // this transaction, so it commits/rolls back atomically with the
      // order+lines it describes. This line is structurally unreachable
      // from the fast-path idempotent-return above (which returns before
      // this transaction even opens) and from the unique-violation
      // race-recovery catch block below (which returns the OTHER
      // request's already-existing order) — a retry of the same
      // clientRequestId can never reach this line a second time.
      await recordAuditEvent(tx, {
        adminUserId: null,
        action: "order.created",
        entityType: "order",
        entityId: insertedOrder.id,
        metadata: { orderNumber: insertedOrder.orderNumber, source: "checkout", lineCount: draft.lines.length },
      });

      // Phase 21C-2B — the fresh-creation issuance path. draft.lines
      // already has purchaseMode for every line, so no extra query is
      // needed here (unlike the two recovery branches above, which only
      // have the bare order row and must fetch order_lines separately).
      const paymentAccessToken = await issueOrRotatePaymentAccessToken(tx, insertedOrder, draft.lines);

      return {
        ok: true as const,
        id: insertedOrder.id,
        orderNumber: insertedOrder.orderNumber,
        status: insertedOrder.status,
        paymentAccessToken,
      };
    });
  } catch (error) {
    // Never log the full customer/order payload — only a safe identifier
    // and the error itself (no PII lives on the Error object here).
    console.error("Order creation failed", { clientRequestId, error });
    return { ok: false, error: "We couldn't create your order. Please try again." };
  }
}
