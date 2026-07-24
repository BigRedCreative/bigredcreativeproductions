"use client";

// A color-picker input paired with a readable hex text field, kept in
// sync — the admin never has to type or understand a CSS variable name,
// per Phase 16's requirement. The native <input type="color"> only
// accepts a full 6-digit "#rrggbb" value, so it's driven by the current
// value whenever that value is a valid 6-digit hex; the text field stays
// free-typing (accepts #RGB too) and is what actually gets submitted —
// server-side validate-brand-color.ts is still the authoritative check.
export default function ColorField({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const isFullHex = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <label>
      {label}
      <div className="admin-color-field">
        <input
          type="color"
          value={isFullHex ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#D71920"
          maxLength={7}
        />
      </div>
    </label>
  );
}
