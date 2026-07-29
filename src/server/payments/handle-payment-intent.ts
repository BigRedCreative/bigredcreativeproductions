import "server-only";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, orderLines } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import { verifyPaymentAccessToken } from "./access-token";
import { isStripePaymentEligible } from "./eligibility";
import { buildStripeIdempotencyKey } from "./stripe";
import { PaymentProviderError, type PaymentProvider } from "./provider";

// Phase 21C-2B — the core payment-intent request logic, deliberately
// factored out of the actual Next.js route (src/app/api/orders/[id]/
// payment-intent/route.ts) and parameterized on an injected PaymentProvider
// — mirrors src/server/brain/handle-request.ts's exact pattern, which is
// what lets the entire automated regression suite exercise this logic with
// a MockPaymentProvider, with no live session, no real HTTP request, and
// no Stripe account of any kind. The route itself only ever handles steps
// 1-2 (rate limit, body parsing) before calling into this function — see
// the route file's own comment for why that split matters.

const RECONCILIATION_WINDOW_MS = 24 * 60 * 60 * 1000;

// Closed, fully-approved vocabulary for payment.reference_anomaly's own
// `reason` field. `unexpected_livemode` was proposed mid-implementation
// (the approved Part 2 safety requirement — "if livemode is true, treat as
// critical anomaly, never persist, never change paymentStatus" — had no
// home in the other four) and was explicitly approved as the fifth member
// on review, specifically because a live-mode object appearing in this
// test-only payment path is a genuinely distinct critical
// configuration/provider anomaly that must not be mislabeled as another
// failure class.
export type PaymentAnomalyReason =
  | "missing_provider_reference"
  | "reconciliation_window_expired"
  | "idempotency_conflict"
  | "amount_mismatch"
  | "unexpected_livemode";

export type PaymentIntentHandlerResult =
  | { kind: "success"; isNew: boolean; orderId: string; orderNumber: string; clientSecret: string }
  // Identical for a nonexistent order, a wrong/missing/expired token — the
  // caller must never distinguish these in its own response.
  | { kind: "not_found" }
  | { kind: "not_eligible"; reason: "ineligible" | "already_paid" | "canceled" }
  | { kind: "anomaly"; reason: PaymentAnomalyReason }
  | { kind: "provider_unavailable" }
  | { kind: "persistence_failure" };

const GENERIC_FAILURE_RESULT: PaymentIntentHandlerResult = { kind: "persistence_failure" };

export async function handlePaymentIntentRequest(
  provider: PaymentProvider,
  orderId: string,
  presentedToken: string,
): Promise<PaymentIntentHandlerResult> {
  try {
    const db = getDb();

    // Step 3 — fetch order + lines.
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) return { kind: "not_found" };

    // Steps 4-5 — verify token + expiry. Identical outcome to "order not
    // found" — an invalid capability must never confirm order existence.
    const tokenValid = verifyPaymentAccessToken(
      { paymentAccessTokenHash: order.paymentAccessTokenHash, paymentAccessTokenExpiresAt: order.paymentAccessTokenExpiresAt },
      presentedToken,
    );
    if (!tokenValid) return { kind: "not_found" };

    // Step 6 — eligibility. paymentStatus-specific terminal states get
    // their own distinguishable (but still safe, non-PII) reason; every
    // other ineligibility reason collapses into the generic "ineligible".
    if (order.paymentStatus === "paid") return { kind: "not_eligible", reason: "already_paid" };
    if (order.paymentStatus === "canceled") return { kind: "not_eligible", reason: "canceled" };

    const lines = await db.query.orderLines.findMany({ where: eq(orderLines.orderId, order.id) });
    if (!isStripePaymentEligible(order, lines)) return { kind: "not_eligible", reason: "ineligible" };

    // Steps 7-8 — authoritative amount, computed fresh from persisted
    // integer-cent order_lines, never trusted from anywhere else. Cross-
    // checked against the frozen pricingSummary.subtotal — these should
    // always agree for a correctly-created order; a mismatch is treated
    // as a real anomaly, never silently resolved in either value's favor.
    const authoritativeAmountCents = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    if (authoritativeAmountCents !== order.pricingSummary.subtotal) {
      await recordAuditEvent(db, {
        adminUserId: null,
        action: "payment.reference_anomaly",
        entityType: "order",
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, reason: "amount_mismatch" },
      });
      return { kind: "anomaly", reason: "amount_mismatch" };
    }

    // Step 9 — inspect existing stripePaymentIntentId / attemptedAt.
    if (order.stripePaymentIntentId) {
      // Case 4 — resume. The 24h reconciliation window does not apply
      // once a provider id is safely persisted.
      const existingIntent = await provider.retrievePaymentIntent(order.stripePaymentIntentId);
      if (!existingIntent) {
        // Case 5 — missing provider reference. Never clear the id, never
        // create a replacement, never change paymentStatus.
        await recordAuditEvent(db, {
          adminUserId: null,
          action: "payment.reference_anomaly",
          entityType: "order",
          entityId: order.id,
          metadata: { orderNumber: order.orderNumber, reason: "missing_provider_reference" },
        });
        return { kind: "anomaly", reason: "missing_provider_reference" };
      }
      if (existingIntent.livemode) {
        // See PaymentAnomalyReason's own doc comment above.
        await recordAuditEvent(db, {
          adminUserId: null,
          action: "payment.reference_anomaly",
          entityType: "order",
          entityId: order.id,
          metadata: { orderNumber: order.orderNumber, reason: "unexpected_livemode" },
        });
        return { kind: "anomaly", reason: "unexpected_livemode" };
      }
      // Pure resume — no state mutation, no audit event (audit is for a
      // NEW link only, never a resume).
      return { kind: "success", isNew: false, orderId: order.id, orderNumber: order.orderNumber, clientSecret: existingIntent.clientSecret };
    }

    // stripePaymentIntentId is null from here on — Cases 1/2/3.
    if (order.stripePaymentIntentAttemptedAt) {
      const ageMs = Date.now() - order.stripePaymentIntentAttemptedAt.getTime();
      if (ageMs >= RECONCILIATION_WINDOW_MS) {
        // Case 3 — fail closed. No Stripe call of any kind.
        await recordAuditEvent(db, {
          adminUserId: null,
          action: "payment.reference_anomaly",
          entityType: "order",
          entityId: order.id,
          metadata: { orderNumber: order.orderNumber, reason: "reconciliation_window_expired" },
        });
        return { kind: "anomaly", reason: "reconciliation_window_expired" };
      }
      // Case 2 — within the window; fall through to retry using the same
      // deterministic idempotency key. attemptedAt is NOT reset below,
      // since the conditional UPDATE only ever fires when it's null.
    }
    // Case 1 (attemptedAt null) falls through here too.

    // Atomically set attemptedAt to NOW, but ONLY if still null — this is
    // what makes it "set once, never reset by ordinary retries" true even
    // under concurrent requests: whichever request's UPDATE commits first
    // wins the WHERE-null guard; any other concurrent request's identical
    // UPDATE simply affects 0 rows and changes nothing.
    await db
      .update(orders)
      .set({ stripePaymentIntentAttemptedAt: new Date() })
      .where(and(eq(orders.id, order.id), isNull(orders.stripePaymentIntentAttemptedAt)));

    let created;
    try {
      created = await provider.createPaymentIntent({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountCents: authoritativeAmountCents,
        currency: "usd",
        idempotencyKey: buildStripeIdempotencyKey(order.id),
      });
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        if (error.category === "idempotency_conflict") {
          // Never generate a fallback key, never create a replacement
          // intent — hard fail, safely audited.
          await recordAuditEvent(db, {
            adminUserId: null,
            action: "payment.reference_anomaly",
            entityType: "order",
            entityId: order.id,
            metadata: { orderNumber: order.orderNumber, reason: "idempotency_conflict" },
          });
          return { kind: "anomaly", reason: "idempotency_conflict" };
        }
        // provider_unavailable / provider_rate_limited / invalid_request —
        // order stays exactly as it was (unpaid or failed), provider id
        // stays null. No audit event for an ordinary provider failure —
        // this is an expected, retriable condition, not an anomaly.
        return { kind: "provider_unavailable" };
      }
      throw error;
    }

    if (created.livemode) {
      // Critical safety check, independent of the key-prefix guard
      // already enforced in stripe.ts's own client construction — never
      // trust one signal alone. Do NOT persist the id, do NOT change
      // paymentStatus.
      await recordAuditEvent(db, {
        adminUserId: null,
        action: "payment.reference_anomaly",
        entityType: "order",
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, reason: "unexpected_livemode" },
      });
      return { kind: "anomaly", reason: "unexpected_livemode" };
    }

    // Conditional persistence — mirrors Phase 21C-1's onConflictDoNothing
    // pattern, applied to an UPDATE instead of an INSERT (there's no
    // natural unique-constraint-violation shape for "claim this order",
    // so a WHERE-null guard is the equivalent race-safe mechanism).
    const [persisted] = await db
      .update(orders)
      .set({
        stripePaymentIntentId: created.providerPaymentIntentId,
        stripePaymentStatus: created.status,
        paymentStatus: "pending",
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, order.id), isNull(orders.stripePaymentIntentId)))
      .returning({ id: orders.id });

    if (persisted) {
      // Won the race (or was the only request) — this is a genuinely new
      // link. Audit exactly once.
      await recordAuditEvent(db, {
        adminUserId: null,
        action: "payment.intent_created",
        entityType: "order",
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, provider: created.provider },
      });
      return { kind: "success", isNew: true, orderId: order.id, orderNumber: order.orderNumber, clientSecret: created.clientSecret };
    }

    // Lost the race (Case D) — another concurrent request already
    // persisted a stripePaymentIntentId for this order first. Re-fetch
    // and resume THAT one instead — no audit event (not a new link), and
    // never treat this as a failure.
    const winner = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    if (!winner?.stripePaymentIntentId) {
      // Structurally shouldn't happen (the failed conditional UPDATE
      // implies someone else's WHERE-null guard already won) — a real,
      // unexpected condition.
      return GENERIC_FAILURE_RESULT;
    }
    const resumed = await provider.retrievePaymentIntent(winner.stripePaymentIntentId);
    if (!resumed) {
      await recordAuditEvent(db, {
        adminUserId: null,
        action: "payment.reference_anomaly",
        entityType: "order",
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, reason: "missing_provider_reference" },
      });
      return { kind: "anomaly", reason: "missing_provider_reference" };
    }
    return { kind: "success", isNew: false, orderId: order.id, orderNumber: order.orderNumber, clientSecret: resumed.clientSecret };
  } catch {
    // Deliberately narrower than create-order.ts's own catch-all, per
    // explicit review direction for this payment-adjacent path: no Error
    // object, no error.message, no error.stack, and no derived/inspected
    // value of any kind is ever logged here — only a safe order identifier
    // and a single, fixed, closed-vocabulary category we control. By this
    // point in the function every classifiable failure (a PaymentProviderError,
    // a real payment.reference_anomaly) has already been handled and
    // returned above with its own specific, already-audited result — this
    // outer catch only ever reaches an unexpected condition (e.g. a
    // database error, or a provider throwing something other than
    // PaymentProviderError), for which no further detail is safe to log.
    console.error("Payment intent request failed.", { orderId, category: "unexpected_error" });
    return GENERIC_FAILURE_RESULT;
  }
}
