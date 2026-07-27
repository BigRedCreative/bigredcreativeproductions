import "server-only";

// Phase 21C-2A — the interface a future payment-collection call would go
// through. Deliberately narrower than TextProvider/ImageProvider
// (src/server/brain/providers/text-provider.ts,
// src/server/creative-studio/providers/image-provider.ts) — those exist
// because Big Red Brain/Creative Studio needed a real provider SELECTION
// concept (which model, which provider) from day one. Payments do not:
// there is exactly one real-world target (a card-payment processor), no
// "modelName" concept applies, and no registry/selection function is
// created here — see the module-level note at the bottom of this file for
// why a registry is deliberately deferred to Phase 21C-2B rather than
// added now "for symmetry."
//
// NO CONCRETE IMPLEMENTATION EXISTS YET. Nothing in this codebase imports
// the `stripe` package (it is not installed), and nothing calls any
// method described here. This file exists purely so Phase 21C-2B has a
// reviewed, stable contract to implement against — see CLAUDE.md "Payment
// Schema + Provider Abstraction (Phase 21C-2A)" for the full writeup.

// Small, closed vocabulary — intentionally not shared with any admin UI
// component (unlike BrainErrorCategory/ImageGenerationErrorCategory,
// which drive real dropdowns elsewhere), so it lives here rather than in
// a shared src/data/ file. Kept minimal on purpose: a real implementation
// (21C-2B) may find it needs to refine this after actually mapping a real
// SDK's error shapes onto it — this is a first-pass contract, not a
// finished taxonomy.
export type PaymentProviderErrorCategory =
  | "invalid_request" // the caller supplied something the provider itself rejects as malformed (never a card/customer error)
  | "provider_unavailable" // the provider's API could not be reached / returned a server-side error
  | "idempotency_conflict"; // a genuine, unexpected conflict on the provider's own idempotency key

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
  amountCents: number;
  currency: "usd";
  idempotencyKey: string;
};

// Normalized, provider-agnostic result shape — never a raw SDK object.
// providerPaymentIntentId is what a future implementation would persist
// onto orders.stripePaymentIntentId; clientSecret is the one value a
// future frontend needs to hand to a client-side payment SDK, and must
// never be logged or written to audit_log (it is short-lived and
// effectively a bearer credential for completing that one payment).
export type CreatePaymentIntentResult = {
  provider: string;
  providerPaymentIntentId: string;
  clientSecret: string;
  status: string;
};

export interface PaymentProvider {
  readonly providerName: string;
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResult>;
}

// No registry file (e.g. a getConfiguredPaymentProvider()) exists in this
// phase, unlike TextProvider/ImageProvider's own registry.ts files.
// Those registries exist to make a real, already-implemented concrete
// provider selectable purely from server config. Since NO concrete
// PaymentProvider implementation exists yet — creating one now would mean
// either (a) a registry function with nothing real to return, or (b) a
// registry that silently imports/constructs a real Stripe client ahead of
// approval, exactly what Phase 21C-2A's scope explicitly prohibits.
// Symmetry with the Brain/Creative Studio pattern is deliberately not
// pursued for its own sake here — the registry is Phase 21C-2B's first
// deliverable, once a concrete implementation actually exists to select.
