"use client";

import { useActionState, useState } from "react";
import { setLeadStatusAction } from "@/server/mutate-lead";
import { LEAD_STATUSES } from "@/data/leads";

// Status change is immediate — no draft/publish staging (leads are
// operational records, not published content; see CLAUDE.md "Leads,
// Customers, and Orders Admin"). The <select> is controlled (value +
// onChange + useState), not defaultValue-only, per the Phase 13 rule.
// Only `id` is bound (stable for the component's lifetime, the same safe
// pattern every other bound admin action in this codebase already uses);
// the actual status value is read server-side from FormData like any
// other real form field, not baked into the bound closure — a value that
// changes via local state before submission belongs in the submitted
// FormData, not in .bind().
export default function LeadStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const boundAction = setLeadStatusAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

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
        Status
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
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
