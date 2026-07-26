import "server-only";
import {
  buildBrandContext,
  buildPortfolioContext,
  buildServiceContext,
  buildMediaContext,
} from "@/server/brain/context-builder";
import { isValidCreativeContextSourceType } from "@/data/creative-studio";
import type { CreativeContextSourceType } from "@/data/creative-studio";

// Phase 20C-1 — Creative Studio's context-source resolver. Reuses the
// EXISTING, already-safe Phase 20B entity context builders
// (buildPortfolioContext/buildServiceContext/buildMediaContext) completely
// unmodified — they already return exactly the safe, bounded,
// non-PII-bearing field sets this phase's approval calls for, and
// reinventing a second parallel set of builders for the same three entity
// types would be pure duplication. buildBrandContext (also in that same
// module) is new this phase — see its own comment there for why it stays
// free of any CLAUDE.md-derived "brand voice" text.
//
// The client (see src/server/mutate-creative-studio.ts) may submit ONLY a
// contextSourceType + contextSourceId pair — NEVER a context object, NEVER
// descriptive text about the source. This function independently
// re-fetches and verifies the referenced entity every time, exactly
// mirroring src/server/brain/handle-request.ts's resolveRequestContext()
// — a client-submitted id is never trusted to correspond to a real entity
// of the declared type.
//
// Deliberately does NOT support "customer" | "order" | "lead" — those
// three types don't even exist in CreativeContextSourceType's closed
// vocabulary, so there is no code path here that could ever touch
// customer/order/lead data, structurally, not just by convention.

export type ResolvedCreativeContext =
  | { ok: true; sourceType: CreativeContextSourceType | null; sourceId: string | null; data: Record<string, unknown> | null }
  | { ok: false; error: string };

export async function resolveContextSource(
  rawSourceType: string | null,
  rawSourceId: string | null,
): Promise<ResolvedCreativeContext> {
  if (!rawSourceType) {
    // No context source selected — a fully valid choice ("Idea" alone).
    return { ok: true, sourceType: null, sourceId: null, data: null };
  }

  if (!isValidCreativeContextSourceType(rawSourceType)) {
    return { ok: false, error: "That context source isn't recognized." };
  }
  const sourceType = rawSourceType;

  if (sourceType === "brand") {
    // Brand is a singleton — no id to verify, the published row is always
    // "the" brand context.
    const data = await buildBrandContext();
    return { ok: true, sourceType, sourceId: null, data };
  }

  const sourceId = rawSourceId?.trim();
  if (!sourceId) {
    return { ok: false, error: "Please choose a specific item for this context source." };
  }

  switch (sourceType) {
    case "portfolio": {
      const result = await buildPortfolioContext(sourceId);
      if (!result.ok) return { ok: false, error: "That portfolio project could not be found." };
      return { ok: true, sourceType, sourceId, data: result.context };
    }
    case "service": {
      const result = await buildServiceContext(sourceId);
      if (!result.ok) return { ok: false, error: "That service could not be found." };
      return { ok: true, sourceType, sourceId, data: result.context };
    }
    case "media_asset": {
      const result = await buildMediaContext(sourceId);
      if (!result.ok) return { ok: false, error: "That media asset could not be found." };
      return { ok: true, sourceType, sourceId, data: result.context };
    }
  }
}
