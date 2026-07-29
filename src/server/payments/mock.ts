import "server-only";
import { randomBytes } from "node:crypto";
import {
  PaymentProviderError,
  type PaymentProvider,
  type PaymentProviderErrorCategory,
  type CreatePaymentIntentRequest,
  type CreatePaymentIntentResult,
} from "./provider";

// Phase 21C-2B — a deterministic, network-free PaymentProvider used only by
// the automated regression test script. Lets the entire eligibility/
// idempotency/reconciliation/audit pipeline be exercised end-to-end
// without ever making a real Stripe request or requiring
// STRIPE_SECRET_KEY to be configured. Never selected by registry.ts for
// any real request — mirrors MockTextProvider/MockImageProvider's exact
// precedent (src/server/brain/providers/mock.ts,
// src/server/creative-studio/providers/mock-image.ts).
//
// Real Stripe idempotency semantics are modeled faithfully enough for
// testing purposes: the same idempotencyKey + same (amount, currency)
// returns the SAME cached result; the same key with DIFFERENT params
// throws idempotency_conflict — matching Stripe's own documented
// behavior. The in-memory store is per-instance, so a genuinely
// concurrent Promise.all sharing one MockPaymentProvider instance
// exercises the same "does the caller's own DB-level locking prevent a
// duplicate" property a real Stripe account would.
export class MockPaymentProvider implements PaymentProvider {
  readonly providerName = "mock";

  private readonly behavior: "success" | "failure";
  private readonly failureCategory: PaymentProviderErrorCategory;
  private readonly livemodeOverride: boolean;
  private readonly store = new Map<string, { result: CreatePaymentIntentResult; signature: string }>();
  private readonly missingIds = new Set<string>();
  createCallCount = 0;
  retrieveCallCount = 0;

  constructor(
    behavior: "success" | "failure" = "success",
    failureCategory: PaymentProviderErrorCategory = "provider_unavailable",
    livemodeOverride = false,
  ) {
    this.behavior = behavior;
    this.failureCategory = failureCategory;
    this.livemodeOverride = livemodeOverride;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResult> {
    this.createCallCount++;
    if (this.behavior === "failure") {
      throw new PaymentProviderError("Mock provider simulated failure.", this.failureCategory);
    }

    const signature = `${request.amountCents}:${request.currency}`;
    const existing = this.store.get(request.idempotencyKey);
    if (existing) {
      if (existing.signature !== signature) {
        throw new PaymentProviderError("Mock idempotency key reused with different parameters.", "idempotency_conflict");
      }
      return existing.result;
    }

    const id = `pi_mock_${randomBytes(8).toString("hex")}`;
    const result: CreatePaymentIntentResult = {
      provider: "mock",
      providerPaymentIntentId: id,
      clientSecret: `${id}_secret_mock`,
      status: "requires_payment_method",
      livemode: this.livemodeOverride,
    };
    this.store.set(request.idempotencyKey, { result, signature });
    return result;
  }

  async retrievePaymentIntent(providerPaymentIntentId: string): Promise<CreatePaymentIntentResult | null> {
    this.retrieveCallCount++;
    if (this.missingIds.has(providerPaymentIntentId)) return null;
    for (const { result } of this.store.values()) {
      if (result.providerPaymentIntentId === providerPaymentIntentId) return result;
    }
    return null;
  }

  // Test-only helper — simulates Case 5 (Stripe reports a previously-real
  // object as missing, e.g. deleted out-of-band).
  markAsMissingOnRetrieve(providerPaymentIntentId: string): void {
    this.missingIds.add(providerPaymentIntentId);
  }
}
