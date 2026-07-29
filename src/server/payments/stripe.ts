import "server-only";
import Stripe from "stripe";
import {
  PaymentProviderError,
  type PaymentProvider,
  type CreatePaymentIntentRequest,
  type CreatePaymentIntentResult,
} from "./provider";

// Phase 21C-2B — the ONE file in this codebase allowed to import the
// `stripe` package, mirroring the exact boundary already established for
// `openai`/`stripe`-equivalent providers elsewhere (src/server/brain/
// providers/openai.ts, src/server/creative-studio/providers/openai-image.ts).
// Nothing outside this file ever touches the Stripe SDK directly.

// Pinned explicitly — re-confirmed fresh against Stripe's own current
// changelog immediately before this implementation, not carried over from
// an earlier architecture-review guess. Re-verify again before any future
// upgrade; never left to the SDK's own "latest at install time" default.
const STRIPE_API_VERSION = "2026-06-24.dahlia";

// Deliberately explicit, never Stripe's own defaults (maxNetworkRetries: 1
// default is fine and kept, but stated on purpose per the approved
// direction; timeout: 80000ms default is far too long for a synchronous,
// user-facing checkout call).
const STRIPE_MAX_NETWORK_RETRIES = 1;
const STRIPE_TIMEOUT_MS = 20_000;

// The one place this app's own idempotency-key format is fixed. Approved:
// brcp_payment_<order-id>. Comfortably under Stripe's 255-character limit.
export function buildStripeIdempotencyKey(orderId: string): string {
  return `brcp_payment_${orderId}`;
}

function isTestModeSecretKey(key: string): boolean {
  // Real, long-standing Stripe convention: every secret key is prefixed
  // by its mode. Checked as a plain string prefix — the key's VALUE is
  // never logged, not even a truncated substring, only this boolean
  // result.
  return key.startsWith("sk_test_");
}

let cachedClient: Stripe | null = null;

// Lazy, server-only construction — mirrors src/server/brain/providers/
// openai.ts's exact pattern. Importing this file (or even constructing a
// StripePaymentProvider instance) does NOT require STRIPE_SECRET_KEY to
// be set; the env var is only read, and the client only constructed, the
// first time a method below is actually called. This is what lets this
// file exist, be type-checked, and be exercised via a MockPaymentProvider
// in tests without ever requiring a real key.
function getClient(): Stripe {
  if (cachedClient) return cachedClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Fails safely, before any network access — no key means no provider,
    // never a false "available."
    throw new PaymentProviderError("Stripe is not configured.", "provider_unavailable");
  }
  if (!isTestModeSecretKey(key)) {
    // Phase 21C-2B is TEST MODE ONLY. A live key (sk_live_...) — or
    // anything not recognizably a test key — is refused outright, before
    // a client is ever constructed and before any request could reach
    // Stripe. The key's own value is never included in this error message
    // or logged anywhere, not even a prefix substring.
    throw new PaymentProviderError(
      "Refusing to initialize the payment provider: configured key is not a recognized test-mode secret key.",
      "provider_unavailable",
    );
  }

  cachedClient = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
    timeout: STRIPE_TIMEOUT_MS,
  });
  return cachedClient;
}

// Translates a raw Stripe SDK exception into this app's own closed
// PaymentProviderErrorCategory — nothing outside this file ever sees a raw
// Stripe error type. Order matters: more specific checks first.
function mapStripeError(error: unknown): PaymentProviderError {
  if (error instanceof Stripe.errors.StripeIdempotencyError) {
    return new PaymentProviderError("Stripe idempotency key conflict.", "idempotency_conflict");
  }
  if (error instanceof Stripe.errors.StripeRateLimitError) {
    return new PaymentProviderError("Stripe is rate-limiting this account.", "provider_rate_limited");
  }
  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return new PaymentProviderError("Stripe rejected the request as invalid.", "invalid_request");
  }
  if (
    error instanceof Stripe.errors.StripeAPIError ||
    error instanceof Stripe.errors.StripeConnectionError ||
    error instanceof Stripe.errors.StripeAuthenticationError
  ) {
    return new PaymentProviderError("Stripe is temporarily unavailable.", "provider_unavailable");
  }
  // Unknown/unexpected shape — never leak the raw error to a caller;
  // still classified into the closed vocabulary, defaulting to the safest
  // (fail-closed, no-provider-implied) category.
  return new PaymentProviderError("Unexpected payment provider error.", "provider_unavailable");
}

function toResult(pi: Stripe.PaymentIntent): CreatePaymentIntentResult {
  if (typeof pi.client_secret !== "string") {
    // Structurally shouldn't happen for a freshly created/retrieved
    // PaymentIntent under default settings — treated as an anomaly rather
    // than silently returning an empty string a caller might mishandle.
    throw new PaymentProviderError("Stripe response missing client_secret.", "provider_unavailable");
  }
  return {
    provider: "stripe",
    providerPaymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    status: pi.status,
    livemode: pi.livemode,
  };
}

export class StripePaymentProvider implements PaymentProvider {
  readonly providerName = "stripe";

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResult> {
    const client = getClient();
    try {
      const pi = await client.paymentIntents.create(
        {
          amount: request.amountCents,
          currency: request.currency,
          // Phase 21C-2C — explicit, closed payment-method list, replacing
          // the earlier automatic_payment_methods config. Card-only is a
          // deliberate choice, not a placeholder: it avoids the Permissions-
          // Policy "payment" conflict (Apple Pay/Google Pay/the Payment
          // Request API all require it; this app's payment=() stays
          // untouched — see CLAUDE.md "Stripe Payment UI (Phase 21C-2C)"),
          // avoids redirect-based payment methods (so return_url is a
          // required-but-effectively-unused parameter, never a real
          // navigation in practice), and matches this codebase's standing
          // preference for a code-owned closed list over Stripe-Dashboard-
          // configurable behavior (the same reasoning behind
          // PURCHASE_MODES/PRODUCT_CATEGORIES/every other closed enum here).
          // Wallets/additional methods are a deliberately later, separately
          // scoped and separately CSP-reviewed expansion.
          payment_method_types: ["card"],
          // Minimal, non-PII metadata only — matches the approved design
          // exactly: an internal reconciliation aid for the Stripe
          // Dashboard, never customer name/email/phone/notes.
          metadata: {
            internal_order_id: request.orderId,
            order_number: request.orderNumber,
          },
        },
        { idempotencyKey: request.idempotencyKey },
      );
      return toResult(pi);
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw mapStripeError(error);
    }
  }

  async retrievePaymentIntent(providerPaymentIntentId: string): Promise<CreatePaymentIntentResult | null> {
    const client = getClient();
    try {
      const pi = await client.paymentIntents.retrieve(providerPaymentIntentId);
      return toResult(pi);
    } catch (error) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        (error as Stripe.errors.StripeInvalidRequestError).code === "resource_missing"
      ) {
        // The one, specific "does not exist" case — returned as null, not
        // thrown, per the interface's own contract (see provider.ts).
        return null;
      }
      if (error instanceof PaymentProviderError) throw error;
      throw mapStripeError(error);
    }
  }
}
