import "server-only";
import type { BrainUsageMetadata } from "@/data/brain";
import type { TextGenerationUsage } from "./providers/text-provider";

// Phase 20A cost model — GPT-5.6 Luna pricing confirmed directly against
// developers.openai.com/api/docs/models/gpt-5.6-luna at implementation
// time: $1.00 / 1M UNCACHED input tokens, $0.10 / 1M CACHED input tokens,
// $6.00 / 1M output tokens. This is a server-owned config — never derived
// from, or overridable by, client/request input.
//
// All arithmetic is done in integer MICRODOLLARS (1 USD = 1,000,000
// microdollars), not cents. Every published rate above converts to a
// whole number of micros per token (1, 0.1, 6 respectively per token) —
// see src/data/brain.ts's own comment on why this unit was chosen and
// what it fixes (integer cents would silently round a real, sub-cent
// request cost to $0 in stored history).
const UNCACHED_INPUT_MICROS_PER_MILLION_TOKENS = 1_000_000; // $1.00
const CACHED_INPUT_MICROS_PER_MILLION_TOKENS = 100_000; // $0.10
const OUTPUT_MICROS_PER_MILLION_TOKENS = 6_000_000; // $6.00

// usage.inputTokens is the TOTAL input token count, and cachedInputTokens
// is a billed-differently SUBSET of it (confirmed against the real
// Responses API usage object shape: input_tokens_details.cached_tokens is
// part of input_tokens, not additional to it) — so the uncached portion is
// always (inputTokens - cachedInputTokens), never inputTokens on its own,
// to avoid double-billing the cached slice at the full rate.
export function calculateCostMicros(usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number }): number {
  const uncachedInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const uncachedCost = (uncachedInputTokens / 1_000_000) * UNCACHED_INPUT_MICROS_PER_MILLION_TOKENS;
  const cachedCost = (usage.cachedInputTokens / 1_000_000) * CACHED_INPUT_MICROS_PER_MILLION_TOKENS;
  const outputCost = (usage.outputTokens / 1_000_000) * OUTPUT_MICROS_PER_MILLION_TOKENS;
  return Math.ceil(uncachedCost + cachedCost + outputCost);
}

// Built field-by-field from the provider's own usage figures — never a
// spread/forward of a raw provider usage object. See CLAUDE.md's Phase 20
// architecture report and src/data/brain.ts's BrainUsageMetadata comment.
export function buildUsageMetadata(usage: TextGenerationUsage): BrainUsageMetadata {
  return {
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    actualCostMicros: calculateCostMicros(usage),
  };
}

// A conservative pre-call estimate, available for a future "confirm before
// this call" gate (not yet wired into handle-request.ts's v1 flow — the
// daily request cap plus the fixed maxOutputTokens ceiling already bound
// worst-case spend for text requests; a per-call cost estimate becomes
// load-bearing once image/video generation exists). Assumes zero cached
// input (the conservative/worst-case assumption) and the hard
// maxOutputTokens ceiling — never a live tokenizer call for a pre-flight
// estimate.
export function estimatePreCallCostMicros(promptCharLength: number, maxOutputTokens: number): number {
  const estimatedInputTokens = Math.ceil(promptCharLength / 4);
  return calculateCostMicros({ inputTokens: estimatedInputTokens, cachedInputTokens: 0, outputTokens: maxOutputTokens });
}

// Converts a stored microdollar integer into a display-only dollar string
// — the ONE place this conversion happens. Never used for storage, never
// stored as a float — see src/data/brain.ts's own comment.
export function formatMicrosAsUsd(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}
