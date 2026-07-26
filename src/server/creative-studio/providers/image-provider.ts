import "server-only";
import type { ImageGenerationErrorCategory, ImageGenerationQuality, ImageGenerationSize } from "@/data/creative-studio";

// Phase 20C-1 — the ONE interface every image-generation call in Creative
// Studio goes through. A SEPARATE abstraction from TextProvider
// (src/server/brain/providers/text-provider.ts) on purpose — Big Red Brain
// (text) and Creative Studio (image) are independent provider
// capabilities, per approval; nothing here is mixed into or extended from
// the text-provider files. Nothing outside this providers/ directory ever
// imports the `openai` package (or any other image-provider SDK) directly
// — see openai-image.ts's own comment for why that boundary matters.

export type ImageGenerationProviderRequest = {
  // Server-assembled from the reviewed, sanitized CreativeBrief — never a
  // raw client-submitted string. See src/server/creative-studio/brief.ts.
  prompt: string;
  size: ImageGenerationSize;
  quality: ImageGenerationQuality;
  // Already-resolved, real Blob URLs for active, image-type Media Library
  // assets — never a client-submitted arbitrary remote URL. Empty when no
  // reference images were selected.
  referenceImageUrls: string[];
};

export type ImageGenerationProviderResult = {
  // Raw base64-encoded image bytes — provider-agnostic result shape.
  // Real byte validation (validateImageUpload) always happens AFTER this,
  // in generate-image.ts, before anything is trusted or stored — a
  // provider's own claimed format is never trusted on its own.
  base64: string;
};

export interface ImageProvider {
  // Stable identifiers written verbatim into ai_generation_jobs.provider/
  // .model — never derived from anything request-supplied.
  readonly providerName: string;
  readonly modelName: string;
  generateImage(request: ImageGenerationProviderRequest): Promise<ImageGenerationProviderResult>;
}

// Thrown by any ImageProvider implementation on failure — the ONE error
// shape generate-image.ts needs to understand to map onto a safe
// ImageGenerationErrorCategory. Concrete providers translate their own
// SDK-specific errors into this shape; nothing outside a provider file
// needs to know what a raw OpenAI (or future provider) exception looks
// like.
export class ImageProviderError extends Error {
  readonly category: ImageGenerationErrorCategory;
  constructor(message: string, category: ImageGenerationErrorCategory) {
    super(message);
    this.name = "ImageProviderError";
    this.category = category;
  }
}
