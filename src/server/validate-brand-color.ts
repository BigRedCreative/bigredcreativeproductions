import "server-only";

// The one place any admin-editable brand color gets validated, for every
// mutation in mutate-brand.ts. Accepts ONLY "#RGB" or "#RRGGBB" hex forms;
// everything else is rejected outright — no rgb()/hsl() functions, no
// color keywords, no var()/url(), no CSS expressions, nothing that could
// ever be interpreted as more than a flat color value. The database only
// ever stores the normalized 6-digit uppercase form; src/components/
// BrandTokens.tsx turns that string into a real CSS custom property via
// React's own style-object serialization — never a hand-built CSS string
// — so there is no path from a stored value to arbitrary CSS injection.

const HEX_3 = /^#([0-9a-fA-F]{3})$/;
const HEX_6 = /^#([0-9a-fA-F]{6})$/;

export type ColorValidationResult = { ok: true; normalized: string } | { ok: false; error: string };

export function validateAndNormalizeColor(value: string, label: string): ColorValidationResult {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: `${label} is required` };
  }

  const hex6 = HEX_6.exec(trimmed);
  if (hex6) {
    return { ok: true, normalized: `#${hex6[1].toUpperCase()}` };
  }

  const hex3 = HEX_3.exec(trimmed);
  if (hex3) {
    const [r, g, b] = hex3[1].split("");
    return { ok: true, normalized: `#${r}${r}${g}${g}${b}${b}`.toUpperCase() };
  }

  return {
    ok: false,
    error: `${label} must be a hex color like #D71920 or #D71 — got "${trimmed}"`,
  };
}
