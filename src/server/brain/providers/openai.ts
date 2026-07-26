import "server-only";
import OpenAI, { APIError, APIConnectionTimeoutError } from "openai";
import type { TextProvider, TextGenerationRequest, TextGenerationResult } from "./text-provider";
import { TextProviderError } from "./text-provider";

// Phase 20A — the ONLY file in this codebase allowed to import the `openai`
// package. Every other Big Red Brain module talks to the TextProvider
// interface only (text-provider.ts) — this keeps the rest of the system
// provider-neutral, matching CLAUDE.md's Phase 20 architecture report,
// "Provider abstraction."
//
// Uses the Responses API (client.responses.create), the officially
// recommended endpoint for new applications as of the current OpenAI docs
// (developers.openai.com) — NOT the legacy Chat Completions endpoint.
//
// Model id confirmed directly against developers.openai.com/api/docs/models/
// gpt-5.6-luna at implementation time: "gpt-5.6-luna". This is a real
// server-config value (see registry.ts), never something request input can
// override.
//
// Deliberately short client-level timeout (30s) and zero SDK-level
// automatic retries — the openai-node SDK's own defaults (10-minute
// timeout, 2 retries) are far too permissive for a synchronous admin
// dashboard request and would directly conflict with this project's "no
// uncontrolled retries" cost-discipline rule (CLAUDE.md, Phase 20 "Cost
// controls"). A retry here would be a second billed call the owner never
// explicitly asked for.
const CLIENT_TIMEOUT_MS = 30_000;
const CLIENT_MAX_RETRIES = 0;

export const OPENAI_MODEL_ID = "gpt-5.6-luna";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Never a raw SDK error, never logs/echoes any part of the (missing)
    // key — this is what a caller sees when OPENAI_API_KEY isn't
    // configured, matching every other "safe generic error" precedent in
    // this codebase (see create-order.ts's own documented DATABASE_URL
    // failure fix).
    throw new TextProviderError("The OpenAI provider is not configured on this server.", "provider_error");
  }
  cachedClient = new OpenAI({ apiKey, timeout: CLIENT_TIMEOUT_MS, maxRetries: CLIENT_MAX_RETRIES });
  return cachedClient;
}

export class OpenAITextProvider implements TextProvider {
  readonly providerName = "openai";
  readonly modelName = OPENAI_MODEL_ID;

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const client = getClient();

    let response;
    try {
      response = await client.responses.create({
        model: OPENAI_MODEL_ID,
        instructions: request.systemInstructions,
        input: request.userPrompt,
        max_output_tokens: request.maxOutputTokens,
      });
    } catch (error) {
      throw mapOpenAIError(error);
    }

    const text = response.output_text;
    if (typeof text !== "string" || text.length === 0) {
      throw new TextProviderError("The provider returned an empty or unreadable response.", "invalid_response");
    }

    // Extracted field-by-field from the real Responses API usage object
    // (confirmed shape: { input_tokens, input_tokens_details: { cached_tokens },
    // output_tokens, output_tokens_details: { reasoning_tokens }, total_tokens })
    // — never forwarded verbatim. See CLAUDE.md's Phase 20 architecture
    // report: usage_metadata must never carry an unreviewed provider field.
    const usage = response.usage;
    return {
      text,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
      },
    };
  }
}

function mapOpenAIError(error: unknown): TextProviderError {
  // Order matters: APIConnectionTimeoutError extends APIConnectionError,
  // which extends APIError, so the timeout check must run first.
  if (error instanceof APIConnectionTimeoutError) {
    return new TextProviderError("The provider request timed out.", "timeout");
  }
  if (error instanceof APIError) {
    if (error.status === 429) {
      return new TextProviderError("Rate limited by the provider.", "rate_limited");
    }
    if (error.status && error.status >= 500) {
      return new TextProviderError("The provider had an internal error.", "provider_error");
    }
    return new TextProviderError("The provider rejected the request.", "provider_error");
  }
  return new TextProviderError("The provider request failed.", "provider_error");
}
