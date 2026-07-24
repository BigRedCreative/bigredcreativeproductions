"use client";

import { useActionState } from "react";
import { setMediaAssetStatusAction } from "@/server/mutate-media";

export default function MediaStatusToggle({ id, status }: { id: string; status: "active" | "archived" }) {
  const nextStatus = status === "active" ? "archived" : "active";
  const [state, formAction, isPending] = useActionState(setMediaAssetStatusAction.bind(null, id, nextStatus), null);

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
        {isPending ? "Saving…" : status === "active" ? "Archive" : "Unarchive"}
      </button>
    </form>
  );
}
