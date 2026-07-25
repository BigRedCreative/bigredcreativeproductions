"use client";

import { useActionState } from "react";
import { setPortfolioArchivedAction } from "@/server/mutate-portfolio";

// Mirrors ServiceArchiveToggle.tsx's exact single-fieldless-button
// pattern. "archived" is entity-level only.
export default function PortfolioArchiveToggle({ id, status }: { id: string; status: "draft" | "published" | "archived" }) {
  const willArchive = status !== "archived";
  const [state, formAction, isPending] = useActionState(
    setPortfolioArchivedAction.bind(null, id, willArchive),
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
