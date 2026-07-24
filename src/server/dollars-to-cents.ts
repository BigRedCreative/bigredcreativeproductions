import "server-only";

// The one place an admin-entered dollar string ("25.00") becomes
// authoritative integer cents (2500). Never store a float dollar amount —
// see CLAUDE.md's Money convention. Returns null for anything blank,
// non-numeric, negative, or absurdly large, so callers can treat "no real
// number entered" and "invalid number entered" identically — the caller
// decides whether that's fine (an optional field) or a validation error
// (a field the current pricing mode requires).
export function dollarsToCents(input: string | undefined | null): number | null {
  if (input === undefined || input === null) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;

  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
