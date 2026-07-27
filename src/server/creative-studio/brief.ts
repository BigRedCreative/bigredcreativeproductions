import "server-only";
import { sanitizeForStorage, truncateAtWordBoundary } from "@/server/brain/safe-summary";
import {
  isValidCreativeTaskPreset,
  isValidImageAspectRatio,
  MAX_BRIEF_SHORT_FIELD_LENGTH,
  MAX_BRIEF_MEDIUM_FIELD_LENGTH,
  MAX_BRIEF_TEXT_TO_RENDER_LENGTH,
  MAX_BRIEF_LIST_ITEMS,
  MAX_BRIEF_LIST_ITEM_LENGTH,
  MAX_REFERENCE_MEDIA_ASSETS,
} from "@/data/creative-studio";
import type { CreativeBrief } from "@/data/creative-studio";

// Phase 20C-1 — the ONE place a CreativeBrief is built and validated. Pure
// and synchronous (no database/network access) so it's directly unit-
// testable and reusable at BOTH the "Build Creative Brief" gate and,
// re-run from scratch, at the "Generate Image" gate — the second gate
// NEVER trusts that a brief object round-tripped through the browser is
// already valid; it re-derives the brief from the same raw string fields
// every time. See src/server/creative-studio/generate-image.ts.
//
// Deliberately does NOT call any AI provider to "draft" the brief from a
// freeform idea — the owner directly fills in each structured field, and
// this function's only job is to sanitize/truncate/bound what they typed.
// This keeps "Build Creative Brief" entirely provider-call-free (zero real
// spend at that gate) and avoids the unresolved "reliably parse structured
// JSON from an LLM" risk — a decision explained in the implementation
// report, not silently made.
//
// textToRender is copied verbatim (after sanitize/truncate only) from
// raw.textToRender, which is itself only ever populated from the owner's
// own "Text to Render" form field — nothing in this file, or anywhere
// upstream of it, ever derives this value from any other business data.

export type RawCreativeBriefInput = {
  taskPreset: string;
  objective: string;
  subject: string;
  brandDirection: string;
  visualStyle: string;
  composition: string;
  textToRender: string;
  requiredElementsRaw: string; // one item per line
  avoidElementsRaw: string; // one item per line
  aspectRatio: string;
  additionalDirection: string;
  referenceMediaAssetIds: string[];
};

export type BuildBriefResult = { ok: true; brief: CreativeBrief } | { ok: false; errors: string[] };

function clean(text: string, maxLength: number): string {
  return truncateAtWordBoundary(sanitizeForStorage(text.trim()), maxLength);
}

function parseBoundedList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => truncateAtWordBoundary(sanitizeForStorage(line.trim()), MAX_BRIEF_LIST_ITEM_LENGTH))
    .filter((line) => line.length > 0)
    .slice(0, MAX_BRIEF_LIST_ITEMS);
}

export function buildAndValidateBrief(raw: RawCreativeBriefInput): BuildBriefResult {
  if (!isValidCreativeTaskPreset(raw.taskPreset)) {
    return { ok: false, errors: ["Please choose a valid task type."] };
  }
  const taskPreset = raw.taskPreset;

  if (!isValidImageAspectRatio(raw.aspectRatio)) {
    return { ok: false, errors: ["Please choose a valid aspect ratio."] };
  }
  const aspectRatio = raw.aspectRatio;

  const errors: string[] = [];

  const objective = clean(raw.objective, MAX_BRIEF_SHORT_FIELD_LENGTH);
  if (!objective) errors.push("Please describe the objective for this image.");

  const subject = clean(raw.subject, MAX_BRIEF_MEDIUM_FIELD_LENGTH);
  if (!subject) errors.push("Please describe the subject for this image.");

  const brandDirection = clean(raw.brandDirection, MAX_BRIEF_MEDIUM_FIELD_LENGTH);
  const visualStyle = clean(raw.visualStyle, MAX_BRIEF_MEDIUM_FIELD_LENGTH);
  const composition = clean(raw.composition, MAX_BRIEF_MEDIUM_FIELD_LENGTH);
  const additionalDirectionClean = clean(raw.additionalDirection, MAX_BRIEF_MEDIUM_FIELD_LENGTH);
  const textToRenderClean = clean(raw.textToRender, MAX_BRIEF_TEXT_TO_RENDER_LENGTH);

  const requiredElements = parseBoundedList(raw.requiredElementsRaw);
  const avoidElements = parseBoundedList(raw.avoidElementsRaw);

  const dedupedReferenceIds = [...new Set(raw.referenceMediaAssetIds.map((id) => id.trim()).filter(Boolean))];
  if (dedupedReferenceIds.length > MAX_REFERENCE_MEDIA_ASSETS) {
    errors.push(`You can select at most ${MAX_REFERENCE_MEDIA_ASSETS} reference images.`);
  }
  const referenceMediaAssetIds = dedupedReferenceIds.slice(0, MAX_REFERENCE_MEDIA_ASSETS);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    brief: {
      taskPreset,
      objective,
      subject,
      brandDirection,
      visualStyle,
      composition,
      textToRender: textToRenderClean || null,
      requiredElements,
      avoidElements,
      aspectRatio,
      referenceMediaAssetIds,
      additionalDirection: additionalDirectionClean || null,
    },
  };
}

// Turns a reviewed, already-validated CreativeBrief into the plain
// readable prompt text sent to the image provider. Deliberately assembled
// from named, labeled fields (never a raw JSON dump) so a provider without
// any special "structured brief" support still receives clear, well-
// organized instructions. textToRender is called out explicitly and
// separately so the provider treats it as literal text to render, not
// creative direction to interpret.
export function buildProviderPrompt(brief: CreativeBrief): string {
  const lines: string[] = [`Objective: ${brief.objective}`, `Subject: ${brief.subject}`];
  if (brief.brandDirection) lines.push(`Brand direction: ${brief.brandDirection}`);
  if (brief.visualStyle) lines.push(`Visual style: ${brief.visualStyle}`);
  if (brief.composition) lines.push(`Composition: ${brief.composition}`);
  if (brief.requiredElements.length > 0) lines.push(`Required elements: ${brief.requiredElements.join("; ")}`);
  if (brief.avoidElements.length > 0) lines.push(`Avoid: ${brief.avoidElements.join("; ")}`);
  if (brief.additionalDirection) lines.push(`Additional direction: ${brief.additionalDirection}`);
  if (brief.textToRender) {
    lines.push(`Render this exact text in the image, verbatim, exactly as given, nothing else: "${brief.textToRender}"`);
  } else {
    lines.push("Do not render any text, words, letters, or numbers in the image.");
  }
  return lines.join("\n");
}
