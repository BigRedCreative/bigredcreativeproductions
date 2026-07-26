import "server-only";
import { IMAGE_GENERATION_COST_TABLE_MICROS } from "@/data/creative-studio";
import type { ImageGenerationQuality, ImageGenerationSize, ImageGenerationUsageMetadata } from "@/data/creative-studio";

// Phase 20C-1 — image generation cost accounting. A deliberately separate
// module from src/server/brain/cost.ts (never imported by it, never
// imports it) — image spend stays independently trackable from Big Red
// Brain's own text-request accounting, per approval. Same integer-
// MICRODOLLAR unit convention (1 USD = 1,000,000 microdollars) for
// consistency, but its own table and its own column/table in the
// database.
//
// Unlike text generation, image cost is NOT computed from token usage —
// OpenAI's own pricing guidance for image generation is a flat per-image
// table by quality x size (see src/data/creative-studio.ts's
// IMAGE_GENERATION_COST_TABLE_MICROS comment for the exact official
// source), so there is no token-based arithmetic here at all — just a
// direct table lookup.

export function getEstimatedCostMicros(quality: ImageGenerationQuality, size: ImageGenerationSize): number {
  return IMAGE_GENERATION_COST_TABLE_MICROS[quality][size];
}

export function buildUsageMetadata(quality: ImageGenerationQuality, size: ImageGenerationSize): ImageGenerationUsageMetadata {
  const costMicros = getEstimatedCostMicros(quality, size);
  // Estimated and actual are identical for a flat per-image price table —
  // both fields are still populated (rather than omitting estimated)
  // so a future genuinely-variable-cost provider doesn't need a shape
  // change, only a real actual-vs-estimated divergence to report.
  return { estimatedCostMicros: costMicros, actualCostMicros: costMicros };
}

// Converts a stored microdollar integer into a display-only dollar string
// — the ONE place this conversion happens for image spend, mirroring
// src/server/brain/cost.ts's formatMicrosAsUsd() exactly. Never used for
// storage, never stored as a float.
export function formatMicrosAsUsd(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}
