"use client";

import { useActionState } from "react";
import { createManualOrderAction } from "@/server/mutate-order";
import OrderLineItemsEditor from "./OrderLineItemsEditor";
import type { CatalogProductOption } from "./OrderLineItemsEditor";

type OrderFormProps = {
  customerId: string;
  customerLabel: string;
  catalogProducts: CatalogProductOption[];
};

export default function OrderForm({ customerId, customerLabel, catalogProducts }: OrderFormProps) {
  const [state, formAction, isPending] = useActionState(createManualOrderAction, null);

  return (
    <form action={formAction} className="admin-form">
      <input type="hidden" name="customerId" value={customerId} />
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

      <p className="admin-form-section-help">Customer: {customerLabel}</p>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Line items</h2>
        </legend>
        <OrderLineItemsEditor catalogProducts={catalogProducts} />
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Creating…" : "Create Order"}
        </button>
      </div>
    </form>
  );
}
