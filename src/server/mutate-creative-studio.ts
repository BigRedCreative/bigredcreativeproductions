"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import { parseRawCreativeBriefInput, parseQuality, parseContextSource } from "@/server/build-creative-studio-form";
import { buildAndValidateBrief } from "@/server/creative-studio/brief";
import { handleGenerateImage } from "@/server/creative-studio/generate-image";
import { handleSaveToMediaLibrary, handleDiscardGeneration } from "@/server/creative-studio/save-discard";
import { getConfiguredImageProvider } from "@/server/creative-studio/providers/registry";
import { getEstimatedCostMicros } from "@/server/creative-studio/cost";
import { isValidImageGenerationQuality, IMAGE_SIZE_BY_ASPECT_RATIO } from "@/data/creative-studio";
import type { CreativeBrief, ImageGenerationQuality } from "@/data/creative-studio";
import type { GenerateImageResult } from "@/server/creative-studio/generate-image";

// Phase 20C-1 — the Server Action boundary for Creative Studio. Every
// export below independently calls requireAdminUser() as its first line,
// per the standing rule since Phase 12 — Server Actions aren't covered by
// the protected layout's own check. All the real request-handling logic
// (validation, context/reference re-verification, cost caps, provider
// call, byte validation, storage, save/discard) lives in
// src/server/creative-studio/*.ts, kept deliberately free of any
// next/navigation dependency so it's directly unit-testable with an
// injected MockImageProvider — see generate-image.ts's own comment.
//
// GATE 1 (buildCreativeBriefAction) and GATE 2 (generateImageAction) are
// two genuinely separate Server Actions — there is no code path from
// submitting the idea form to a provider call without the owner
// separately, explicitly clicking "Generate Image" afterward.

export type BuildBriefState =
  | { errors: string[] }
  | { success: true; brief: CreativeBrief; quality: ImageGenerationQuality; estimatedCostMicros: number }
  | null;

export async function buildCreativeBriefAction(_prevState: BuildBriefState, formData: FormData): Promise<BuildBriefState> {
  const adminUser = await requireAdminUser();

  const raw = parseRawCreativeBriefInput(formData);
  const rawQuality = parseQuality(formData);

  const briefResult = buildAndValidateBrief(raw);
  if (!briefResult.ok) {
    return { errors: briefResult.errors };
  }
  if (!isValidImageGenerationQuality(rawQuality)) {
    return { errors: ["Please choose a valid image quality."] };
  }

  const size = IMAGE_SIZE_BY_ASPECT_RATIO[briefResult.brief.aspectRatio];
  const estimatedCostMicros = getEstimatedCostMicros(rawQuality, size);

  // A meaningful, real action (a brief was successfully structured and
  // validated) — audited with small, safe identifiers only, never the
  // brief content itself.
  await recordAuditEvent(getDb(), {
    adminUserId: adminUser.id,
    action: "creative.brief_built",
    entityType: "creative_studio",
    entityId: "brief",
    metadata: { taskPreset: briefResult.brief.taskPreset, aspectRatio: briefResult.brief.aspectRatio },
  });

  return { success: true, brief: briefResult.brief, quality: rawQuality, estimatedCostMicros };
}

export type GenerateImageState = GenerateImageResult | null;

export async function generateImageAction(_prevState: GenerateImageState, formData: FormData): Promise<GenerateImageState> {
  const adminUser = await requireAdminUser();

  const raw = parseRawCreativeBriefInput(formData);
  const quality = parseQuality(formData);
  const { contextSourceType, contextSourceId } = parseContextSource(formData);

  const provider = getConfiguredImageProvider();
  return handleGenerateImage(provider, adminUser.id, { ...raw, quality, contextSourceType, contextSourceId });
}

export type SaveToMediaState = { errors: string[] } | { success: true; mediaAssetId: string } | null;

export async function saveToMediaLibraryAction(
  jobId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: SaveToMediaState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<SaveToMediaState> {
  const adminUser = await requireAdminUser();
  const result = await handleSaveToMediaLibrary(adminUser.id, jobId);
  if ("success" in result) {
    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${result.mediaAssetId}`);
  }
  return result;
}

export type DiscardState = { errors: string[] } | { success: true } | null;

export async function discardGenerationAction(
  jobId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: DiscardState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<DiscardState> {
  const adminUser = await requireAdminUser();
  return handleDiscardGeneration(adminUser.id, jobId);
}
