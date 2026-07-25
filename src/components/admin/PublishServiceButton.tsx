"use client";

import { useActionState } from "react";
import { publishServiceAction } from "@/server/mutate-service";

// Deliberately takes no fields of its own — publishing copies whatever is
// currently saved in the DRAFT version onto the PUBLISHED version. Mirrors
// PublishBrandButton/PublishHeroButton's exact fieldless pattern.
export default function PublishServiceButton({ id }: { id: string }) {
  const boundAction = publishServiceAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction}>
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <p>Could not publish:</p>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state && "success" in state && state.success && (
        <p className="admin-inline-success">Published — the live site now reflects this draft.</p>
      )}
      <button type="submit" className="admin-signout-button" disabled={isPending}>
        {isPending ? "Publishing…" : "Publish current draft"}
      </button>
    </form>
  );
}
