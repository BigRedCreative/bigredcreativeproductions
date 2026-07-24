"use client";

import { useActionState } from "react";
import { replaceMediaAssetAction } from "@/server/mutate-media";

// Uploads a NEW file under the SAME permanent asset id — the underlying
// storage key/URL change, but every product referencing this asset picks
// up the new file automatically (see queries/catalog.ts's media
// resolution). The previous file is intentionally kept in storage, not
// deleted, per Phase 15's recoverability-first replace policy.
export default function MediaReplaceForm({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(replaceMediaAssetAction.bind(null, id), null);

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
      {state && "success" in state && state.success && (
        <p className="admin-inline-success">Replaced — this asset now points at the new file everywhere it&apos;s used.</p>
      )}

      <div className="admin-form-row">
        <label>
          Replacement file
          <span className="admin-form-help">PNG, JPEG, or WebP — 8 MB max. The previous file is kept, not deleted.</span>
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        </label>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-secondary-button" disabled={isPending}>
          {isPending ? "Uploading…" : "Replace file"}
        </button>
      </div>
    </form>
  );
}
