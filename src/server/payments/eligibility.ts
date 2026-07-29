import "server-only";

// Phase 21C-2B — the one place "is this order allowed to go through the
// Stripe payment-intent flow" is decided. Pure, DB-independent function —
// the caller is responsible for fetching the order/lines first; this file
// never queries anything itself, so it's fully unit-testable with plain
// objects (mirroring src/server/payments/access-token.ts's own pattern).
// The browser never influences this decision — every field checked here
// comes from an already-persisted, server-fetched order/line row.

// Stripe's own documented USD minimum. A structural, not provider-network,
// check — rejecting a too-small order before ever attempting a provider
// call. Re-verify against Stripe's current published minimums if this
// value is ever revisited; confirmed fresh immediately before this
// implementation (see CLAUDE.md's Phase 21C-2B writeup).
export const STRIPE_USD_MINIMUM_CENTS = 50;

// Only these three paymentStatus values are ever eligible for the
// Stripe-linked flow: "unpaid" (never attempted), "pending" (resume an
// existing PaymentIntent), "failed" (retry after a decline). Every other
// value — "paid"/"canceled"/"deposit-paid"/"paid-in-full"/"refunded" — is
// deliberately excluded: a paid or canceled order has nothing to resume,
// and the two manual-order values never apply to a checkout-sourced order
// in the first place (source must be "checkout" — see below).
const ELIGIBLE_PAYMENT_STATUSES = new Set(["unpaid", "pending", "failed"]);

export type EligibilityOrderInput = {
  source: string;
  paymentStatus: string;
  pricingSummary: { hasEstimatedPricing: boolean; depositDue: number; subtotal: number };
};

export type EligibilityLineInput = {
  purchaseMode: string;
};

export function isStripePaymentEligible(order: EligibilityOrderInput, lines: EligibilityLineInput[]): boolean {
  if (order.source !== "checkout") return false;
  if (!ELIGIBLE_PAYMENT_STATUSES.has(order.paymentStatus)) return false;
  if (order.pricingSummary.hasEstimatedPricing) return false;
  if (order.pricingSummary.depositDue > 0) return false;
  if (lines.length === 0) return false;
  if (!Number.isInteger(order.pricingSummary.subtotal) || order.pricingSummary.subtotal < STRIPE_USD_MINIMUM_CENTS) return false;
  return lines.every((line) => line.purchaseMode === "fixed-price" || line.purchaseMode === "full-payment");
}
