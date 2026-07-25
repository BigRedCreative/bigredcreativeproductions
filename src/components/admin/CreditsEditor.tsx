"use client";

import { useState } from "react";
import type { ProjectCredit } from "@/data/projects";

function emptyCredit(): ProjectCredit {
  return { role: "", name: "" };
}

// Repeatable role+name pair editor for Project.credits — same
// add/remove/move-up-down pattern as ProcessStepsEditor/ResultsEditor.
export default function CreditsEditor({ name, initialCredits }: { name: string; initialCredits: ProjectCredit[] }) {
  const [credits, setCredits] = useState<ProjectCredit[]>(initialCredits);

  function updateCredit(index: number, patch: Partial<ProjectCredit>) {
    setCredits((prev) => prev.map((credit, i) => (i === index ? { ...credit, ...patch } : credit)));
  }

  function addCredit() {
    setCredits((prev) => [...prev, emptyCredit()]);
  }

  function removeCredit(index: number) {
    setCredits((prev) => prev.filter((_, i) => i !== index));
  }

  function moveCredit(index: number, direction: -1 | 1) {
    setCredits((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="admin-form-row">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(credits.filter((c) => c.role.trim() !== "" || c.name.trim() !== ""))}
      />
      <p className="admin-form-label-standalone">Credits</p>
      {credits.map((credit, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Credit {index + 1}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="admin-secondary-button" onClick={() => moveCredit(index, -1)} disabled={index === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="admin-secondary-button" onClick={() => moveCredit(index, 1)} disabled={index === credits.length - 1} aria-label="Move down">
                ↓
              </button>
              <button type="button" className="admin-remove-button" onClick={() => removeCredit(index)}>
                Remove
              </button>
            </div>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Role
              <input type="text" value={credit.role} onChange={(e) => updateCredit(index, { role: e.target.value })} />
            </label>
            <label>
              Name
              <input type="text" value={credit.name} onChange={(e) => updateCredit(index, { name: e.target.value })} />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addCredit}>
        + Add credit
      </button>
    </div>
  );
}
