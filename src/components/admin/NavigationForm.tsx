"use client";

import { useActionState, useState } from "react";
import { updateNavigationAction } from "@/server/mutate-website-content";

type NavItem = { label: string; href: string; enabled: boolean };
type HeaderCta = { label: string; href: string };

type NavigationFormProps = {
  initialPrimaryItems: NavItem[];
  initialHeaderCta: HeaderCta;
};

function emptyItem(): NavItem {
  return { label: "", href: "", enabled: true };
}

// Reorder is plain up/down buttons rather than drag-and-drop — a handful
// of menu items doesn't need that complexity, and array order here maps
// directly to sortOrder on save, per Phase 14 scope ("do not overcomplicate
// nested navigation").
export default function NavigationForm({ initialPrimaryItems, initialHeaderCta }: NavigationFormProps) {
  const [state, formAction, isPending] = useActionState(updateNavigationAction, null);
  const [items, setItems] = useState<NavItem[]>(initialPrimaryItems);

  function updateItem(index: number, patch: Partial<NavItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
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

      <input type="hidden" name="primaryItemsJson" value={JSON.stringify(items)} />

      <fieldset className="admin-form-section">
        <legend>
          <h2>Header menu</h2>
        </legend>
        <p className="admin-form-section-help">
          Links must be a page path (e.g. /store), a same-page section (e.g. #contact), or a full https:// address.
        </p>
        {items.map((item, index) => (
          <div className="admin-repeatable-item" key={index}>
            <div className="admin-repeatable-item-header">
              <span>Item {index + 1}</span>
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
            <div className="admin-form-row admin-form-row-split">
              <label>
                Label
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                />
              </label>
              <label>
                Link
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => updateItem(index, { href: e.target.value })}
                />
              </label>
            </div>
            <label className="admin-form-checkbox-row">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => updateItem(index, { enabled: e.target.checked })}
              />
              Show this link
            </label>
          </div>
        ))}
        <button type="button" className="admin-add-button" onClick={addItem}>
          + Add menu item
        </button>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Header button</h2>
        </legend>
        <p className="admin-form-section-help">The highlighted button on the right side of the header.</p>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Label
            <input type="text" name="headerCtaLabel" defaultValue={initialHeaderCta.label} required />
          </label>
          <label>
            Link
            <input type="text" name="headerCtaHref" defaultValue={initialHeaderCta.href} required />
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
