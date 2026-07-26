import "server-only";
import type {
  ImageProvider,
  ImageGenerationProviderRequest,
  ImageGenerationProviderResult,
} from "./image-provider";
import { ImageProviderError } from "./image-provider";
import type { ImageGenerationErrorCategory } from "@/data/creative-studio";

// Phase 20C-1 — a deterministic, network-free ImageProvider used only by
// the automated regression test script (and, if ever needed, local manual
// testing without spending real credits). Lets the entire brief/context/
// reference/cap/generation/validation/save/discard pipeline be exercised
// end-to-end without ever calling OpenAI or requiring OPENAI_API_KEY.
// Never selected by registry.ts for any real admin-facing request — see
// that file's own comment on why provider selection is never client-
// controllable.
//
// Returns a REAL, valid, byte-sniffable 1x1 PNG (not a placeholder
// string) so the full validateImageUpload() byte-validation path in
// generate-image.ts is genuinely exercised by mock tests, not skipped.
const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export class MockImageProvider implements ImageProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-image-model";

  private readonly behavior: "success" | "failure" | "invalid_bytes";
  private readonly failureCategory: ImageGenerationErrorCategory;

  constructor(
    behavior: "success" | "failure" | "invalid_bytes" = "success",
    failureCategory: ImageGenerationErrorCategory = "provider_error",
  ) {
    this.behavior = behavior;
    this.failureCategory = failureCategory;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateImage(_request: ImageGenerationProviderRequest): Promise<ImageGenerationProviderResult> {
    if (this.behavior === "failure") {
      throw new ImageProviderError("Mock provider simulated failure.", this.failureCategory);
    }
    if (this.behavior === "invalid_bytes") {
      // Deliberately NOT a real image — exercises the byte-validation
      // rejection path (generate-image.ts must reject this and write a
      // status:"failed" job, never a status:"completed" one).
      return { base64: Buffer.from("not a real image").toString("base64") };
    }
    return { base64: MOCK_PNG_BASE64 };
  }
}
