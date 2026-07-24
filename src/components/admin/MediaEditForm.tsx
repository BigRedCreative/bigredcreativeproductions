"use client";

import { useActionState } from "react";
import { updateMediaAssetAction } from "@/server/mutate-media";

export default function MediaEditForm({ id, alt, caption }: { id: string; alt: string; caption: string | null }) {
  const [state, formAction, isPending] = useActionState(updateMediaAssetAction.bind(null, id), null);

  return (
    <form action={formAction} className="admin-form">
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <p>Please fix the following:</p>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state && "success" in state && state.success && <p className="admin-inline-success">Saved.</p>}

      <div className="admin-form-row">
        <label>
          Alt text
          <input type="text" name="alt" defaultValue={alt} />
        </label>
      </div>
      <div className="admin-form-row">
        <label>
          Caption
          <span className="admin-form-optional"> (optional)</span>
          <input type="text" name="caption" defaultValue={caption ?? ""} />
        </label>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
