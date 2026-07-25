"use client";

import { useActionState } from "react";
import { movePortfolioAction } from "@/server/mutate-portfolio";

function MoveButton({ id, direction, disabled }: { id: string; direction: "up" | "down"; disabled: boolean }) {
  const [state, formAction, isPending] = useActionState(movePortfolioAction.bind(null, id, direction), null);

  return (
    <form action={formAction} style={{ display: "inline" }}>
      {state && "errors" in state && state.errors.length > 0 && (
        <span role="alert" className="admin-form-errors">
          {state.errors[0]}
        </span>
      )}
      <button
        type="submit"
        className="admin-secondary-button"
        disabled={disabled || isPending}
        aria-label={direction === "up" ? "Move up" : "Move down"}
      >
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

// Immediate/entity-level reordering — mirrors ServiceMoveButtons.tsx
// exactly.
export default function PortfolioMoveButtons({ id, isFirst, isLast }: { id: string; isFirst: boolean; isLast: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <MoveButton id={id} direction="up" disabled={isFirst} />
      <MoveButton id={id} direction="down" disabled={isLast} />
    </div>
  );
}
