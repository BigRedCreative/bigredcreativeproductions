"use client";

import { useActionState } from "react";
import { updateContactContentAction } from "@/server/mutate-website-content";
import type { ContactContentValue } from "@/server/queries/site-content";

export default function ContactContentForm({ initialContent }: { initialContent: ContactContentValue }) {
  const [state, formAction, isPending] = useActionState(updateContactContentAction, null);

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

      <fieldset className="admin-form-section">
        <legend>
          <h2>Contact section</h2>
        </legend>
        <p className="admin-form-section-help">
          The heading and copy shown above the contact form on the homepage. The form&apos;s own fields and service
          list aren&apos;t editable here yet.
        </p>
        <div className="admin-form-row">
          <label>
            Kicker
            <input type="text" name="kicker" defaultValue={initialContent.kicker} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Heading
            <input type="text" name="heading" defaultValue={initialContent.heading} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Description
            <textarea name="description" defaultValue={initialContent.description} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Submit button label
            <input type="text" name="submitLabel" defaultValue={initialContent.submitLabel} required />
          </label>
        </div>
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
