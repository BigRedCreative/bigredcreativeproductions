"use server";

import { requireAdminUser } from "@/server/require-admin-user";
import { getConfiguredTextProvider } from "@/server/brain/providers/registry";
import { handleBrainRequest } from "@/server/brain/handle-request";
import type { BrainAnswerState } from "@/server/brain/handle-request";

// Phase 20A/20B — the Server Action boundary for Big Red Brain requests.
// Independently calls requireAdminUser() as its first line, per the
// standing rule since Phase 12 — Server Actions aren't covered by the
// protected layout's own check. All the real request-handling logic
// (validation, compatibility checks, independent entity re-fetch, cost
// caps, prompt assembly, provider call, brain_requests write, audit
// events) lives in src/server/brain/handle-request.ts, kept deliberately
// free of any next/navigation dependency so it's directly unit-testable
// with a MockTextProvider — see that file's own comment.
//
// The client may submit ONLY these five raw strings — question,
// requestType, requestSource, relatedEntityType, relatedEntityId — never
// a context object, never an entity label. handle-request.ts treats every
// one of them as untrusted input to be independently validated, never as
// already-trustworthy structure.

export type { BrainAnswerState } from "@/server/brain/handle-request";

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string): string | null {
  const value = getString(formData, key);
  return value ? value : null;
}

export async function requestBrainAnswerAction(
  _prevState: BrainAnswerState,
  formData: FormData,
): Promise<BrainAnswerState> {
  const adminUser = await requireAdminUser();
  const requestType = getString(formData, "requestType");
  const question = getString(formData, "question");
  // Defaults preserve dashboard-only behavior for any caller that doesn't
  // explicitly submit these — AskBrainForm always submits them explicitly
  // now, but this keeps the function's own contract safe rather than
  // relying on that alone.
  const requestSource = getString(formData, "requestSource") || "brain_dashboard";
  const relatedEntityType = getNullableString(formData, "relatedEntityType");
  const relatedEntityId = getNullableString(formData, "relatedEntityId");
  const provider = getConfiguredTextProvider();
  return handleBrainRequest(provider, adminUser.id, requestType, question, requestSource, relatedEntityType, relatedEntityId);
}
