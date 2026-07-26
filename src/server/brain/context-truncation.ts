import "server-only";
import { sanitizeForStorage, truncateAtWordBoundary } from "./safe-summary";

// Phase 20B — defensive per-field truncation for entity/business content
// entering AI context, applied BEFORE prompt construction (never after —
// truncating post-hoc would mean an oversized field already reached
// buildUserPrompt() and the provider). Named constants, deterministic
// word-boundary truncation (reusing safe-summary.ts's exact primitives) —
// never "silently allow arbitrarily large entity context," per the
// approved Phase 20B decision. These limits apply ONLY to human-readable
// text fields placed into AI context — never to database ids, which are
// used for lookups/relatedEntityId and must never be truncated.

// A short field — titles, single-line labels, SEO title/description,
// individual gallery alt text, individual result/credit values.
export const MAX_CONTEXT_SHORT_FIELD_LENGTH = 200;

// A longer prose field — Portfolio/Service summary, individual process
// step descriptions.
export const MAX_CONTEXT_MEDIUM_FIELD_LENGTH = 400;

// The longest field this system ever sends — Portfolio/Service
// fullDescription, the one field genuinely likely to run long.
export const MAX_CONTEXT_LONG_FIELD_LENGTH = 800;

// Caps how many items from a repeatable list (capabilities, deliverables,
// gallery alt texts, results) are ever included — an entity with an
// unusually long list still produces a bounded context, not an
// unboundedly growing one.
export const MAX_CONTEXT_LIST_ITEMS = 10;

// Sanitize (strip HTML-like tags/code fences/control characters) THEN
// truncate at a word boundary — mirrors buildResponseSummary()'s own
// "sanitize before clamp" discipline exactly, applied here to admin-
// authored business content instead of AI output.
export function truncateContextField(text: string, maxLength: number): string {
  return truncateAtWordBoundary(sanitizeForStorage(text), maxLength);
}

// Caps array length only — each surviving item must still be truncated
// individually via truncateContextField() by the caller.
export function capContextList<T>(items: readonly T[]): T[] {
  return items.slice(0, MAX_CONTEXT_LIST_ITEMS);
}
