import "server-only";
import { getDb } from "@/db";
import { brainRequests } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import type { TextProvider } from "@/server/brain/providers/text-provider";
import { TextProviderError } from "@/server/brain/providers/text-provider";
import {
  buildDashboardContext,
  buildCustomerContext,
  buildOrderContext,
  buildPortfolioContext,
  buildServiceContext,
  buildMediaContext,
} from "@/server/brain/context-builder";
import { BRAIN_SYSTEM_INSTRUCTIONS, buildUserPrompt } from "@/server/brain/prompt";
import { buildPromptSummary, buildResponseSummary } from "@/server/brain/safe-summary";
import { buildUsageMetadata } from "@/server/brain/cost";
import { checkBrainRateLimit } from "@/server/rate-limit";
import type { BrainErrorCategory, BrainRequestType, BrainRequestSource, BrainRelatedEntityType } from "@/data/brain";
import { isValidBrainRequestType, isValidBrainRequestSource, isValidBrainRelatedEntityType } from "@/data/brain";

// Phase 20A/20B — the real, provider-agnostic request-handling logic. Kept
// deliberately free of any "use server"/requireAdminUser()/next/navigation
// dependency (unlike src/server/mutate-brain.ts, the actual Server Action
// boundary that calls this) so it can be exercised directly by the
// automated regression test script with an injected MockTextProvider,
// without needing a live admin session or spending a real API credit.
//
// requireAdminUser() authorization happens exactly once, in
// mutate-brain.ts's requestBrainAnswerAction, before this function is ever
// called — this module trusts its adminUserId parameter completely and
// performs no authorization itself.
//
// Phase 20B generalizes this from a dashboard-only handler into a
// requestSource-driven dispatcher. The client (see mutate-brain.ts) may
// submit ONLY: question, requestType, requestSource, relatedEntityType,
// relatedEntityId — never a context object, never an entity label. This
// file is what turns those five untrusted strings into a verified,
// minimal, server-built context — every step below is a real check, not
// a formality:
//   1. requestType is a known enum value
//   2. requestSource is a known enum value
//   3. relatedEntityType (if present) is a known enum value
//   4. requestType is actually valid FOR that requestSource (a fixed
//      compatibility table, not "any type + any source")
//   5. requestSource is actually valid FOR that relatedEntityType (e.g.
//      "customer_detail" must pair with relatedEntityType "customer")
//   6. the referenced entity is independently RE-FETCHED by id via the
//      existing, already-safe admin query functions — a client-submitted
//      relatedEntityId is never trusted to correspond to a real entity of
//      the declared type; a mismatch or nonexistent id is rejected as a
//      validation_error before any context is built or any provider call
//      happens.

export type BrainAnswerState =
  | { errors: string[] }
  | { success: true; answer: string; requestId: string }
  | null;

const MAX_QUESTION_LENGTH = 500;
const MAX_OUTPUT_TOKENS = 600;

// Phase 21A-1C — the daily request cap (still 20, still shared across
// EVERY requestSource combined — dashboard + all five entity entry
// points) is now enforced by the shared Postgres rate limiter
// (src/server/rate-limit.ts's "daily" tier for the brain_admin scope),
// not a local constant + a plain COUNT query against brain_requests. That
// module is the one place the number 20 is declared going forward — see
// its own comment for the full transition-safety writeup. A NEW, separate
// 5-requests-per-5-minutes burst tier is checked alongside it, on the same
// call, purely as additional short-window abuse protection.

// --- requestSource -> relatedEntityType compatibility ---------------------
// "brain_dashboard" pairs with no entity (null); every other source must
// pair with exactly the one entity type its name implies. This is real
// enforcement, not documentation — see resolveRequestContext() below.
const SOURCE_TO_ENTITY_TYPE: Record<BrainRequestSource, BrainRelatedEntityType | null> = {
  brain_dashboard: null,
  customer_detail: "customer",
  order_detail: "order",
  portfolio_detail: "portfolio_project",
  service_detail: "service",
  media_detail: "media_asset",
};

// --- requestType -> allowed requestSource(s) -------------------------------
// Every value in BRAIN_REQUEST_TYPES appears here explicitly (including
// the still-unused "summarize_lead", mapped to an empty array — reserved,
// no valid source yet, matching CLAUDE.md's own documented reasoning for
// why it stays unused this phase). recommend_caption/creative_direction
// are deliberately REUSED across multiple sources rather than duplicated
// into entity-specific type names, per the approved Phase 20B decision.
const TYPE_TO_ALLOWED_SOURCES: Record<BrainRequestType, readonly BrainRequestSource[]> = {
  dashboard_question: ["brain_dashboard"],
  summarize_lead: [],
  summarize_customer: ["customer_detail"],
  summarize_order: ["order_detail"],
  analyze_portfolio: ["portfolio_detail"],
  analyze_service: ["service_detail"],
  analyze_media: ["media_detail"],
  recommend_website: ["brain_dashboard"],
  recommend_seo: ["portfolio_detail", "service_detail"],
  recommend_motion: ["brain_dashboard"],
  recommend_caption: ["brain_dashboard", "portfolio_detail", "service_detail", "media_detail"],
  creative_direction: ["brain_dashboard", "media_detail"],
  video_prompt: ["brain_dashboard"],
};

const REQUEST_TYPE_LABELS: Record<BrainRequestType, string> = {
  dashboard_question: "Dashboard question",
  summarize_lead: "Lead summary",
  summarize_customer: "Customer summary",
  summarize_order: "Order summary",
  analyze_portfolio: "Portfolio analysis",
  analyze_service: "Service analysis",
  analyze_media: "Media analysis",
  recommend_website: "Website improvement recommendation",
  recommend_seo: "SEO recommendation",
  recommend_motion: "Motion setup review",
  recommend_caption: "Marketing idea",
  creative_direction: "Creative direction",
  video_prompt: "AI-video prompt draft",
};

function mapProviderErrorCategory(error: TextProviderError): BrainErrorCategory {
  return error.category;
}

type ResolvedContext =
  | { ok: true; data: Record<string, unknown>; relatedEntityType: BrainRelatedEntityType | null; relatedEntityId: string | null }
  | { ok: false; error: string };

// The ONE place a verified requestType/requestSource/relatedEntityType/
// relatedEntityId combination is turned into real, minimal, server-built
// context. Every branch independently re-fetches its entity — nothing
// here ever trusts that a client-submitted id actually refers to a real
// row of the claimed type.
async function resolveRequestContext(
  requestSource: BrainRequestSource,
  relatedEntityType: BrainRelatedEntityType | null,
  relatedEntityId: string | null,
): Promise<ResolvedContext> {
  const expectedEntityType = SOURCE_TO_ENTITY_TYPE[requestSource];

  if (expectedEntityType === null) {
    // Dashboard — no entity reference should be present at all.
    if (relatedEntityType !== null || relatedEntityId !== null) {
      return { ok: false, error: "This request type does not accept an entity reference." };
    }
    const context = await buildDashboardContext();
    return { ok: true, data: context, relatedEntityType: null, relatedEntityId: null };
  }

  // Every entity-scoped source requires BOTH fields, and the declared
  // type must match what this source expects — a mismatch (e.g.
  // requestSource "customer_detail" with relatedEntityType "order") is
  // rejected here, before any database read happens.
  if (relatedEntityType !== expectedEntityType || !relatedEntityId) {
    return { ok: false, error: "This request's entity reference is invalid for the selected source." };
  }

  switch (expectedEntityType) {
    case "customer": {
      const result = await buildCustomerContext(relatedEntityId);
      if (!result.ok) return { ok: false, error: "That customer could not be found." };
      return { ok: true, data: result.context, relatedEntityType, relatedEntityId };
    }
    case "order": {
      const result = await buildOrderContext(relatedEntityId);
      if (!result.ok) return { ok: false, error: "That order could not be found." };
      return { ok: true, data: result.context, relatedEntityType, relatedEntityId };
    }
    case "portfolio_project": {
      const result = await buildPortfolioContext(relatedEntityId);
      if (!result.ok) return { ok: false, error: "That portfolio project could not be found." };
      return { ok: true, data: result.context, relatedEntityType, relatedEntityId };
    }
    case "service": {
      const result = await buildServiceContext(relatedEntityId);
      if (!result.ok) return { ok: false, error: "That service could not be found." };
      return { ok: true, data: result.context, relatedEntityType, relatedEntityId };
    }
    case "media_asset": {
      const result = await buildMediaContext(relatedEntityId);
      if (!result.ok) return { ok: false, error: "That media asset could not be found." };
      return { ok: true, data: result.context, relatedEntityType, relatedEntityId };
    }
    case "lead":
      // No lead entry point exists yet — structurally unreachable via
      // SOURCE_TO_ENTITY_TYPE, kept only for exhaustiveness.
      return { ok: false, error: "This request type does not accept an entity reference." };
  }
}

export async function handleBrainRequest(
  provider: TextProvider,
  adminUserId: string,
  rawRequestType: string,
  question: string,
  rawRequestSource: string,
  rawRelatedEntityType: string | null,
  relatedEntityIdInput: string | null,
): Promise<BrainAnswerState> {
  // --- Step 1-3: closed-vocabulary validation ---------------------------
  if (!isValidBrainRequestType(rawRequestType)) {
    return { errors: ["That request type isn't recognized."] };
  }
  const requestType = rawRequestType;

  if (!isValidBrainRequestSource(rawRequestSource)) {
    return { errors: ["That request source isn't recognized."] };
  }
  const requestSource = rawRequestSource;

  let relatedEntityType: BrainRelatedEntityType | null = null;
  if (rawRelatedEntityType !== null && rawRelatedEntityType !== "") {
    if (!isValidBrainRelatedEntityType(rawRelatedEntityType)) {
      return { errors: ["That entity type isn't recognized."] };
    }
    relatedEntityType = rawRelatedEntityType;
  }
  const relatedEntityId = relatedEntityIdInput && relatedEntityIdInput.trim() ? relatedEntityIdInput.trim() : null;

  // --- Step 4: requestType <-> requestSource compatibility -----------------
  if (!TYPE_TO_ALLOWED_SOURCES[requestType].includes(requestSource)) {
    return { errors: ["That request type isn't available from this page."] };
  }

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return { errors: ["Please enter a question."] };
  }
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    return { errors: [`Please keep your question under ${MAX_QUESTION_LENGTH} characters.`] };
  }

  const db = getDb();
  const label = REQUEST_TYPE_LABELS[requestType];
  const promptSummary = buildPromptSummary(label, trimmedQuestion);

  // --- Step 5-7: requestSource <-> relatedEntityType compatibility, plus
  //     independent entity re-fetch (steps 5/6/7 from the brief) ----------
  const resolved = await resolveRequestContext(requestSource, relatedEntityType, relatedEntityId);
  if (!resolved.ok) {
    return { errors: [resolved.error] };
  }

  // --- Rate limiting: BEFORE calling the provider, so a rejected request
  //     spends zero OpenAI credits. Checks both the 5-per-5-minute burst
  //     tier and the 20-per-rolling-24h-per-admin daily tier in one call
  //     (see src/server/rate-limit.ts) — a rejection from EITHER tier
  //     stops here. Only the DAILY tier's rejection gets a permanent
  //     brain_requests row + audit event (a real, business-relevant spend
  //     gate, matching the exact precedent already established before
  //     this phase); a BURST rejection is a pure transient-abuse
  //     rejection and is not persisted, matching Creative Studio's own
  //     variation-cap precedent — this keeps a client that's hammering an
  //     already-exceeded burst limit from filling brain_requests/
  //     audit_log with noise. ------------------------------------------
  const rateLimitResult = await checkBrainRateLimit(adminUserId);
  if (!rateLimitResult.allowed) {
    if (rateLimitResult.tierId === "daily") {
      await db.transaction(async (tx) => {
        await tx.insert(brainRequests).values({
          requestedByAdminUserId: adminUserId,
          requestType,
          requestSource,
          relatedEntityType: resolved.relatedEntityType,
          relatedEntityId: resolved.relatedEntityId,
          promptSummary,
          responseSummary: null,
          provider: provider.providerName,
          model: provider.modelName,
          status: "failed",
          usageMetadata: null,
          errorCategory: "budget_exceeded",
        });
        // Approved Phase 20B audit rule: relatedEntityType only, never
        // relatedEntityId — brain_requests already permanently stores the
        // id; audit metadata stays minimal.
        await recordAuditEvent(tx, {
          adminUserId,
          action: "brain.requested",
          entityType: "brain_request",
          entityId: "dashboard",
          metadata: { requestType, requestSource, ...(resolved.relatedEntityType ? { relatedEntityType: resolved.relatedEntityType } : {}) },
        });
      });
      return { errors: [`Daily Big Red Brain request limit (${rateLimitResult.limit}) reached for today. Try again tomorrow.`] };
    }
    return { errors: ["You're sending Big Red Brain requests too quickly. Please wait a few minutes and try again."] };
  }

  // --- Prompt assembly — the verified, minimal, server-built context is
  //     the ONLY business data ever placed in BUSINESS DATA. -------------
  const userPrompt = buildUserPrompt(trimmedQuestion, resolved.data);

  // --- Provider call -------------------------------------------------------
  try {
    const result = await provider.generateText({
      systemInstructions: BRAIN_SYSTEM_INSTRUCTIONS,
      userPrompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    const responseSummary = buildResponseSummary(result.text);
    const usageMetadata = buildUsageMetadata(result.usage);
    let requestId = "";

    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(brainRequests)
        .values({
          requestedByAdminUserId: adminUserId,
          requestType,
          requestSource,
          relatedEntityType: resolved.relatedEntityType,
          relatedEntityId: resolved.relatedEntityId,
          promptSummary,
          responseSummary,
          provider: provider.providerName,
          model: provider.modelName,
          status: "completed",
          usageMetadata,
          errorCategory: null,
        })
        .returning({ id: brainRequests.id });
      requestId = inserted.id;

      const metadata = { requestType, requestSource, ...(resolved.relatedEntityType ? { relatedEntityType: resolved.relatedEntityType } : {}) };
      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.requested",
        entityType: "brain_request",
        entityId: "dashboard",
        metadata,
      });
      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.recommendation_generated",
        entityType: "brain_request",
        entityId: requestId,
        metadata,
      });
    });

    return { success: true, answer: result.text, requestId };
  } catch (error) {
    const category: BrainErrorCategory =
      error instanceof TextProviderError ? mapProviderErrorCategory(error) : "provider_error";

    await db.transaction(async (tx) => {
      await tx.insert(brainRequests).values({
        requestedByAdminUserId: adminUserId,
        requestType,
        requestSource,
        relatedEntityType: resolved.relatedEntityType,
        relatedEntityId: resolved.relatedEntityId,
        promptSummary,
        responseSummary: null,
        provider: provider.providerName,
        model: provider.modelName,
        status: "failed",
        usageMetadata: null,
        errorCategory: category,
      });
      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.request_failed",
        entityType: "brain_request",
        entityId: "dashboard",
        metadata: { requestType, requestSource, errorCategory: category, ...(resolved.relatedEntityType ? { relatedEntityType: resolved.relatedEntityType } : {}) },
      });
    });

    console.error("Big Red Brain request failed", { category });
    return { errors: ["Big Red Brain couldn't answer that right now. Please try again."] };
  }
}
