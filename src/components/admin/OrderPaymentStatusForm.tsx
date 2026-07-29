"use client";

import { useActionState, useState } from "react";
import { setOrderPaymentStatusAction } from "@/server/mutate-order";
import { PAYMENT_STATUS_TRANSITIONS } from "@/data/orders";
import type { PaymentStatus } from "@/data/orders";

// Mirrors OrderStatusForm.tsx exactly, for the independent payment-status
// axis. Tracking only for a manual/off-platform order — no charge/refund
// API is ever called from here. Phase 21C-2D — a Stripe-linked order's
// paymentStatus is exclusively authored by the signature-verified webhook
// handler (src/server/payments/handle-stripe-webhook.ts); this component
// hides the manual form entirely for one, as a courtesy. The REAL
// enforcement is server-side, inside setOrderPaymentStatusAction itself
// (src/server/mutate-order.ts) — this UI-level hide is not the boundary.
export default function OrderPaymentStatusForm({
  id,
  currentStatus,
  stripePaymentIntentId,
}: {
  id: string;
  currentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
}) {
  const validNextStatuses = PAYMENT_STATUS_TRANSITIONS[currentStatus];
  const [status, setStatus] = useState<PaymentStatus>(validNextStatuses[0] ?? currentStatus);
  const [state, formAction, isPending] = useActionState(setOrderPaymentStatusAction.bind(null, id), null);

  if (stripePaymentIntentId !== null) {
    return <p className="admin-form-section-help">This order&apos;s payment is managed by Stripe and updates automatically.</p>;
  }

  if (validNextStatuses.length === 0) {
    return <p className="admin-form-section-help">This order&apos;s payment status is final — no further changes are possible.</p>;
  }

  return (
    <form action={formAction} className="admin-form-row admin-form-row-split">
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <label>
        Change payment status to
        <select name="paymentStatus" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
          {validNextStatuses.map((value) => (
            <option key={value} value={value}>
              {value.replace("-", " ")}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="admin-secondary-button" disabled={isPending}>
        {isPending ? "Saving…" : "Update payment status"}
      </button>
    </form>
  );
}
