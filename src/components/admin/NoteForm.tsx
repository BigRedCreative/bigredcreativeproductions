"use client";

import { useActionState, useEffect, useRef } from "react";
import type { NoteActionState } from "@/server/notes";

type NoteFormProps = {
  action: (prevState: NoteActionState, formData: FormData) => Promise<NoteActionState>;
};

// Generic "add an internal note" form, shared by leads/customers/orders —
// the note form's shape is identical across all three entity types, only
// the bound Server Action differs (each caller passes e.g.
// addLeadNoteAction.bind(null, id)). Append-only: clears the textarea on a
// successful submit so the admin sees the note they just added appear in
// NotesList above, rather than staring at their own leftover text.
export default function NoteForm({ action }: NoteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} ref={formRef} className="admin-form-row">
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <label>
        Add an internal note
        <textarea name="body" rows={3} required />
      </label>
      <button type="submit" className="admin-secondary-button" disabled={isPending}>
        {isPending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
