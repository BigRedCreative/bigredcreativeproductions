// Standard WCAG 2.x relative-luminance contrast ratio — pure math, no
// dependency. Used client-side by BrandForm to show non-blocking "this
// combination is low contrast" warnings while an admin picks colors. Only
// accepts full 6-digit "#RRGGBB" (BrandForm always normalizes to this
// shape before calling in); returns null for anything else rather than
// throwing, since a warning calculation should never break the form.

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

// Returns the WCAG contrast ratio (1–21) between two hex colors, or null
// if either value isn't a valid 6-digit hex.
export function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA for normal text — the single threshold this admin uses for all
// three checked pairs (text/background, muted-text/background,
// button-text/button-background). Informational only, never blocking.
export const WCAG_AA_MINIMUM_CONTRAST = 4.5;
