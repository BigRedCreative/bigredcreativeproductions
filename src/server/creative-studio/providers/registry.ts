import "server-only";
import type { ImageProvider } from "./image-provider";
import { OpenAIImageProvider } from "./openai-image";

// Phase 20C-1 — the ONE place that decides which real image provider/
// model serves a Creative Studio generation. This is a closed, server-
// config-only selection: no request input, form field, or admin UI choice
// can ever select a different provider or model — mirrors
// src/server/brain/providers/registry.ts's identical rule for text.
//
// v1 has exactly one entry. Adding a second real provider later means
// adding a second concrete implementation file plus a second branch here,
// still driven entirely by server configuration, never by anything a
// caller passes in.
//
// IMPORTANT: this function is what src/server/mutate-creative-studio.ts's
// real Server Actions call — but per explicit instruction for this phase,
// nothing in the shipped automated test suite or manual walkthrough this
// phase ever exercises the object this returns generating a real image;
// every automated test constructs a MockImageProvider directly and passes
// it into the provider-agnostic handleGenerateImage() instead of going
// through this registry at all.
export function getConfiguredImageProvider(): ImageProvider {
  return new OpenAIImageProvider();
}
