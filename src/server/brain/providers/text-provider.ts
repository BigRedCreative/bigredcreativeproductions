import "server-only";

// Phase 20A — the ONE interface every text-generation call in Big Red Brain
// goes through. Nothing outside this providers/ directory ever imports the
// `openai` package (or any other provider SDK) directly — see openai.ts's
// own comment for why that boundary matters. A future Anthropic/other
// text provider implements this exact same interface; nothing calling
// generateText() needs to change.

export type TextGenerationRequest = {
  // Server-authored, fixed instruction text — never influenced by request
  // input. Passed to the provider's own "instructions"/system-role
  // parameter, kept structurally separate from userPrompt.
  systemInstructions: string;
  // The question plus any business DATA, already assembled and delimited
  // by src/server/brain/prompt.ts — this interface does not know or care
  // about that internal structure, it just forwards a string.
  userPrompt: string;
  // Hard cap on the provider's response length — always set by the
  // caller (mutate-brain.ts), never left to a provider default, so a
  // single request can't produce an unbounded (and unbounded-cost)
  // response. See CLAUDE.md's Phase 20 architecture report, "Cost
  // controls."
  maxOutputTokens: number;
};

export type TextGenerationUsage = {
  // Total input tokens for the request, INCLUDING any cachedInputTokens
  // below (cached tokens are a billed-differently subset of input, not an
  // addition to it) — matches the real Responses API's usage.input_tokens
  // semantics exactly, confirmed against the installed SDK's own types.
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

export type TextGenerationResult = {
  text: string;
  usage: TextGenerationUsage;
};

export interface TextProvider {
  // Stable identifiers written verbatim into brain_requests.provider/.model
  // — never derived from anything request-supplied.
  readonly providerName: string;
  readonly modelName: string;
  generateText(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

// Thrown by any TextProvider implementation on failure — the ONE error
// shape mutate-brain.ts needs to understand to map onto a safe
// BrainErrorCategory (src/data/brain.ts). Concrete providers translate
// their own SDK-specific errors into this shape; nothing outside a
// provider file needs to know what a raw OpenAI (or future Anthropic)
// exception looks like.
export class TextProviderError extends Error {
  readonly category: "provider_error" | "rate_limited" | "invalid_response" | "timeout";
  constructor(message: string, category: "provider_error" | "rate_limited" | "invalid_response" | "timeout") {
    super(message);
    this.name = "TextProviderError";
    this.category = category;
  }
}
