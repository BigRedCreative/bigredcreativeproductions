// Phase 20A — the closed, typed Big Red Brain request vocabulary. This is
// the ONE place every brain_requests enum/constant is defined —
// src/db/schema.ts imports the TYPES (not the runtime arrays) from here for
// its $type<>() column annotations, the exact same pattern already
// established for MotionSettingsStatus/MotionIntensity/MotionPreset/
// HeroEntrance in src/data/motion.ts. Kept deliberately free of any
// drizzle-orm or server-only import so it's safe to import from CLIENT
// components (a future /admin/brain form) as well as server code.
//
// Nothing here lets the provider or the model invent a status/type value —
// every column this vocabulary backs is validated against one of these
// closed lists before a row is ever written. See CLAUDE.md's Phase 20
// architecture report: request_type/request_source/status/error_category
// are all closed enums for the same reason MotionPreset is — no path from
// AI/admin input to an arbitrary, unreviewed string reaching storage.

// Phase 20A ships READ + RECOMMEND only — every real request is a single,
// synchronous provider round trip. "pending"/"running" are deliberately NOT
// included yet; they belong to the future async ai_generation_jobs table
// (video/image generation), not this one. Adding them here before there's
// an async code path that could ever leave a row in that state would be
// exactly the kind of "model just for future flexibility" this codebase
// avoids (see CLAUDE.md's own standing "no half-finished implementations"
// rule).
export const BRAIN_REQUEST_STATUSES = ["completed", "failed"] as const;
export type BrainRequestStatus = (typeof BRAIN_REQUEST_STATUSES)[number];

// Where a request was launched FROM — the admin page/entry point, not what
// it's asking about. Drives future UI affordances (e.g. filtering request
// history by entry point) without needing to parse request_type strings.
export const BRAIN_REQUEST_SOURCES = [
  "brain_dashboard",
  "customer_detail",
  "order_detail",
  "portfolio_detail",
  "service_detail",
  "media_detail",
] as const;
export type BrainRequestSource = (typeof BRAIN_REQUEST_SOURCES)[number];

// What KIND of question/recommendation was asked — deliberately small and
// closed for v1. Each value corresponds to exactly one context-builder
// function (see CLAUDE.md's Phase 20 architecture report, "Context
// retrieval architecture") — there is no request_type that maps to a
// general-purpose "fetch anything" context shape.
export const BRAIN_REQUEST_TYPES = [
  "dashboard_question",
  "summarize_lead",
  "summarize_customer",
  "summarize_order",
  "analyze_portfolio",
  "analyze_service",
  "analyze_media",
  "recommend_website",
  "recommend_seo",
  "recommend_motion",
  "recommend_caption",
  "creative_direction",
  "video_prompt",
] as const;
export type BrainRequestType = (typeof BRAIN_REQUEST_TYPES)[number];

// What a failed request failed WITH — closed, so a future admin-facing
// error list is always a known, translatable set of labels, never a raw
// provider error string surfaced directly to the owner.
export const BRAIN_ERROR_CATEGORIES = [
  "provider_error",
  "rate_limited",
  "invalid_response",
  "timeout",
  "budget_exceeded",
  "validation_error",
] as const;
export type BrainErrorCategory = (typeof BRAIN_ERROR_CATEGORIES)[number];

// related_entity_type is an application-level polymorphic reference ONLY
// (see brain_requests' own schema comment — no fake FK exists or is
// possible here, identical to notes.entityType's documented tradeoff).
// Closing this vocabulary is a deliberate, minimal addition beyond what a
// bare "text nullable" column would give you: it's what makes "which
// context-builder does this row correspond to" a checkable fact rather
// than a convention, mirroring NOTE_ENTITY_TYPES in src/db/schema.ts.
export const BRAIN_RELATED_ENTITY_TYPES = [
  "lead",
  "customer",
  "order",
  "portfolio_project",
  "service",
  "media_asset",
] as const;
export type BrainRelatedEntityType = (typeof BRAIN_RELATED_ENTITY_TYPES)[number];

// Hard maximums for the two summary fields — application-enforced (this
// codebase never uses SQL CHECK constraints for content rules; every other
// length/shape rule already lives in TypeScript at the mutation layer, e.g.
// dollarsToCents(), validateAndNormalizeColor(), MAX_IMAGE_UPLOAD_BYTES).
// These are not simply "first N characters of the full text" — a future
// mutate-brain.ts must generate a genuinely short, safe summary and then
// additionally clamp to this length as a hard backstop, never rely on the
// clamp alone to make an unsafe summary safe.
export const BRAIN_PROMPT_SUMMARY_MAX_LENGTH = 240;
export const BRAIN_RESPONSE_SUMMARY_MAX_LENGTH = 500;

// The ONLY shape usage_metadata is ever allowed to hold — small, numeric,
// non-sensitive. No prompts, no model output, no PII, no credentials. A
// future mutate-brain.ts must build this object field-by-field from known
// provider response fields, never by spreading/forwarding a provider's raw
// usage object verbatim (which could carry additional, unreviewed keys).
//
// Cost fields are integer MICRODOLLARS (1 USD = 1,000,000 microdollars),
// not cents. GPT-5.6 Luna's real per-request cost is frequently sub-cent
// (e.g. 1,000 input + 500 output tokens ≈ $0.004), and integer cents would
// silently round that to $0 — losing real usage history. Microdollars keep
// every value an exact integer with zero rounding error at the per-token
// level, since all three published rates ($1.00 / $0.10 / $6.00 per
// million tokens) convert to a whole number of micros per token (1, 0.1,
// 6 respectively - see src/server/brain/cost.ts for why cached-vs-uncached
// input is still kept as separate, exact integer math rather than
// pre-blended). This is the same unit convention billing-grade APIs
// (Google Ads, GCP Billing) use for exactly this problem. Admin UI divides
// by 1,000,000 only at DISPLAY time — never stored as a float dollar
// amount, matching this codebase's standing Money-is-integer-cents
// convention (src/data/money.ts), just at finer granularity here since a
// whole cent is too coarse a unit for this cost range.
export type BrainUsageMetadata = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  estimatedCostMicros?: number;
  actualCostMicros?: number;
};

// $20.00 monthly warning threshold, expressed in the same integer
// microdollar unit as everything else in this system — 20 USD * 1,000,000.
export const MONTHLY_COST_WARNING_THRESHOLD_MICROS = 20_000_000;

export function isValidBrainRequestStatus(value: string): value is BrainRequestStatus {
  return (BRAIN_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isValidBrainRequestSource(value: string): value is BrainRequestSource {
  return (BRAIN_REQUEST_SOURCES as readonly string[]).includes(value);
}

export function isValidBrainRequestType(value: string): value is BrainRequestType {
  return (BRAIN_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isValidBrainErrorCategory(value: string): value is BrainErrorCategory {
  return (BRAIN_ERROR_CATEGORIES as readonly string[]).includes(value);
}

export function isValidBrainRelatedEntityType(value: string): value is BrainRelatedEntityType {
  return (BRAIN_RELATED_ENTITY_TYPES as readonly string[]).includes(value);
}
