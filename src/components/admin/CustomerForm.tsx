"use client";

import { useActionState } from "react";
import type { CustomerFormState } from "@/server/mutate-customer";

type CustomerFormProps = {
  action: (prevState: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  initialCustomer?: { firstName: string; lastName: string; email: string; phone: string | null; company: string | null };
  fromLeadId?: string;
  submitLabel: string;
};

// No <select> elements here — every field is plain text/email/tel, so
// defaultValue-only is fine (the Phase 13 controlled-select rule applies
// specifically to <select>, not <input>/<textarea>). Shared by both create
// (optionally prefilled from a lead) and edit (prefilled from the existing
// customer).
export default function CustomerForm({ action, initialCustomer, fromLeadId, submitLabel }: CustomerFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="admin-form">
      {fromLeadId && <input type="hidden" name="fromLeadId" value={fromLeadId} />}
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

      <div className="admin-form-row admin-form-row-split">
        <label>
          First name
          <input type="text" name="firstName" defaultValue={initialCustomer?.firstName} required />
        </label>
        <label>
          Last name
          <span className="admin-form-optional"> (optional)</span>
          <input type="text" name="lastName" defaultValue={initialCustomer?.lastName} />
        </label>
      </div>

      <div className="admin-form-row">
        <label>
          Email
          <input type="email" name="email" defaultValue={initialCustomer?.email} required />
        </label>
      </div>

      <div className="admin-form-row admin-form-row-split">
        <label>
          Phone
          <span className="admin-form-optional"> (optional)</span>
          <input type="tel" name="phone" defaultValue={initialCustomer?.phone ?? undefined} />
        </label>
        <label>
          Company
          <span className="admin-form-optional"> (optional)</span>
          <input type="text" name="company" defaultValue={initialCustomer?.company ?? undefined} />
        </label>
      </div>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
