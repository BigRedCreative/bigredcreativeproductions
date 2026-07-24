"use client";

import { useActionState } from "react";
import { publishBrandAction } from "@/server/mutate-brand";

// Deliberately takes no fields of its own — publishing copies whatever is
// currently saved as the DRAFT brand row (colors + logo selections) onto
// the PUBLISHED row. Only ever publishes content explicitly saved via
// "Save Draft" first, mirroring PublishHeroButton's exact pattern.
export default function PublishBrandButton() {
  const [state, formAction, isPending] = useActionState(publishBrandAction, null);

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
        <p className="admin-inline-success">Published — the live site now reflects this brand state.</p>
      )}
      <button type="submit" className="admin-signout-button" disabled={isPending}>
        {isPending ? "Publishing…" : "Publish current draft"}
      </button>
    </form>
  );
}
