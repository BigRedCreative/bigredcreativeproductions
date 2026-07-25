"use client";

import { useActionState } from "react";
import { linkExistingCustomerAction } from "@/server/mutate-lead-customer";

// One button per search result row on the lead detail page's "Link
// Existing Customer" search — mirrors LeadArchiveToggle's exact
// single-fieldless-button pattern. Only `leadId`/`customerId` are bound
// (both stable for the row's lifetime); nothing about the customer's
// name/email is baked into the action itself.
export default function LinkCustomerButton({ leadId, customerId }: { leadId: string; customerId: string }) {
  const [state, formAction, isPending] = useActionState(linkExistingCustomerAction.bind(null, leadId, customerId), null);

  return (
    <form action={formAction}>
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="submit" className="admin-secondary-button" disabled={isPending}>
        {isPending ? "Linking…" : "Link this customer"}
      </button>
    </form>
  );
}
