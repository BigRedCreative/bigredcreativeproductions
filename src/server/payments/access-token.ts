import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

// Phase 21C-2B-0 — the payment capability token. clientRequestId remains
// exclusively order-creation idempotency (see src/server/create-order.ts) —
// this is a SEPARATE, purpose-built secret: whoever presents the matching
// raw token is authorized to initialize/resume payment for exactly one
// order, and nothing else. No route wires this in yet — this file is pure,
// DB-independent helper logic only, so it's fully testable without a real
// order, a real HTTP request, or any Stripe involvement.

// 32 bytes = 256 bits of entropy, the approved minimum. Hex-encoded (64
// characters, fixed length, no padding/character-set ambiguity) rather
// than base64url — simplicity was preferred over compactness here, since
// this token is never meant to appear in a URL (see verifyPaymentAccessToken's
// own doc comment) where base64url's shorter length would matter more.
const TOKEN_BYTES = 32;

// 24 hours — matches how long a real checkout/payment attempt should
// realistically need: long enough that someone who steps away mid-payment
// and returns later the same day (or overnight) isn't locked out, short
// enough that a token isn't a long-lived standing credential. Revisit
// once there's real usage data to reason from; not a load-bearing constant
// elsewhere in this codebase, so changing it later needs no migration.
export const PAYMENT_ACCESS_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  // Plain SHA-256, deliberately NOT HMAC-SHA256 with a server secret — see
  // CLAUDE.md "Payment Capability Token (Phase 21C-2B-0)" → "Hash choice"
  // for the full reasoning. Short version: HMAC-with-a-secret-pepper earns
  // its keep specifically when the hashed input has LOW entropy (a
  // password, or this codebase's own IPv4-address case — a fully
  // enumerable 32-bit space, which is exactly why hashIpForRateLimit()
  // uses HMAC). This token is the opposite case: 256 bits of
  // cryptographically random, machine-generated entropy, never chosen or
  // guessable by a human, with a search space no realistic attacker can
  // enumerate regardless of hash function. A leaked hash column here
  // cannot be reversed to the original token by any known method, with or
  // without a server-side pepper — so the pepper would add a dependency
  // (AUTH_SECRET, or a new secret) without a corresponding real-world
  // security gain for THIS specific threat model.
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export type GeneratedPaymentAccessToken = {
  // The raw token — returned to the caller ONCE, at generation time. Never
  // stored anywhere by this module; the caller is responsible for handing
  // it to the customer (a future, separately-approved order-creation
  // change) and never logging/persisting it itself.
  rawToken: string;
  // What actually gets persisted — orders.paymentAccessTokenHash.
  hash: string;
  // What actually gets persisted — orders.paymentAccessTokenExpiresAt.
  expiresAt: Date;
};

// Called once, at the moment a future payment-eligible checkout order is
// created (not wired to any real order-creation code path in this phase).
// Never called for an inquiry/manual/non-eligible order — those simply
// never call this function, leaving both DB columns NULL.
export function generatePaymentAccessToken(now: Date = new Date()): GeneratedPaymentAccessToken {
  const rawToken = randomBytes(TOKEN_BYTES).toString("hex");
  return {
    rawToken,
    hash: hashToken(rawToken),
    expiresAt: new Date(now.getTime() + PAYMENT_ACCESS_TOKEN_LIFETIME_MS),
  };
}

export type OrderPaymentAccessFields = {
  paymentAccessTokenHash: string | null;
  paymentAccessTokenExpiresAt: Date | null;
};

// Verifies a customer-presented raw token against the order row's stored
// hash/expiry. Takes an already-fetched order's own two relevant columns
// directly — deliberately not a DB-querying function itself, so it stays a
// pure, fully unit-testable function independent of any real database or
// HTTP route. A future payment-initialization endpoint (Phase 21C-2B,
// not built yet) is responsible for: fetching the order by id, calling
// this function, and — on any failure path (order not found, token
// missing, token wrong, token expired) — returning the exact same generic
// "not found" response so a wrong/missing token is never distinguishable
// from a nonexistent order.
//
// The raw token must never reach here via a URL query parameter (mirrors
// the same rule already established for Stripe's own client_secret) — a
// future route should accept it from a request body field or header only.
export function verifyPaymentAccessToken(
  order: OrderPaymentAccessFields,
  presentedRawToken: string,
  now: Date = new Date(),
): boolean {
  if (!order.paymentAccessTokenHash || !order.paymentAccessTokenExpiresAt) return false;
  if (order.paymentAccessTokenExpiresAt.getTime() < now.getTime()) return false;
  if (!presentedRawToken) return false;

  const presentedHash = hashToken(presentedRawToken);
  const stored = Buffer.from(order.paymentAccessTokenHash, "hex");
  const presented = Buffer.from(presentedHash, "hex");
  // Constant-time comparison — costs nothing and avoids any timing
  // side-channel on the comparison itself, even though the astronomical
  // size of the token's own search space already makes brute-forcing the
  // underlying secret infeasible regardless.
  if (stored.length !== presented.length) return false;
  return timingSafeEqual(stored, presented);
}
