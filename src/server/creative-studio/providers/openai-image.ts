import "server-only";
import OpenAI, { APIError, APIConnectionTimeoutError, toFile } from "openai";
import type { ImageProvider, ImageGenerationProviderRequest, ImageGenerationProviderResult } from "./image-provider";
import { ImageProviderError } from "./image-provider";

// Phase 20C-1 — the ONLY file in this codebase allowed to import the
// `openai` package for IMAGE generation. Every other Creative Studio
// module talks to the ImageProvider interface only (image-provider.ts) —
// this keeps the rest of the system provider-neutral, mirroring exactly
// the boundary src/server/brain/providers/openai.ts already establishes
// for TEXT generation. This file is a SEPARATE provider capability, never
// merged into or extended from the text-provider files, per approval.
//
// IMPORTANT: this provider is implemented and may be configured, but per
// explicit instruction it is NEVER INVOKED anywhere in this phase — the
// only concrete provider actually exercised (by the automated test suite,
// and by the page/Server Action wiring during this implementation) is
// MockImageProvider. See registry.ts's own comment.
//
// Model id confirmed directly against developers.openai.com/api/docs/models/
// gpt-image-1.5 at implementation time (2026-07-26): "gpt-image-1.5",
// synchronous (single HTTP round trip, no polling/webhook — confirmed
// against developers.openai.com/api/docs/guides/image-generation), always
// returns base64-encoded output for GPT Image models (no URL — confirmed
// directly against the installed openai@6.49.0 SDK's own Image type:
// `url` is documented "Unsupported for the GPT image models"). This is a
// real server-config value (see registry.ts), never something request
// input can override.
//
// Same short client-level timeout / zero-automatic-retry discipline as
// the text provider, for the same reason: a silent SDK retry would be a
// second billed call the owner never explicitly asked for, and image
// generation costs meaningfully more per call than text.
const CLIENT_TIMEOUT_MS = 60_000; // image generation can take up to ~2 minutes per OpenAI's own docs; kept well under that ceiling while still generous for a single synchronous admin request
const CLIENT_MAX_RETRIES = 0;

export const OPENAI_IMAGE_MODEL_ID = "gpt-image-1.5";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Never a raw SDK error, never logs/echoes any part of the (missing)
    // key — matches every other "safe generic error" precedent in this
    // codebase (see openai.ts's own identical guard for the text
    // provider).
    throw new ImageProviderError("The image generation provider is not configured on this server.", "provider_error");
  }
  cachedClient = new OpenAI({ apiKey, timeout: CLIENT_TIMEOUT_MS, maxRetries: CLIENT_MAX_RETRIES });
  return cachedClient;
}

// Reference images are only ever resolved, active-image Media Library
// URLs already independently re-verified server-side (see
// src/server/creative-studio/generate-image.ts) — never a client-
// submitted arbitrary remote URL. Fetching them here is a server-to-
// server request against our own trusted, database-resolved Blob
// hostname, not an SSRF-exposed browser-controlled fetch.
async function fetchReferenceImageAsUploadable(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ImageProviderError("A reference image could not be retrieved for generation.", "provider_error");
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return toFile(buffer, "reference-image", { type: contentType });
}

export class OpenAIImageProvider implements ImageProvider {
  readonly providerName = "openai";
  readonly modelName = OPENAI_IMAGE_MODEL_ID;

  async generateImage(request: ImageGenerationProviderRequest): Promise<ImageGenerationProviderResult> {
    const client = getClient();

    try {
      // Reference images present -> images.edit() (composite/reference-
      // guided generation). No references -> plain images.generate().
      // Both endpoints support the GPT Image models and both always
      // return base64 for them — see the file-level comment above.
      const response =
        request.referenceImageUrls.length > 0
          ? await client.images.edit({
              model: OPENAI_IMAGE_MODEL_ID,
              image: await Promise.all(request.referenceImageUrls.map(fetchReferenceImageAsUploadable)),
              prompt: request.prompt,
              size: request.size,
              quality: request.quality,
              n: 1,
            })
          : await client.images.generate({
              model: OPENAI_IMAGE_MODEL_ID,
              prompt: request.prompt,
              size: request.size,
              quality: request.quality,
              n: 1,
              moderation: "auto",
            });

      const first = response.data?.[0];
      const base64 = first?.b64_json;
      if (!base64) {
        throw new ImageProviderError("The provider returned an empty or unreadable image response.", "invalid_response");
      }
      return { base64 };
    } catch (error) {
      if (error instanceof ImageProviderError) throw error;
      throw mapOpenAIError(error);
    }
  }
}

function mapOpenAIError(error: unknown): ImageProviderError {
  // Order matters: APIConnectionTimeoutError extends APIConnectionError,
  // which extends APIError, so the timeout check must run first — same
  // ordering discipline as the text provider's own mapOpenAIError().
  if (error instanceof APIConnectionTimeoutError) {
    return new ImageProviderError("The provider request timed out.", "timeout");
  }
  if (error instanceof APIError) {
    if (error.status === 429) {
      return new ImageProviderError("Rate limited by the provider.", "rate_limited");
    }
    // OpenAI's content-moderation rejection for image generation surfaces
    // as a 400-class error whose code/type identifies it as a moderation
    // block, not a generic bad request — checked before the generic
    // status>=400 fallback below so a real moderation rejection is never
    // mis-categorized as a plain validation/provider error. Field name
    // confirmed against the installed SDK's own APIError shape (`code`).
    if (error.code === "moderation_blocked" || error.code === "content_policy_violation") {
      return new ImageProviderError("The provider declined this request under its content safety policy.", "moderation_blocked");
    }
    if (error.status && error.status >= 500) {
      return new ImageProviderError("The provider had an internal error.", "provider_error");
    }
    return new ImageProviderError("The provider rejected the request.", "provider_error");
  }
  return new ImageProviderError("The provider request failed.", "provider_error");
}
