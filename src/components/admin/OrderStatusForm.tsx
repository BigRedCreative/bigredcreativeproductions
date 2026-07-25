"use client";

import { useActionState, useState } from "react";
import { setOrderStatusAction } from "@/server/mutate-order";
import { ORDER_STATUS_TRANSITIONS } from "@/data/orders";
import type { OrderStatus } from "@/data/orders";

// Only ever offers a status the fixed transition table actually allows
// from the order's current status — never an arbitrary jump. The select
// is controlled (Phase 13 rule). If the current status is terminal
// (completed/cancelled), there is nothing valid to change to, so no form
// renders at all.
export default function OrderStatusForm({ id, currentStatus }: { id: string; currentStatus: OrderStatus }) {
  const validNextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];
  const [status, setStatus] = useState<OrderStatus>(validNextStatuses[0] ?? currentStatus);
  const [state, formAction, isPending] = useActionState(setOrderStatusAction.bind(null, id), null);

  if (validNextStatuses.length === 0) {
    return <p className="admin-form-section-help">This order&apos;s status is final — no further changes are possible.</p>;
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
        Change status to
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
          {validNextStatuses.map((value) => (
            <option key={value} value={value}>
              {value.replace("-", " ")}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="admin-secondary-button" disabled={isPending}>
        {isPending ? "Saving…" : "Update status"}
      </button>
    </form>
  );
}
