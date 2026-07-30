// Phase 23 — the ONE place "which deployment environment are we running in,
// and what does that mean for Stripe" is decided. Deliberately isomorphic
// (no `server-only` import) — src/server/payments/stripe.ts,
// src/server/payments/handle-stripe-webhook.ts, and the client component
// src/components/CheckoutPaymentStep.tsx all import this exact module, so
// there is one shared definition of "development"/"preview"/"production"
// rather than three independently-maintained copies that could drift.
//
// Signal source: VERCEL_ENV (Vercel's own official, automatically-injected
// deployment-environment variable — never client-influenced, never present
// in a request). It is NOT auto-inlined into the browser bundle by Next.js
// (unlike NODE_ENV, which is), so next.config.ts mirrors its raw value into
// NEXT_PUBLIC_APP_ENV_SIGNAL at build time — a plain, non-secret string
// ("production" | "preview" | "development" | "") — for this module's own
// client-side branch to read. Nothing about the mirrored value is sensitive;
// it carries no more information than "which of three known deployment
// contexts is this."

export type DeploymentEnvironment = "development" | "preview" | "production";

// A safe, closed-vocabulary reason only — never the raw VERCEL_ENV/NODE_ENV
// string value itself, so this is always safe to include in an error
// message or audit metadata without risk of leaking anything.
export type AmbiguousEnvironmentReason = "vercel_env_unrecognized" | "vercel_env_absent_node_env_production";

export type DeploymentEnvironmentResolution =
  | { readonly kind: "resolved"; readonly environment: DeploymentEnvironment }
  | { readonly kind: "ambiguous"; readonly reason: AmbiguousEnvironmentReason };

function readRawVercelEnvSignal(): string | undefined {
  // Server (Route Handlers, Server Components, this module imported from
  // src/server/payments/*): VERCEL_ENV is a real, directly-set server
  // environment variable.
  if (typeof window === "undefined") {
    return process.env.VERCEL_ENV;
  }
  // Browser (this module imported from the "use client" CheckoutPaymentStep):
  // VERCEL_ENV itself was never inlined into this bundle — read the mirrored
  // NEXT_PUBLIC_ signal instead (see next.config.ts). An empty string means
  // "genuinely absent," mirroring the server-side `undefined` case exactly.
  return process.env.NEXT_PUBLIC_APP_ENV_SIGNAL || undefined;
}

// Centralized, single source of truth — every consumer (server key guard,
// client key guard, webhook livemode guard) calls this same function rather
// than re-deriving its own notion of "what environment is this."
export function resolveDeploymentEnvironment(): DeploymentEnvironmentResolution {
  const vercelEnv = readRawVercelEnvSignal();

  if (vercelEnv === "production") return { kind: "resolved", environment: "production" };
  if (vercelEnv === "preview") return { kind: "resolved", environment: "preview" };
  if (vercelEnv === "development") return { kind: "resolved", environment: "development" };

  if (vercelEnv === undefined) {
    // Genuinely absent VERCEL_ENV — the real local-development case (plain
    // `next dev`, no Vercel platform involved at all). Permitted ONLY when
    // NODE_ENV is not "production" — per explicit instruction, Production
    // must never be silently inferred from NODE_ENV alone, and an absent
    // VERCEL_ENV combined with NODE_ENV=production (e.g. a local
    // `next build && next start`, or some other non-Vercel production-mode
    // run) is a genuinely ambiguous combination this app cannot safely
    // resolve to any specific environment — it must fail closed for payment
    // operations rather than silently guessing either "test" or "live" mode.
    if (process.env.NODE_ENV !== "production") {
      return { kind: "resolved", environment: "development" };
    }
    return { kind: "ambiguous", reason: "vercel_env_absent_node_env_production" };
  }

  // VERCEL_ENV is set, but to something other than the three values Vercel
  // itself ever actually sets it to — never seen in practice, but a
  // malformed/unexpected value must fail closed, never be coerced into a
  // best guess.
  return { kind: "ambiguous", reason: "vercel_env_unrecognized" };
}

export type StripeKeyMode = "test" | "live";

export type PaymentModeExpectation =
  | {
      readonly kind: "resolved";
      readonly environment: DeploymentEnvironment;
      readonly stripeKeyMode: StripeKeyMode;
      // The `livemode` value every Stripe object this app inspects — a
      // webhook Event, a created/retrieved PaymentIntent — is expected to
      // report in this environment. Deliberately named for the underlying
      // Stripe concept, not for one specific consumer: both
      // handle-stripe-webhook.ts (event.livemode) and
      // handle-payment-intent.ts (PaymentIntent.livemode) compare against
      // this exact same field.
      readonly expectedLivemode: boolean;
    }
  | { readonly kind: "ambiguous"; readonly reason: AmbiguousEnvironmentReason };

// The one function every Stripe-mode-aware consumer actually calls.
// development/preview both expect TEST-mode keys and livemode:false
// objects; production expects LIVE-mode keys and livemode:true objects
// only.
export function resolvePaymentModeExpectation(): PaymentModeExpectation {
  const resolution = resolveDeploymentEnvironment();
  if (resolution.kind === "ambiguous") return resolution;

  const isProduction = resolution.environment === "production";
  return {
    kind: "resolved",
    environment: resolution.environment,
    stripeKeyMode: isProduction ? "live" : "test",
    expectedLivemode: isProduction,
  };
}

// -----------------------------------------------------------------------
// Key-mode evaluation — centralized here (not duplicated separately in
// stripe.ts and CheckoutPaymentStep.tsx) specifically so server and client
// can never independently disagree about what counts as an acceptable key
// for a given environment. Both functions are pure and side-effect-free:
// neither ever constructs a Stripe client, makes a network call, or logs
// anything — a key that fails is simply classified, never inspected beyond
// its own prefix, and the key's own value is never included in the result.
// -----------------------------------------------------------------------

export type StripeKeyCheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "missing_key" | "ambiguous_environment" | "mode_mismatch" };

function classifyKeyMode(key: string, testPrefix: string, livePrefix: string): StripeKeyMode | "unrecognized" {
  if (key.startsWith(testPrefix)) return "test";
  if (key.startsWith(livePrefix)) return "live";
  return "unrecognized";
}

function evaluateStripeKeyMode(key: string | undefined, testPrefix: string, livePrefix: string): StripeKeyCheckResult {
  const expectation = resolvePaymentModeExpectation();
  if (expectation.kind === "ambiguous") return { ok: false, reason: "ambiguous_environment" };
  if (!key) return { ok: false, reason: "missing_key" };
  const actual = classifyKeyMode(key, testPrefix, livePrefix);
  // Covers a malformed/unrecognized prefix (never equals "test" or "live"),
  // a live key outside Production, and a test key inside Production — all
  // in this one comparison.
  return actual === expectation.stripeKeyMode ? { ok: true } : { ok: false, reason: "mode_mismatch" };
}

// Used by src/server/payments/stripe.ts's getClient() before constructing
// any Stripe client — sk_test_/sk_live_.
export function evaluateStripeSecretKeyMode(key: string | undefined): StripeKeyCheckResult {
  return evaluateStripeKeyMode(key, "sk_test_", "sk_live_");
}

// Used by src/components/CheckoutPaymentStep.tsx before ever calling
// loadStripe() — pk_test_/pk_live_. The publishable key is already designed
// by Stripe to be browser-visible; this check is about correctness (right
// mode for this environment), not about hiding anything further.
export function evaluateStripePublishableKeyMode(key: string | undefined): StripeKeyCheckResult {
  return evaluateStripeKeyMode(key, "pk_test_", "pk_live_");
}
