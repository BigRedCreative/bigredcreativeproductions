import "server-only";
import type { TextProvider } from "./text-provider";
import { OpenAITextProvider } from "./openai";

// Phase 20A — the ONE place that decides which real text provider/model
// serves a Big Red Brain request. This is a closed, server-config-only
// selection: no request input, form field, or admin UI choice can ever
// select a different provider or model. See CLAUDE.md's Phase 20
// architecture report, "Provider abstraction" and "Cost controls" —
// "only use the configured allowlisted model."
//
// v1 has exactly one entry. Adding a second real provider later means
// adding a second concrete implementation file plus a second branch here,
// still driven entirely by server configuration (e.g. an env var choosing
// which one is "active"), never by anything a caller passes in.
export function getConfiguredTextProvider(): TextProvider {
  return new OpenAITextProvider();
}
