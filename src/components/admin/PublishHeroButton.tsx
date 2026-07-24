"use client";

import { useActionState } from "react";
import { publishHeroAction } from "@/server/mutate-website-content";

// Deliberately takes no fields of its own — publishing copies whatever is
// currently saved as the DRAFT row onto the PUBLISHED row. It only ever
// publishes content that was explicitly saved via "Save draft" first, per
// the approved Save Draft -> Preview -> Publish flow.
export default function PublishHeroButton() {
  const [state, formAction, isPending] = useActionState(publishHeroAction, null);

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
        <p className="admin-inline-success">Published — the homepage is now live with this content.</p>
      )}
      <button type="submit" className="admin-signout-button" disabled={isPending}>
        {isPending ? "Publishing…" : "Publish current draft"}
      </button>
    </form>
  );
}
