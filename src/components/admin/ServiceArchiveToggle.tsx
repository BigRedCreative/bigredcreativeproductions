"use client";

import { useActionState } from "react";
import { setServiceArchivedAction } from "@/server/mutate-service";

// Mirrors MediaStatusToggle.tsx's exact single-fieldless-button pattern.
// "archived" is entity-level only — see mutate-service.ts's
// setServiceArchivedAction for what it does and doesn't touch.
export default function ServiceArchiveToggle({ id, status }: { id: string; status: "draft" | "published" | "archived" }) {
  const willArchive = status !== "archived";
  const [state, formAction, isPending] = useActionState(
    setServiceArchivedAction.bind(null, id, willArchive),
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
        {isPending ? "Saving…" : willArchive ? "Archive" : "Unarchive"}
      </button>
    </form>
  );
}
