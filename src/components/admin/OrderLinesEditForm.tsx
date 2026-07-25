"use client";

import { useActionState } from "react";
import { updateOrderLinesAction } from "@/server/mutate-order";
import OrderLineItemsEditor from "./OrderLineItemsEditor";
import type { CatalogProductOption, InitialOrderLine } from "./OrderLineItemsEditor";

type OrderLinesEditFormProps = {
  orderId: string;
  initialLines: InitialOrderLine[];
  catalogProducts: CatalogProductOption[];
};

// Only ever rendered by the edit page while the order is still "draft" —
// updateOrderLinesAction independently re-checks that server-side too, so
// this isn't the only thing preventing a non-draft order's history from
// being edited.
export default function OrderLinesEditForm({ orderId, initialLines, catalogProducts }: OrderLinesEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateOrderLinesAction.bind(null, orderId), null);

  return (
    <form action={formAction} className="admin-form">
      {state?.errors && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <p>Please fix the following:</p>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <OrderLineItemsEditor initialLines={initialLines} catalogProducts={catalogProducts} />

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save Line Items"}
        </button>
      </div>
    </form>
  );
}
