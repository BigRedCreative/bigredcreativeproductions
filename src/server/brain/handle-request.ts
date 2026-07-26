import "server-only";
import { getDb } from "@/db";
import { brainRequests } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit-log";
import type { TextProvider } from "@/server/brain/providers/text-provider";
import { TextProviderError } from "@/server/brain/providers/text-provider";
import { buildDashboardContext } from "@/server/brain/context-builder";
import { BRAIN_SYSTEM_INSTRUCTIONS, buildUserPrompt } from "@/server/brain/prompt";
import { buildPromptSummary, buildResponseSummary } from "@/server/brain/safe-summary";
import { buildUsageMetadata } from "@/server/brain/cost";
import { countBrainRequestsToday } from "@/server/queries/brain";
import type { BrainErrorCategory, BrainRequestType } from "@/data/brain";
import { isValidBrainRequestType } from "@/data/brain";

// Phase 20A — the real, provider-agnostic request-handling logic. Kept
// deliberately free of any "use server"/requireAdminUser()/next/navigation
// dependency (unlike src/server/mutate-brain.ts, the actual Server Action
// boundary that calls this) so it can be exercised directly by the
// automated regression test script with an injected MockTextProvider,
// without needing a live admin session or spending a real API credit — the
// same class of constraint documented throughout this codebase's other
// regression harnesses, solved here architecturally instead of worked
// around with a duplicated harness copy.
//
// requireAdminUser() authorization happens exactly once, in
// mutate-brain.ts's requestBrainAnswerAction, before this function is ever
// called — this module trusts its adminUserId parameter completely and
// performs no authorization itself, matching how every other "core logic"
// module already separated from its Server Action boundary in this
// codebase behaves (e.g. build-product-form.ts vs. mutate-product.ts).

export type BrainAnswerState =
  | { errors: string[] }
  | { success: true; answer: string; requestId: string }
  | null;

// Phase 20A ships exactly these 6 request types with a real provider
// behind them — the other 7 types in BRAIN_REQUEST_TYPES (src/data/
// brain.ts) are reserved for Phase 20B's entity-specific context builders,
// which don't exist yet. Requesting one of those now is rejected as a
// validation_error, never silently upgraded to a generic/no-context call.
export const PHASE_20A_ACTIVE_REQUEST_TYPES = [
  "dashboard_question",
  "recommend_website",
  "recommend_motion",
  "recommend_caption",
  "creative_direction",
  "video_prompt",
] as const satisfies readonly BrainRequestType[];

const REQUEST_TYPE_LABELS: Record<(typeof PHASE_20A_ACTIVE_REQUEST_TYPES)[number], string> = {
  dashboard_question: "Dashboard question",
  recommend_website: "Website improvement recommendation",
  recommend_motion: "Motion setup review",
  recommend_caption: "Marketing idea",
  creative_direction: "Branding-video concept",
  video_prompt: "AI-video prompt draft",
};

const MAX_QUESTION_LENGTH = 500;
const MAX_OUTPUT_TOKENS = 600;

// Conservative v1 starting point — see the accompanying report for the
// full reasoning. A single admin, cheap per-call pricing, and a hard
// output-token ceiling per call already bound the worst case tightly; this
// cap exists specifically to prevent an unbounded LOOP (a bug, a stuck
// browser tab retry, etc.) from silently running up real spend before a
// human notices. Raising it later is a one-line, explicit, reviewable
// change — never silently auto-tuned.
export const DAILY_BRAIN_REQUEST_CAP = 20;

function mapProviderErrorCategory(error: TextProviderError): BrainErrorCategory {
  return error.category;
}

export async function handleBrainRequest(
  provider: TextProvider,
  adminUserId: string,
  requestType: string,
  question: string,
): Promise<BrainAnswerState> {
  // --- Validation (never trusts client input past this point) ----------
  if (!isValidBrainRequestType(requestType) || !(PHASE_20A_ACTIVE_REQUEST_TYPES as readonly string[]).includes(requestType)) {
    return { errors: ["That request type isn't available yet."] };
  }
  const activeType = requestType as (typeof PHASE_20A_ACTIVE_REQUEST_TYPES)[number];

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return { errors: ["Please enter a question."] };
  }
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    return { errors: [`Please keep your question under ${MAX_QUESTION_LENGTH} characters.`] };
  }

  const db = getDb();
  const label = REQUEST_TYPE_LABELS[activeType];
  const promptSummary = buildPromptSummary(label, trimmedQuestion);

  // --- Cost guardrail: daily request cap ---------------------------------
  const requestsToday = await countBrainRequestsToday();
  if (requestsToday >= DAILY_BRAIN_REQUEST_CAP) {
    await db.transaction(async (tx) => {
      await tx.insert(brainRequests).values({
        requestedByAdminUserId: adminUserId,
        requestType: activeType,
        requestSource: "brain_dashboard",
        relatedEntityType: null,
        relatedEntityId: null,
        promptSummary,
        responseSummary: null,
        provider: provider.providerName,
        model: provider.modelName,
        status: "failed",
        usageMetadata: null,
        errorCategory: "budget_exceeded",
      });
      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.requested",
        entityType: "brain_request",
        entityId: "dashboard",
        metadata: { requestType: activeType, requestSource: "brain_dashboard" },
      });
    });
    return { errors: [`Daily Big Red Brain request limit (${DAILY_BRAIN_REQUEST_CAP}) reached for today. Try again tomorrow.`] };
  }

  // --- Context (Phase 20A: dashboard context only, every active type) ----
  const context = await buildDashboardContext();
  const userPrompt = buildUserPrompt(trimmedQuestion, context);

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
          requestType: activeType,
          requestSource: "brain_dashboard",
          relatedEntityType: null,
          relatedEntityId: null,
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

      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.requested",
        entityType: "brain_request",
        entityId: "dashboard",
        metadata: { requestType: activeType, requestSource: "brain_dashboard" },
      });
      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.recommendation_generated",
        entityType: "brain_request",
        entityId: requestId,
        metadata: { requestType: activeType, requestSource: "brain_dashboard" },
      });
    });

    return { success: true, answer: result.text, requestId };
  } catch (error) {
    const category: BrainErrorCategory =
      error instanceof TextProviderError ? mapProviderErrorCategory(error) : "provider_error";

    await db.transaction(async (tx) => {
      await tx.insert(brainRequests).values({
        requestedByAdminUserId: adminUserId,
        requestType: activeType,
        requestSource: "brain_dashboard",
        relatedEntityType: null,
        relatedEntityId: null,
        promptSummary,
        responseSummary: null,
        provider: provider.providerName,
        model: provider.modelName,
        status: "failed",
        usageMetadata: null,
        errorCategory: category,
      });
      // Proposed new audit action — brain.requested/brain.recommendation_generated
      // were the two named in the brief for a SUCCESSFUL request; this is the
      // natural failure counterpart, flagged here (and in the accompanying
      // report) as a new addition rather than silently added without comment.
      await recordAuditEvent(tx, {
        adminUserId,
        action: "brain.request_failed",
        entityType: "brain_request",
        entityId: "dashboard",
        metadata: { requestType: activeType, requestSource: "brain_dashboard", errorCategory: category },
      });
    });

    console.error("Big Red Brain request failed", { category });
    return { errors: ["Big Red Brain couldn't answer that right now. Please try again."] };
  }
}
