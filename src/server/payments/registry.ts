import "server-only";
import type { PaymentProvider } from "./provider";
import { StripePaymentProvider } from "./stripe";

// Phase 21C-2B — the ONE place that decides which real payment provider
// serves a request, mirroring the exact pattern already established by
// src/server/brain/providers/registry.ts and
// src/server/creative-studio/providers/registry.ts: a closed, server-
// config-only selection, never influenced by request input, a form field,
// or an admin UI choice. v1 has exactly one entry.
//
// Constructing a StripePaymentProvider here does NOT itself require
// STRIPE_SECRET_KEY to be set or make any network call — see
// src/server/payments/stripe.ts's own lazy-client-construction comment.
// The env var is only read the first time a method on the returned
// instance is actually invoked.
export function getConfiguredPaymentProvider(): PaymentProvider {
  return new StripePaymentProvider();
}
