import "server-only";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, orderLines, stripeWebhookEvents } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import { resolvePaymentModeExpectation } from "@/data/deployment-environment";

// Phase 21C-2D — the core, signature-VERIFIED webhook processing logic.
// Deliberately factored out of the actual Next.js route
// (src/app/api/stripe/webhook/route.ts), taking an already-verified
// Stripe.Event as a plain parameter — mirrors handle-payment-intent.ts's
// exact split (injected dependency, no direct Stripe SDK import here),
// which is what lets the entire offline test suite exercise this logic
// with synthetic Stripe.Event objects, never a real HTTP request and never
// real Stripe signature machinery. The route itself only ever: reads the
// raw body once, reads the Stripe-Signature header, calls
// verifyWebhookSignature() (src/server/payments/stripe.ts — the one file
// allowed to import `stripe`), and maps this function's result onto the
// approved HTTP response matrix.

// -----------------------------------------------------------------------
// Closed vocabulary — 7 total categories/reasons: 5 terminal, 2 retryable.
// Terminal: the event will NEVER become processable no matter how many
// times Stripe retries delivery — durably deduped, generic 200, a
// payment.webhook_anomaly audit event, no mutation.
// Retryable: the event MIGHT become processable on a future delivery
// attempt (e.g. the matching order hasn't committed yet, or a transient
// database failure occurred) — NOT durably deduped (the dedup insert is
// rolled back along with everything else), generic 5xx, no audit event
// (there is nothing yet to safely attribute one to).
// -----------------------------------------------------------------------
export type WebhookTerminalReason =
  | "unexpected_livemode"
  | "amount_mismatch"
  | "currency_mismatch"
  | "provider_reference_mismatch"
  | "integrity_invalid_state";

export type WebhookRetryableReason = "order_not_found" | "database_error";

export type WebhookHandlerResult =
  // A signed, verified event whose type isn't one of the three this app
  // processes. Returned 200 with ZERO mutation, zero audit event, and no
  // stripe_webhook_events row — Stripe must never retry an event type this
  // app has no opinion about.
  | { kind: "ignored_unhandled_type" }
  // The dedup row for this event.id already existed — this exact delivery
  // was already fully processed (or already recorded as a terminal
  // anomaly) by an earlier attempt. Zero mutation, zero new audit event.
  | { kind: "duplicate" }
  // A genuinely new event was processed — either a real state mutation
  // occurred, or the event was a no-op relative to the order's current
  // state (e.g. a re-delivered "succeeded" for an already-paid order).
  | { kind: "processed" }
  // Terminal anomaly — durably deduped, audited, 200.
  | { kind: "anomaly"; reason: WebhookTerminalReason }
  // Retryable failure — NOT durably deduped, NOT audited, 5xx.
  | { kind: "retryable"; reason: WebhookRetryableReason };

const ALLOWED_EVENT_TYPES: ReadonlySet<string> = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

// Thrown ONLY for the genuinely retryable case, inside the transaction —
// throwing here (rather than returning) is what makes Drizzle's
// db.transaction() roll back everything, including the dedup insert that
// already happened earlier in the same callback. Caught by the outer
// try/catch below and converted into { kind: "retryable", ... }.
class RetryableWebhookError extends Error {
  readonly reason: WebhookRetryableReason;
  constructor(reason: WebhookRetryableReason) {
    super(`Retryable webhook failure: ${reason}`);
    this.name = "RetryableWebhookError";
    this.reason = reason;
  }
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type OrderRow = typeof orders.$inferSelect;

async function recordAnomaly(
  tx: Tx,
  order: OrderRow | null,
  paymentIntentId: string,
  eventType: string,
  reason: WebhookTerminalReason,
): Promise<{ kind: "anomaly"; reason: WebhookTerminalReason }> {
  // Metadata deliberately omits orderNumber (rather than sending null or a
  // placeholder) in the one genuine edge case where no local order could
  // be resolved at all — see the design note below at the livemode check
  // for why this can happen. Every other anomaly path always has a real
  // order and includes its orderNumber.
  await recordAuditEvent(tx, {
    adminUserId: null,
    action: "payment.webhook_anomaly",
    entityType: "order",
    // Falls back to the raw PaymentIntent id (never an internal order id)
    // only when no order row exists to attach this to.
    entityId: order?.id ?? paymentIntentId,
    metadata: order
      ? { orderNumber: order.orderNumber, provider: "stripe", eventType, reason }
      : { provider: "stripe", eventType, reason },
  });
  return { kind: "anomaly", reason };
}

// Webhook-specific state precedence — deliberately SEPARATE from
// PAYMENT_STATUS_TRANSITIONS / isValidPaymentStatusTransition (src/data/
// orders.ts), which governs ordinary, non-cryptographically-authenticated
// ADMIN transitions only. That shared table intentionally does NOT permit
// "canceled" -> "paid" or "failed" -> "paid" — an admin manually declaring
// a canceled/failed order "paid" with no real payment evidence must never
// be allowed. A signature-verified Stripe "succeeded" event is a
// fundamentally higher-trust signal (Stripe's own cryptographic assertion,
// independently cross-checked here against amount/currency/livemode
// BEFORE this function is ever reached) and is allowed to promote EITHER
// state to paid. This function is never used by, and never widens, the
// admin-facing transition table.
//
// PAID IS THE HIGHEST-AUTHORITY, NEVER-DOWNGRADED TERMINAL STATE:
//   succeeded: pending | failed | canceled -> paid; paid -> paid (no-op)
//   payment_failed: pending -> failed; failed/canceled stay same (no-op);
//                   paid NEVER downgrades (no-op)
//   canceled: pending | failed -> canceled; canceled stays same (no-op);
//             paid NEVER downgrades (no-op)

async function applySucceeded(
  tx: Tx,
  order: OrderRow,
  paymentIntent: Stripe.PaymentIntent,
  event: Stripe.Event,
): Promise<WebhookHandlerResult> {
  if (order.paymentStatus === "paid") {
    // Idempotent re-observation of an already-paid order — no mutation, no
    // duplicate business-audit noise (already verified the first time).
    return { kind: "processed" };
  }

  if (paymentIntent.currency !== "usd") {
    return recordAnomaly(tx, order, paymentIntent.id, event.type, "currency_mismatch");
  }

  const lines = await tx.query.orderLines.findMany({ where: eq(orderLines.orderId, order.id) });
  const authoritativeAmountCents = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);

  // Integrity check on THIS app's own frozen data — should be structurally
  // impossible for a correctly-created order, but never silently trusted.
  if (authoritativeAmountCents !== order.pricingSummary.subtotal) {
    return recordAnomaly(tx, order, paymentIntent.id, event.type, "integrity_invalid_state");
  }

  if (paymentIntent.amount_received !== authoritativeAmountCents) {
    return recordAnomaly(tx, order, paymentIntent.id, event.type, "amount_mismatch");
  }

  await tx
    .update(orders)
    .set({
      paymentStatus: "paid",
      paidAt: new Date(),
      stripePaymentStatus: paymentIntent.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await recordAuditEvent(tx, {
    adminUserId: null,
    action: "payment.succeeded",
    entityType: "order",
    entityId: order.id,
    metadata: { orderNumber: order.orderNumber, provider: "stripe", eventType: event.type },
  });

  return { kind: "processed" };
}

async function applyFailed(tx: Tx, order: OrderRow, paymentIntent: Stripe.PaymentIntent, event: Stripe.Event): Promise<WebhookHandlerResult> {
  if (order.paymentStatus === "paid") {
    // Paid is the highest authority — never downgraded by a failed event,
    // silent no-op.
    return { kind: "processed" };
  }
  if (order.paymentStatus === "failed" || order.paymentStatus === "canceled") {
    // Already in a terminal-for-this-event-type state — no-op, no
    // duplicate audit noise.
    return { kind: "processed" };
  }

  await tx
    .update(orders)
    .set({
      paymentStatus: "failed",
      paymentFailedAt: new Date(),
      stripePaymentStatus: paymentIntent.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await recordAuditEvent(tx, {
    adminUserId: null,
    action: "payment.failed",
    entityType: "order",
    entityId: order.id,
    metadata: { orderNumber: order.orderNumber, provider: "stripe", eventType: event.type },
  });

  return { kind: "processed" };
}

async function applyCanceled(tx: Tx, order: OrderRow, paymentIntent: Stripe.PaymentIntent, event: Stripe.Event): Promise<WebhookHandlerResult> {
  if (order.paymentStatus === "paid") {
    // Paid is the highest authority — never downgraded by a canceled
    // event, silent no-op.
    return { kind: "processed" };
  }
  if (order.paymentStatus === "canceled") {
    return { kind: "processed" };
  }

  // pending | failed -> canceled. No canceledAt column exists and none is
  // invented here — paymentStatus + stripePaymentStatus are the only
  // fields this transition writes, per the approved design.
  await tx
    .update(orders)
    .set({
      paymentStatus: "canceled",
      stripePaymentStatus: paymentIntent.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await recordAuditEvent(tx, {
    adminUserId: null,
    action: "payment.canceled",
    entityType: "order",
    entityId: order.id,
    metadata: { orderNumber: order.orderNumber, provider: "stripe", eventType: event.type },
  });

  return { kind: "processed" };
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<WebhookHandlerResult> {
  if (!ALLOWED_EVENT_TYPES.has(event.type)) {
    // Never inserted into stripe_webhook_events — Stripe must never be
    // asked to retry an event type this app has no opinion about, and this
    // app must never accumulate dedup rows for events it never acts on.
    return { kind: "ignored_unhandled_type" };
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const db = getDb();

  try {
    return await db.transaction(async (tx): Promise<WebhookHandlerResult> => {
      const [insertedDedup] = await tx
        .insert(stripeWebhookEvents)
        .values({ id: event.id, type: event.type, relatedOrderId: null })
        .onConflictDoNothing({ target: stripeWebhookEvents.id })
        .returning({ id: stripeWebhookEvents.id });

      if (!insertedDedup) {
        // Already durably recorded by an earlier delivery attempt (a
        // successful mutation/no-op OR a previously-committed terminal
        // anomaly) — zero mutation, zero new audit event.
        return { kind: "duplicate" };
      }

      // Order lookup is always attempted first, regardless of livemode, so
      // an anomaly's audit metadata can include a real orderNumber
      // whenever one genuinely exists. Classification (which anomaly
      // "wins") is decided AFTER this lookup, using both pieces of
      // information together — see the livemode branch below for why.
      const order = await tx.query.orders.findFirst({ where: eq(orders.stripePaymentIntentId, paymentIntent.id) });

      // Phase 23 — environment-aware, replacing the original hardcoded
      // "any livemode:true event is rejected" guard. Checked with priority
      // over "order not found": an environment/livemode problem is fully
      // explained by, and subordinate to, the mismatch itself — retrying
      // can never fix it, so it must always classify as the terminal
      // unexpected_livemode anomaly, never as the retryable order_not_found
      // (which would incorrectly imply a future retry might succeed). This
      // deliberately does NOT infer mode from any whsec_ secret prefix —
      // event.livemode, read from the already cryptographically verified
      // event body, is compared against this deployment's own resolved
      // expectation (development/preview expect livemode:false only;
      // production expects livemode:true only). An ambiguous/unresolvable
      // deployment environment is treated identically — never processable,
      // same terminal reason, since there is no expectation to safely
      // compare against either way.
      const modeExpectation = resolvePaymentModeExpectation();
      if (modeExpectation.kind === "ambiguous" || event.livemode !== modeExpectation.expectedLivemode) {
        return recordAnomaly(tx, order ?? null, paymentIntent.id, event.type, "unexpected_livemode");
      }

      if (!order) {
        // Genuinely retryable: the matching order may simply not have
        // committed yet (e.g. a webhook delivered before this app's own
        // order-creation transaction finished), or may never exist for a
        // reason a future delivery attempt can't resolve either — Stripe's
        // own retry schedule is the mechanism that gives a legitimate
        // late-arriving order a chance to be found. Throwing here rolls
        // back the ENTIRE transaction, including the dedup insert above,
        // so a retried delivery of this exact event.id remains fully
        // processable rather than being silently swallowed as a
        // "duplicate."
        throw new RetryableWebhookError("order_not_found");
      }

      // Attach the now-resolved order to the dedup row for observability
      // ("Used by"-style traceability) — non-essential, but cheap and
      // consistent with how every other reference column in this schema
      // is populated once known.
      await tx.update(stripeWebhookEvents).set({ relatedOrderId: order.id }).where(eq(stripeWebhookEvents.id, event.id));

      // Defensive integrity check — should be structurally impossible
      // given the lookup was BY stripePaymentIntentId in the first place,
      // but stated explicitly and checked, never silently assumed.
      if (order.stripePaymentIntentId !== paymentIntent.id) {
        return recordAnomaly(tx, order, paymentIntent.id, event.type, "provider_reference_mismatch");
      }

      switch (event.type) {
        case "payment_intent.succeeded":
          return applySucceeded(tx, order, paymentIntent, event);
        case "payment_intent.payment_failed":
          return applyFailed(tx, order, paymentIntent, event);
        case "payment_intent.canceled":
          return applyCanceled(tx, order, paymentIntent, event);
        default:
          // Unreachable given the ALLOWED_EVENT_TYPES guard above, but
          // TypeScript can't prove that from a Set<string> membership
          // check — never silently fall through.
          throw new RetryableWebhookError("database_error");
      }
    });
  } catch (error) {
    if (error instanceof RetryableWebhookError) {
      return { kind: "retryable", reason: error.reason };
    }
    // Never log the Error object, its message/stack, the raw event, the
    // PaymentIntent object, or any request/response detail — matches the
    // exact logging discipline handle-payment-intent.ts's own outer catch
    // already established for this same class of payment-adjacent code.
    console.error("Stripe webhook processing failed.", { eventId: event.id, category: "unexpected_error" });
    return { kind: "retryable", reason: "database_error" };
  }
}
