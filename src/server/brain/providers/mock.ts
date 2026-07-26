import "server-only";
import type { TextProvider, TextGenerationRequest, TextGenerationResult, TextGenerationUsage } from "./text-provider";
import { TextProviderError } from "./text-provider";

// Phase 20A — a deterministic, network-free TextProvider used only by the
// automated regression test script. Lets the entire request/validation/
// cost-cap/audit/storage pipeline be exercised end-to-end without ever
// spending a real API credit or requiring OPENAI_API_KEY to be configured.
// Never selected by registry.ts for any real admin-facing request — see
// that file's own comment on why provider selection is never client-
// controllable.

const DEFAULT_USAGE: TextGenerationUsage = { inputTokens: 100, cachedInputTokens: 0, outputTokens: 42 };

export class MockTextProvider implements TextProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-model";

  private readonly behavior: "success" | "failure";
  private readonly failureCategory: "provider_error" | "rate_limited" | "invalid_response" | "timeout";
  private readonly usageOverride: TextGenerationUsage;

  constructor(
    behavior: "success" | "failure" = "success",
    failureCategory: "provider_error" | "rate_limited" | "invalid_response" | "timeout" = "provider_error",
    usageOverride: TextGenerationUsage = DEFAULT_USAGE,
  ) {
    this.behavior = behavior;
    this.failureCategory = failureCategory;
    this.usageOverride = usageOverride;
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResult> {
    if (this.behavior === "failure") {
      throw new TextProviderError("Mock provider simulated failure.", this.failureCategory);
    }
    return {
      text: `Mock response to: ${request.userPrompt.slice(0, 60)}...`,
      usage: this.usageOverride,
    };
  }
}
