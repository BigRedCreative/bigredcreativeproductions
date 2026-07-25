"use client";

import { useActionState } from "react";
import { setLeadArchivedAction } from "@/server/mutate-lead";

// Mirrors ServiceArchiveToggle.tsx's exact single-fieldless-button
// pattern. archivedAt is orthogonal to status — see mutate-lead.ts's
// setLeadArchivedAction for what it does and doesn't touch.
export default function LeadArchiveToggle({ id, isArchived }: { id: string; isArchived: boolean }) {
  const [state, formAction, isPending] = useActionState(
    setLeadArchivedAction.bind(null, id, !isArchived),
    null,
  );

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
        {isPending ? "Saving…" : isArchived ? "Unarchive" : "Archive"}
      </button>
    </form>
  );
}
