// Phase 19D-1 — the closed, typed motion vocabulary. This is the ONE place
// every motion enum/constant/fallback is defined — src/db/schema.ts imports
// the TYPES (not the runtime arrays) from here for its $type<>() column
// annotations, the exact same pattern already established for
// ServiceImage/ProjectImage. Kept deliberately free of any drizzle-orm or
// server-only import so it's safe to import from CLIENT components (the
// admin motion form, MotionSection) as well as server code.
//
// Nothing here is a raw CSS value, transform, duration, or easing curve —
// every exported value is a closed enum string. This is the actual
// security/safety boundary described in CLAUDE.md's Phase 19D architecture
// report: there is no path from admin input (or a future Big Red Brain
// suggestion) to arbitrary CSS, only ever one of these known values.

export const MOTION_SETTINGS_STATUSES = ["draft", "published"] as const;
export type MotionSettingsStatus = (typeof MOTION_SETTINGS_STATUSES)[number];

export const MOTION_INTENSITIES = ["subtle", "standard", "bold"] as const;
export type MotionIntensity = (typeof MOTION_INTENSITIES)[number];

// The one generic preset vocabulary shared by every non-hero animatable
// section. "none" is a real, explicit choice — every row always carries an
// explicit value for every section, never an ambiguous null.
export const MOTION_PRESETS = [
  "none",
  "fade",
  "fade_up",
  "fade_down",
  "slide_left",
  "slide_right",
  "scale_in",
  "reveal",
] as const;
export type MotionPreset = (typeof MOTION_PRESETS)[number];

// Hero gets its OWN small, separate option set — deliberately NOT the
// generic MOTION_PRESETS list. "cinematic_reveal" coordinates several
// named elements (badges, headline, tagline, CTA) as one sequence, not a
// single-element preset, so exposing the full generic list to Hero would
// let it be set to something (e.g. "slide_left") that was never designed
// for a multi-part entrance.
export const HERO_ENTRANCE_OPTIONS = ["none", "cinematic_reveal"] as const;
export type HeroEntrance = (typeof HERO_ENTRANCE_OPTIONS)[number];

export type MotionSettings = {
  intensity: MotionIntensity;
  heroEntrance: HeroEntrance;
  servicesPreset: MotionPreset;
  servicesStagger: boolean;
  statementPreset: MotionPreset;
  portfolioPreset: MotionPreset;
  portfolioStagger: boolean;
  studioPreset: MotionPreset;
  processPreset: MotionPreset;
  processStagger: boolean;
};

// The fallback used whenever a motion_settings row is missing/unreachable
// — MUST match the approved initial seed exactly, so a missing database
// row and a freshly-seeded one render identically.
export const MOTION_SETTINGS_FALLBACK: MotionSettings = {
  intensity: "standard",
  heroEntrance: "none",
  servicesPreset: "fade_up",
  servicesStagger: true,
  statementPreset: "reveal",
  portfolioPreset: "fade_up",
  portfolioStagger: true,
  studioPreset: "fade_up",
  processPreset: "fade_up",
  processStagger: true,
};

export function isValidMotionIntensity(value: string): value is MotionIntensity {
  return (MOTION_INTENSITIES as readonly string[]).includes(value);
}

export function isValidMotionPreset(value: string): value is MotionPreset {
  return (MOTION_PRESETS as readonly string[]).includes(value);
}

export function isValidHeroEntrance(value: string): value is HeroEntrance {
  return (HERO_ENTRANCE_OPTIONS as readonly string[]).includes(value);
}

// Narrowing helpers used at the READ boundary (queries/motion.ts) so an
// unexpected/stale raw string stored in Neon can never flow past this
// point into a data-motion attribute — it silently narrows to the inert
// "none"/"standard" default instead. This is what "invalid database
// values must never flow into arbitrary CSS" means in practice: the
// narrowing happens once, centrally, not scattered across every reader.
export function normalizeMotionPreset(value: string | null | undefined): MotionPreset {
  return value && isValidMotionPreset(value) ? value : "none";
}

export function normalizeMotionIntensity(value: string | null | undefined): MotionIntensity {
  return value && isValidMotionIntensity(value) ? value : "standard";
}

export function normalizeHeroEntrance(value: string | null | undefined): HeroEntrance {
  return value && isValidHeroEntrance(value) ? value : "none";
}
