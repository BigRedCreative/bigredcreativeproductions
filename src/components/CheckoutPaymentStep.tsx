"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { evaluateStripePublishableKeyMode } from "@/data/deployment-environment";

// Phase 21C-2C — Stripe Payment Element. clientSecret is passed in as a
// prop and only ever handed to Stripe's own <Elements> provider — it is
// never read out into any other state, logged, or persisted here.
// paymentAccessToken never reaches this file at all; CheckoutView.tsx
// exchanges it for clientSecret before this component is ever rendered.

// Lazy, memoized singleton — loadStripe() should be called once, outside
// render, matching Stripe's own documented pattern. Fails safely (resolves
// null) rather than throwing if the configured key is missing or does not
// match the expected mode for this deployment environment — mirrors the
// exact discipline already proven server-side in stripe.ts, applied here
// on the client's own separate credential. Phase 23 — environment-aware
// (development/preview expect pk_test_, production expects pk_live_),
// replacing the original hardcoded pk_test_-only check.
// evaluateStripePublishableKeyMode() (src/data/deployment-environment.ts)
// is the exact same centralized evaluator stripe.ts's server-side guard is
// built on (its secret-key counterpart), so client and server can never
// independently disagree about which environment this is or what "matches"
// means.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise;

  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const check = evaluateStripePublishableKeyMode(key);

  if (!check.ok || !key) {
    stripePromise = Promise.resolve(null);
    return stripePromise;
  }
  stripePromise = loadStripe(key);
  return stripePromise;
}

export type PaymentInitStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; clientSecret: string }
  | { kind: "error"; message: string };

type CheckoutPaymentStepProps = {
  amountLabel: string;
  paymentInit: PaymentInitStatus;
  onRetry: () => void;
  // Called only after Stripe's own confirmPayment() resolves without an
  // error — this is a CLIENT-SIDE signal only, never authoritative proof
  // of a completed payment. The caller (CheckoutView.tsx) must never treat
  // this as anything beyond "the customer submitted payment information
  // and Stripe accepted the attempt" — the real paymentStatus="paid"
  // transition happens exclusively via a future, verified Stripe webhook
  // (Phase 21C-2D), never from this callback.
  onConfirmed: () => void;
  // Same-origin fallback contact, matching the existing checkout-fallback
  // pattern used elsewhere in this flow.
  fallbackNote: ReactNode;
};

export default function CheckoutPaymentStep({
  amountLabel,
  paymentInit,
  onRetry,
  onConfirmed,
  fallbackNote,
}: CheckoutPaymentStepProps) {
  if (paymentInit.kind === "idle" || paymentInit.kind === "loading") {
    return (
      <div className="checkout-payment-step" aria-live="polite">
        <p>Preparing secure payment…</p>
      </div>
    );
  }

  if (paymentInit.kind === "error") {
    return (
      <div className="checkout-payment-step">
        <p className="checkout-submit-error" role="alert">
          {paymentInit.message}
        </p>
        <button type="button" className="checkout-submit-button" onClick={onRetry}>
          Retry
        </button>
        {fallbackNote}
      </div>
    );
  }

  // kind === "ready" from here on.
  return (
    <Elements stripe={getStripePromise()} options={{ clientSecret: paymentInit.clientSecret }}>
      <PaymentForm amountLabel={amountLabel} onConfirmed={onConfirmed} fallbackNote={fallbackNote} />
    </Elements>
  );
}

function PaymentForm({
  amountLabel,
  onConfirmed,
  fallbackNote,
}: {
  amountLabel: string;
  onConfirmed: () => void;
  fallbackNote: ReactNode;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handlePay(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || isConfirming) return;

    setIsConfirming(true);
    setConfirmError(null);

    // redirect: "if_required" — with the card-only payment-method
    // configuration (src/server/payments/stripe.ts), this resolves
    // in-page (including any 3D Secure challenge, shown by Stripe.js as an
    // in-page modal) in every expected case; return_url is still a
    // required parameter for confirmPayment's own contract, and reuses
    // /checkout itself rather than a dedicated route (approved design) —
    // see CheckoutView.tsx's own return-redirect detection.
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout` },
      redirect: "if_required",
    });

    if (result.error) {
      // Stripe's own error messages are designed to be shown directly to
      // customers (card declines, validation issues, etc.) — never a raw
      // exception, never anything this app invented.
      setConfirmError(result.error.message ?? "Your payment could not be processed. Please try again.");
      setIsConfirming(false);
      return;
    }

    // result.paymentIntent exists here — a CLIENT-SIDE signal only. Never
    // inspected for its own "status" as authoritative; the caller's
    // onConfirmed() always shows the same safe, non-final wording
    // regardless of the reported client-side status.
    onConfirmed();
  }

  return (
    <form className="checkout-payment-form" onSubmit={handlePay}>
      <PaymentElement />
      {confirmError && (
        <p className="checkout-submit-error" role="alert">
          {confirmError}
        </p>
      )}
      <button type="submit" className="checkout-submit-button" disabled={!stripe || !elements || isConfirming}>
        {isConfirming ? "Processing…" : `Pay ${amountLabel}`}
      </button>
      {fallbackNote}
    </form>
  );
}
