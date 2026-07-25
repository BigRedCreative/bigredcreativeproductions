"use client";

import { useState } from "react";
import type { ProjectResult } from "@/data/projects";

function emptyResult(): ProjectResult {
  return { label: "", value: "" };
}

// Repeatable label+value pair editor for Project.results — same
// add/remove/move-up-down pattern as ProcessStepsEditor.
export default function ResultsEditor({ name, initialResults }: { name: string; initialResults: ProjectResult[] }) {
  const [results, setResults] = useState<ProjectResult[]>(initialResults);

  function updateResult(index: number, patch: Partial<ProjectResult>) {
    setResults((prev) => prev.map((result, i) => (i === index ? { ...result, ...patch } : result)));
  }

  function addResult() {
    setResults((prev) => [...prev, emptyResult()]);
  }

  function removeResult(index: number) {
    setResults((prev) => prev.filter((_, i) => i !== index));
  }

  function moveResult(index: number, direction: -1 | 1) {
    setResults((prev) => {
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
        value={JSON.stringify(results.filter((r) => r.label.trim() !== "" || r.value.trim() !== ""))}
      />
      <p className="admin-form-label-standalone">Results</p>
      <p className="admin-form-section-help">Optional — only include real, confirmed outcomes. Never invented.</p>
      {results.map((result, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Result {index + 1}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="admin-secondary-button" onClick={() => moveResult(index, -1)} disabled={index === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="admin-secondary-button" onClick={() => moveResult(index, 1)} disabled={index === results.length - 1} aria-label="Move down">
                ↓
              </button>
              <button type="button" className="admin-remove-button" onClick={() => removeResult(index)}>
                Remove
              </button>
            </div>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Value
              <span className="admin-form-optional"> — the big number, e.g. &quot;3x&quot;</span>
              <input type="text" value={result.value} onChange={(e) => updateResult(index, { value: e.target.value })} />
            </label>
            <label>
              Label
              <span className="admin-form-optional"> — what it measures, e.g. &quot;Engagement growth&quot;</span>
              <input type="text" value={result.label} onChange={(e) => updateResult(index, { label: e.target.value })} />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addResult}>
        + Add result
      </button>
    </div>
  );
}
