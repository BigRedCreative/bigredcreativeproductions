"use client";

import { useState } from "react";
import type { ServiceProcessStep } from "@/data/services";

function emptyStep(): ServiceProcessStep {
  return { title: "", description: "" };
}

// Repeatable title+description pair editor for Service.process — same
// add/remove/move-up-down pattern as StringListEditor, one level richer.
export default function ProcessStepsEditor({
  name,
  initialSteps,
}: {
  name: string;
  initialSteps: ServiceProcessStep[];
}) {
  const [steps, setSteps] = useState<ServiceProcessStep[]>(initialSteps.length > 0 ? initialSteps : [emptyStep()]);

  function updateStep(index: number, patch: Partial<ServiceProcessStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="admin-form-row">
      <input type="hidden" name={name} value={JSON.stringify(steps)} />
      <p className="admin-form-label-standalone">Process steps</p>
      <p className="admin-form-section-help">Shown in order on the service detail page&apos;s &quot;How it works&quot; section.</p>
      {steps.map((step, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Step {index + 1}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => moveStep(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => moveStep(index, 1)}
                disabled={index === steps.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button type="button" className="admin-remove-button" onClick={() => removeStep(index)}>
                Remove
              </button>
            </div>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Title
              <input type="text" value={step.title} onChange={(e) => updateStep(index, { title: e.target.value })} />
            </label>
            <label>
              Description
              <input
                type="text"
                value={step.description}
                onChange={(e) => updateStep(index, { description: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addStep}>
        + Add step
      </button>
    </div>
  );
}
