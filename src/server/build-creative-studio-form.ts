import "server-only";
import type { RawCreativeBriefInput } from "@/server/creative-studio/brief";

// Phase 20C-1 — the untrusted-FormData-to-candidate-shape boundary for
// Creative Studio, mirroring build-product-form.ts/build-service-form.ts's
// exact split from business validation: this file does shape parsing
// ONLY (pulling raw strings out of a FormData object) — it never decides
// whether anything is valid. That happens in
// src/server/creative-studio/brief.ts's buildAndValidateBrief() and
// src/server/creative-studio/generate-image.ts, which independently
// re-run against whatever this parses, every time, never trusting a
// previous parse.

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getNullableString(formData: FormData, key: string): string | null {
  const value = getString(formData, key).trim();
  return value ? value : null;
}

export function parseRawCreativeBriefInput(formData: FormData): RawCreativeBriefInput {
  return {
    taskPreset: getString(formData, "taskPreset"),
    objective: getString(formData, "objective"),
    subject: getString(formData, "subject"),
    brandDirection: getString(formData, "brandDirection"),
    visualStyle: getString(formData, "visualStyle"),
    composition: getString(formData, "composition"),
    textToRender: getString(formData, "textToRender"),
    requiredElementsRaw: getString(formData, "requiredElements"),
    avoidElementsRaw: getString(formData, "avoidElements"),
    aspectRatio: getString(formData, "aspectRatio"),
    additionalDirection: getString(formData, "additionalDirection"),
    referenceMediaAssetIds: formData.getAll("referenceMediaAssetIds").filter((v): v is string => typeof v === "string"),
  };
}

export function parseQuality(formData: FormData): string {
  return getString(formData, "quality");
}

export function parseContextSource(formData: FormData): { contextSourceType: string | null; contextSourceId: string | null } {
  return {
    contextSourceType: getNullableString(formData, "contextSourceType"),
    contextSourceId: getNullableString(formData, "contextSourceId"),
  };
}

// Phase 20C-2 — the owner-reviewed filename/alt/caption submitted
// alongside a Save to Media Library click. Shape parsing only; every
// value is re-sanitized/bounded server-side in save-discard.ts regardless
// of what's submitted here.
export function parseSaveMetadata(formData: FormData): { filename?: string; alt?: string; caption?: string } {
  return {
    filename: getString(formData, "filename") || undefined,
    alt: getString(formData, "alt") || undefined,
    caption: getString(formData, "caption") || undefined,
  };
}
