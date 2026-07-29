import "server-only";
import { eq } from "drizzle-orm";
import { orders } from "@/db/schema";
import type { getDb } from "@/db";
import { generatePaymentAccessToken } from "./access-token";
import { isStripePaymentEligible, type EligibilityOrderInput, type EligibilityLineInput } from "./eligibility";

type Database = ReturnType<typeof getDb>;
type Executor = Pick<Database, "update">;

// Phase 21C-2B — the one place a payment access token is actually issued
// or rotated for a real order. Called from all three createOrder() code
// paths (fresh creation, the fast-path idempotent-retry branch, and the
// orders_client_request_id_unique race-recovery branch) so every path
// that can return an order to a payment-eligible checkout gets the exact
// same issue-or-rotate treatment — see CLAUDE.md's "Payment Capability
// Foundation" and "Stripe PaymentIntent Creation" write-ups for the full
// design this implements.
//
// For a NON-eligible order (inquiry/starting-price/deposit/manual/etc.),
// this is a no-op — no token is generated, no DB write happens, both
// columns stay whatever they already were (NULL for a brand-new order).
//
// For an ELIGIBLE order, every call — fresh creation or a later retry —
// generates a brand-new random token and OVERWRITES the stored hash/
// expiry. This is the approved rotation behavior: at most one valid
// token hash exists per order at any time; a previous token (if any)
// becomes invalid immediately. The raw token is returned to the caller
// exactly once and is never itself persisted, logged, or audited.
export async function issueOrRotatePaymentAccessToken(
  executor: Executor,
  order: EligibilityOrderInput & { id: string },
  lines: EligibilityLineInput[],
): Promise<string | undefined> {
  if (!isStripePaymentEligible(order, lines)) return undefined;

  const { rawToken, hash, expiresAt } = generatePaymentAccessToken();
  await executor
    .update(orders)
    .set({ paymentAccessTokenHash: hash, paymentAccessTokenExpiresAt: expiresAt })
    .where(eq(orders.id, order.id));
  return rawToken;
}
