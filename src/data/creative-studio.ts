// Phase 20C-1 — AI Creative Studio foundation (image generation). Shared
// closed vocabularies and the CreativeBrief shape, kept here (not in
// schema.ts) so they stay safely importable from a future client
// component (the Creative Studio admin form) without pulling drizzle-orm
// into a client bundle — the exact same ServiceImage/ProjectImage/
// MotionPreset pattern already used throughout this codebase. schema.ts
// imports ONLY the types below for its column $type<>() annotations; the
// runtime arrays here are the single source of truth for server-side
// validation (not yet built this phase — this file is schema-support
// only, per the approved "database/schema portion only" scope).

export const CREATIVE_TASK_PRESETS = [
  "social_graphic",
  "branding_visual",
  "packaging_concept",
  "product_promo",
  "event_promo",
  "website_visual",
  "portfolio_visual",
  "custom",
] as const;
export type CreativeTaskPreset = (typeof CREATIVE_TASK_PRESETS)[number];

// Deliberately excludes "customer" | "order" | "lead" — image-generation
// context sources are never PII-bearing business records, per approval.
export const CREATIVE_CONTEXT_SOURCE_TYPES = ["brand", "portfolio", "service", "media_asset"] as const;
export type CreativeContextSourceType = (typeof CREATIVE_CONTEXT_SOURCE_TYPES)[number];

export const IMAGE_GENERATION_PROVIDERS = ["openai"] as const;
export type ImageGenerationProvider = (typeof IMAGE_GENERATION_PROVIDERS)[number];

// PROVISIONAL v1 model — re-verify against current, official OpenAI
// documentation immediately before implementation (models/pricing move
// fast; this value was last confirmed 2026-07-26). Not a hardcoded price,
// just the model identifier string this schema's `model` column accepts.
export const IMAGE_GENERATION_MODELS = ["gpt-image-1.5"] as const;
export type ImageGenerationModel = (typeof IMAGE_GENERATION_MODELS)[number];

export const IMAGE_ASPECT_RATIOS = ["square", "portrait", "landscape"] as const;
export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

// The literal provider size string stored on ai_generation_jobs.requestedSize
// — square/portrait/landscape (above) is the owner-facing label; this is
// the exact value sent to the image provider.
export const IMAGE_GENERATION_SIZES = ["1024x1024", "1024x1536", "1536x1024"] as const;
export type ImageGenerationSize = (typeof IMAGE_GENERATION_SIZES)[number];

// v1 allowlist — "high" deliberately excluded per approval (5-25x the
// cost of "low", not yet justified for a brand-new, unproven capability).
export const IMAGE_GENERATION_QUALITIES = ["low", "medium"] as const;
export type ImageGenerationQuality = (typeof IMAGE_GENERATION_QUALITIES)[number];

// Closed to exactly these two, mirroring brain_requests.status exactly —
// the provider call this table represents is a single synchronous HTTP
// round trip (OpenAI's Images API has no polling/webhook step), so there
// is no 'queued'/'running' state this system ever actually observes.
// 'saved' is deliberately NOT a status value — see ai_generation_jobs'
// own table comment in schema.ts for why that stays a derived fact
// (outputMediaAssetId IS NOT NULL) instead.
export const IMAGE_GENERATION_STATUSES = ["completed", "failed"] as const;
export type ImageGenerationStatus = (typeof IMAGE_GENERATION_STATUSES)[number];

export const IMAGE_GENERATION_ERROR_CATEGORIES = [
  "provider_error",
  "rate_limited",
  "timeout",
  "moderation_blocked",
  "invalid_response",
  "budget_exceeded",
  "validation_error",
] as const;
export type ImageGenerationErrorCategory = (typeof IMAGE_GENERATION_ERROR_CATEGORIES)[number];

// The structured creative brief actually sent to the image provider —
// never a raw, unstructured prompt string assembled straight from browser
// input. Every field is bounded/sanitized before storage (server-side,
// not yet built this phase).
//
// textToRender is set ONLY from the owner's own "Text to Render" form
// field and is never writable by the brief-structuring text-AI step — a
// STRUCTURAL guarantee, not just a prompt instruction, that AI can never
// invent business copy, prices, quotes, or claims and have them rendered
// into an image as fact.
export type CreativeBrief = {
  taskPreset: CreativeTaskPreset;
  objective: string;
  subject: string;
  brandDirection: string;
  visualStyle: string;
  composition: string;
  textToRender: string | null;
  requiredElements: string[];
  avoidElements: string[];
  aspectRatio: ImageAspectRatio;
  referenceMediaAssetIds: string[];
  additionalDirection: string | null;
};

// Mirrors BrainUsageMetadata's exact shape/unit (integer microdollars,
// 1 USD = 1,000,000 micros) but stays a SEPARATE type — image spend is
// tracked independently from Big Red Brain's own text-request accounting,
// per approval ("keep existing Brain text accounting separate but
// compatible").
export type ImageGenerationUsageMetadata = {
  estimatedCostMicros?: number;
  actualCostMicros?: number;
};

// --- Implementation-phase additions (Phase 20C-1 build) -------------------

// The owner-facing aspect-ratio label is what the client ever sends; this
// fixed, server-owned mapping (never client-suppliable) is what turns it
// into the literal provider size string. Confirmed against the officially
// supported GPT Image model sizes (developers.openai.com/api/docs/models/
// gpt-image-1.5, 2026-07-26) — 1024x1024 / 1024x1536 / 1536x1024 are the
// only three standard sizes these models accept.
export const IMAGE_SIZE_BY_ASPECT_RATIO: Record<ImageAspectRatio, ImageGenerationSize> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
};

// Official per-image pricing for gpt-image-1.5, confirmed directly against
// developers.openai.com/api/docs/models/gpt-image-1.5 on 2026-07-26 (the
// page's own "Pricing per Image" table — NOT a third-party tracker, NOT
// estimated from the separate per-token image-pricing figures also shown
// on that page, which OpenAI's own pricing page explicitly says NOT to use
// for image-generation cost estimates in favor of this flat table).
// "high" quality is intentionally absent — v1 never requests it.
// USD, converted to integer MICRODOLLARS at authoring time — this file
// never does floating-point dollar math at read time.
export const IMAGE_GENERATION_COST_TABLE_MICROS: Record<ImageGenerationQuality, Record<ImageGenerationSize, number>> = {
  low: {
    "1024x1024": 9_000, // $0.009
    "1024x1536": 13_000, // $0.013
    "1536x1024": 13_000, // $0.013
  },
  medium: {
    "1024x1024": 34_000, // $0.034
    "1024x1536": 50_000, // $0.05
    "1536x1024": 50_000, // $0.05
  },
};

// --- CreativeBrief field bounds — every string/list field is sanitized,
// truncated, and bounded server-side before it can ever reach
// ai_generation_jobs.brief. Mirrors context-truncation.ts's exact
// discipline (short/medium field tiers + a bounded list length), sized for
// a creative brief's own fields rather than reused directly, since the
// values differ (a brief field is a short creative-direction phrase, not a
// paragraph of business copy).
export const MAX_BRIEF_SHORT_FIELD_LENGTH = 150; // objective
export const MAX_BRIEF_MEDIUM_FIELD_LENGTH = 400; // subject/brandDirection/visualStyle/composition/additionalDirection
export const MAX_BRIEF_TEXT_TO_RENDER_LENGTH = 200; // rendered-in-image text stays short by nature
export const MAX_BRIEF_LIST_ITEMS = 8; // requiredElements / avoidElements
export const MAX_BRIEF_LIST_ITEM_LENGTH = 100;

// Reference-media and variation bounds — enforced server-side, never just
// a disabled UI control (see src/server/creative-studio/generate-image.ts).
export const MAX_REFERENCE_MEDIA_ASSETS = 4;
export const MAX_VARIATIONS_PER_BRIEF = 4;

// Cost/abuse guardrails — conservative v1 starting points, per approval.
// Mirrors DAILY_BRAIN_REQUEST_CAP's exact reasoning (prevents an unbounded
// loop/bug from silently running up real spend before a human notices),
// but tracked on its OWN counter (ai_generation_jobs, not brain_requests)
// — image spend stays independently trackable from Big Red Brain's text
// spend, per approval.
export const DAILY_IMAGE_GENERATION_CAP = 10;
export const MONTHLY_IMAGE_COST_WARNING_THRESHOLD_MICROS = 15_000_000; // $15.00, warning only

export function isValidCreativeTaskPreset(value: string): value is CreativeTaskPreset {
  return (CREATIVE_TASK_PRESETS as readonly string[]).includes(value);
}

export function isValidCreativeContextSourceType(value: string): value is CreativeContextSourceType {
  return (CREATIVE_CONTEXT_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isValidImageAspectRatio(value: string): value is ImageAspectRatio {
  return (IMAGE_ASPECT_RATIOS as readonly string[]).includes(value);
}

export function isValidImageGenerationQuality(value: string): value is ImageGenerationQuality {
  return (IMAGE_GENERATION_QUALITIES as readonly string[]).includes(value);
}

export function isValidImageGenerationStatus(value: string): value is ImageGenerationStatus {
  return (IMAGE_GENERATION_STATUSES as readonly string[]).includes(value);
}

export function isValidImageGenerationErrorCategory(value: string): value is ImageGenerationErrorCategory {
  return (IMAGE_GENERATION_ERROR_CATEGORIES as readonly string[]).includes(value);
}
