"use client";

import { useActionState } from "react";
import { uploadMediaAction } from "@/server/mutate-media";

// PNG/JPEG/WebP only, 8 MB max — enforced server-side in
// validate-media-upload.ts; the `accept` attribute here is just a UX
// hint for the file picker, never trusted as the real check.
export default function MediaUploadForm() {
  const [state, formAction, isPending] = useActionState(uploadMediaAction, null);

  return (
    <form action={formAction} className="admin-upload-form">
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

      <div className="admin-upload-row">
        <label>
          Image file
          <span className="admin-form-help">PNG, JPEG, or WebP — 8 MB max.</span>
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        </label>
        <label>
          Alt text
          <span className="admin-form-optional"> (encouraged — describes what the image shows)</span>
          <input type="text" name="alt" placeholder="Describe the image" />
        </label>
        <label>
          Caption
          <span className="admin-form-optional"> (optional)</span>
          <input type="text" name="caption" />
        </label>
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
