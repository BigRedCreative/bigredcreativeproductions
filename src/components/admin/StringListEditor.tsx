"use client";

import { useState } from "react";

// Generic repeatable-string-list editor — used for Service.capabilities
// and Service.deliverables. Same add/remove/serialize-to-hidden-field
// pattern as every other admin repeatable editor (ProductOptionsEditor,
// NavigationForm), plain up/down move buttons instead of drag-and-drop.
export default function StringListEditor({
  name,
  label,
  helpText,
  initialItems,
  placeholder,
}: {
  name: string;
  label: string;
  helpText?: string;
  initialItems: string[];
  placeholder?: string;
}) {
  const [items, setItems] = useState<string[]>(initialItems);

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, ""]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="admin-form-row">
      <input type="hidden" name={name} value={JSON.stringify(items.filter((item) => item.trim() !== ""))} />
      <p className="admin-form-label-standalone">{label}</p>
      {helpText && <p className="admin-form-section-help">{helpText}</p>}
      {items.map((item, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>
              {label} {index + 1}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button type="button" className="admin-remove-button" onClick={() => removeItem(index)}>
                Remove
              </button>
            </div>
          </div>
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) => updateItem(index, e.target.value)}
          />
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addItem}>
        + Add {label.toLowerCase()}
      </button>
    </div>
  );
}
