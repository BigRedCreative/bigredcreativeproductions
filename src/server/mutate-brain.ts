"use server";

import { requireAdminUser } from "@/server/require-admin-user";
import { getConfiguredTextProvider } from "@/server/brain/providers/registry";
import { handleBrainRequest } from "@/server/brain/handle-request";
import type { BrainAnswerState } from "@/server/brain/handle-request";

// Phase 20A — the Server Action boundary for Big Red Brain requests.
// Independently calls requireAdminUser() as its first line, per the
// standing rule since Phase 12 — Server Actions aren't covered by the
// protected layout's own check. All the real request-handling logic
// (validation, cost caps, prompt assembly, provider call, brain_requests
// write, audit events) lives in src/server/brain/handle-request.ts, kept
// deliberately free of any next/navigation dependency so it's directly
// unit-testable with a MockTextProvider — see that file's own comment.
// This wrapper's only two jobs: authorize, then select the REAL configured
// provider (registry.ts — never request-selectable).

export type { BrainAnswerState } from "@/server/brain/handle-request";

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function requestBrainAnswerAction(
  _prevState: BrainAnswerState,
  formData: FormData,
): Promise<BrainAnswerState> {
  const adminUser = await requireAdminUser();
  const requestType = getString(formData, "requestType");
  const question = getString(formData, "question");
  const provider = getConfiguredTextProvider();
  return handleBrainRequest(provider, adminUser.id, requestType, question);
}
