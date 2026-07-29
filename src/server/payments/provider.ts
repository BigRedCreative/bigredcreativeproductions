import "server-only";

// Phase 21C-2A — the interface a payment-collection call goes through.
// Deliberately narrower than TextProvider/ImageProvider
// (src/server/brain/providers/text-provider.ts,
// src/server/creative-studio/providers/image-provider.ts) — those exist
// because Big Red Brain/Creative Studio needed a real provider SELECTION
// concept (which model, which provider) from day one. Payments do not:
// there is exactly one real-world target (a card-payment processor), no
// "modelName" concept applies.
//
// Phase 21C-2B adds the first concrete implementation
// (src/server/payments/stripe.ts) and a registry
// (src/server/payments/registry.ts). See CLAUDE.md "Payment Schema +
// Provider Abstraction (Phase 21C-2A)" and "Stripe PaymentIntent Creation
// (Phase 21C-2B)" for the full writeup.

// Small, closed vocabulary — intentionally not shared with any admin UI
// component (unlike BrainErrorCategory/ImageGenerationErrorCategory,
// which drive real dropdowns elsewhere), so it lives here rather than in
// a shared src/data/ file.
export type PaymentProviderErrorCategory =
  | "invalid_request" // the caller supplied something the provider itself rejects as malformed (never a card/customer error)
  | "provider_unavailable" // the provider's API could not be reached / returned a server-side error
  | "idempotency_conflict" // a genuine, unexpected conflict on the provider's own idempotency key
  | "provider_rate_limited"; // Phase 21C-2B — the PROVIDER is throttling US (Stripe's own rate limit), a
  // meaningfully different condition from "provider_unavailable" (Stripe down/unreachable) even
  // though both currently map to the same safe customer-facing message — kept distinct so a future
  // backoff/retry strategy can treat them differently without another interface change.

// Thrown by any PaymentProvider implementation on failure — mirrors
// TextProviderError/ImageProviderError's exact shape (a typed Error
// subclass carrying one closed-vocabulary category), so a future caller
// can map a failure onto a safe, internal representation without needing
// to know what a raw Stripe (or other processor) exception looks like.
export class PaymentProviderError extends Error {
  readonly category: PaymentProviderErrorCategory;
  constructor(message: string, category: PaymentProviderErrorCategory) {
    super(message);
    this.name = "PaymentProviderError";
    this.category = category;
  }
}

// The one operation a future full-payment initialization needs. Every
// field here is a server-owned value the caller must already have
// resolved BEFORE calling this — never something a browser supplied
// directly:
//   - orderId: this app's own permanent order id, never a client-chosen
//     value — the caller resolves it from an already-persisted, already-
//     verified order row.
//   - amountCents: read directly from that order's own frozen
//     pricingSummary/order_lines totals (src/data/orders.ts,
//     src/data/cart-pricing.ts) — a future implementation must never
//     accept this as raw request-body input from checkout; the browser
//     never supplies a price anywhere in this app's existing checkout
//     pipeline (see src/app/api/orders/route.ts), and that guarantee
//     extends here unchanged.
//   - currency: fixed, server-decided (this app has only ever dealt in
//     USD — see src/data/money.ts) — never client-selectable.
//   - idempotencyKey: server-generated (e.g. derived from the order's own
//     permanent id), never a client-submitted string — the same
//     "idempotency key originates from trusted server/session state, not
//     an arbitrary client value" principle this app's own
//     clientRequestId/orders_client_request_id_unique design already
//     established.
export type CreatePaymentIntentRequest = {
  orderId: string;
  // Included only for provider-side metadata (e.g. Stripe Dashboard
  // reconciliation) — never used for authorization, never trusted as a
  // lookup key. Not PII.
  orderNumber: string;
  amountCents: number;
  currency: "usd";
  idempotencyKey: string;
};

// Normalized, provider-agnostic result shape — never a raw SDK object.
// providerPaymentIntentId is what a caller persists onto
// orders.stripePaymentIntentId; clientSecret is the one value a future
// frontend needs to hand to a client-side payment SDK, and must never be
// logged or written to audit_log (it is short-lived and effectively a
// bearer credential for completing that one payment). livemode — Phase
// 21C-2B — is the SECOND, independent layer of the test-mode-only
// guard: even though the concrete Stripe provider already refuses to
// construct a client for anything but a test-mode secret key, every
// caller independently re-checks the value Stripe itself reports on the
// actual returned object, never trusting the key-prefix check alone.
export type CreatePaymentIntentResult = {
  provider: string;
  providerPaymentIntentId: string;
  clientSecret: string;
  status: string;
  livemode: boolean;
};

export interface PaymentProvider {
  readonly providerName: string;
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResult>;
  // Phase 21C-2B — returns null specifically and only when the provider
  // confirms the referenced PaymentIntent does not exist (Stripe's own
  // "no such payment_intent" case) — an expected, non-exceptional outcome
  // the caller must branch on explicitly (see CLAUDE.md's Case 5 /
  // "missing provider reference" design), not something folded into the
  // PaymentProviderError category system. Any other failure (network,
  // auth, rate limit, etc.) still throws PaymentProviderError as usual.
  retrievePaymentIntent(providerPaymentIntentId: string): Promise<CreatePaymentIntentResult | null>;
}
