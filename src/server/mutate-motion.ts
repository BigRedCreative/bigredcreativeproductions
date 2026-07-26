"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { motionSettings } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import { isValidMotionIntensity, isValidMotionPreset, isValidHeroEntrance } from "@/data/motion";
import type { MotionIntensity, MotionPreset, HeroEntrance } from "@/data/motion";

// Every motion_settings write lives here. Every export independently
// calls requireAdminUser() as its first line, per the standing rule since
// Phase 12 — Server Actions aren't covered by the protected layout's own
// check. Each write is wrapped in a db.transaction() alongside its
// recordAuditEvent(tx, ...) call, mirroring mutate-brand.ts exactly.

export type MotionFormState = { errors: string[] } | { success: true } | null;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

type ValidatedMotionFields = {
  intensity: MotionIntensity;
  heroEntrance: HeroEntrance;
  servicesPreset: MotionPreset;
  servicesStagger: boolean;
  statementPreset: MotionPreset;
  portfolioPreset: MotionPreset;
  portfolioStagger: boolean;
  studioPreset: MotionPreset;
  processPreset: MotionPreset;
  processStagger: boolean;
};

const PRESET_FIELDS = [
  ["servicesPreset", "Services preset"],
  ["statementPreset", "Statement preset"],
  ["portfolioPreset", "Portfolio preset"],
  ["studioPreset", "Studio preset"],
  ["processPreset", "Process preset"],
] as const;

// The one place submitted motion FormData is validated against the closed
// enums in src/data/motion.ts — every field is checked against a known
// value list; nothing free-text ever reaches a database column. Mirrors
// validateAndNormalizeColor()'s role in mutate-brand.ts, just for enums
// instead of hex colors.
function validateMotionFields(formData: FormData): { ok: true; value: ValidatedMotionFields } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const intensity = getString(formData, "intensity");
  if (!isValidMotionIntensity(intensity)) {
    errors.push(`Motion intensity "${intensity}" is not a recognized option.`);
  }

  const heroEntrance = getString(formData, "heroEntrance");
  if (!isValidHeroEntrance(heroEntrance)) {
    errors.push(`Hero entrance "${heroEntrance}" is not a recognized option.`);
  }

  const presets: Partial<Record<(typeof PRESET_FIELDS)[number][0], MotionPreset>> = {};
  for (const [field, label] of PRESET_FIELDS) {
    const value = getString(formData, field);
    if (!isValidMotionPreset(value)) {
      errors.push(`${label} "${value}" is not a recognized option.`);
    } else {
      presets[field] = value;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      intensity: intensity as MotionIntensity,
      heroEntrance: heroEntrance as HeroEntrance,
      servicesPreset: presets.servicesPreset!,
      servicesStagger: getBoolean(formData, "servicesStagger"),
      statementPreset: presets.statementPreset!,
      portfolioPreset: presets.portfolioPreset!,
      portfolioStagger: getBoolean(formData, "portfolioStagger"),
      studioPreset: presets.studioPreset!,
      processPreset: presets.processPreset!,
      processStagger: getBoolean(formData, "processStagger"),
    },
  };
}

// Small, safe, non-exhaustive metadata — exactly the four fields approved
// for audit visibility. Never the full settings payload, never a CSS
// value (there are none to leak — every value here is already one of the
// closed enum strings).
function auditMetadata(value: ValidatedMotionFields) {
  return {
    intensity: value.intensity,
    heroEntrance: value.heroEntrance,
    servicesPreset: value.servicesPreset,
    portfolioPreset: value.portfolioPreset,
  };
}

// Save Draft — always writes ONLY the draft row. The published row and
// every public route are untouched by construction: this function never
// selects, updates, or reads anything from the published motion_settings
// row, and never calls revalidatePath().
export async function saveMotionDraftAction(
  _prevState: MotionFormState,
  formData: FormData,
): Promise<MotionFormState> {
  const adminUser = await requireAdminUser();

  const parsed = validateMotionFields(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(motionSettings)
        .set({ ...parsed.value, updatedAt: new Date() })
        .where(eq(motionSettings.status, "draft"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.motion.draft_saved",
        entityType: "motion_settings",
        entityId: "draft",
        metadata: auditMetadata(parsed.value),
      });
    });
  } catch (error) {
    console.error("Motion draft save failed", { error });
    return { errors: ["We couldn't save this draft. Please try again."] };
  }

  return { success: true };
}

// Motion only ever affects the homepage — no other route renders any
// motion-aware component, so unlike Brand Controls' multi-route
// revalidation list, this only ever needs to revalidate "/".
const HOMEPAGE_ROUTE = "/" as const;

// Publish — takes no form fields of its own. Re-reads the draft row
// INSIDE the transaction and copies its complete state onto the
// published row, mirroring publishBrandAction's exact pattern: publishes
// whatever was last explicitly saved as a draft, never unsaved form
// edits.
export async function publishMotionAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: MotionFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<MotionFormState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const draftRow = await tx.query.motionSettings.findFirst({ where: eq(motionSettings.status, "draft") });
      if (!draftRow) {
        throw new Error("NO_DRAFT_ROW");
      }

      await tx
        .update(motionSettings)
        .set({
          intensity: draftRow.intensity,
          heroEntrance: draftRow.heroEntrance,
          servicesPreset: draftRow.servicesPreset,
          servicesStagger: draftRow.servicesStagger,
          statementPreset: draftRow.statementPreset,
          portfolioPreset: draftRow.portfolioPreset,
          portfolioStagger: draftRow.portfolioStagger,
          studioPreset: draftRow.studioPreset,
          processPreset: draftRow.processPreset,
          processStagger: draftRow.processStagger,
          updatedAt: new Date(),
        })
        .where(eq(motionSettings.status, "published"));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.motion.published",
        entityType: "motion_settings",
        entityId: "published",
        metadata: {
          intensity: draftRow.intensity,
          heroEntrance: draftRow.heroEntrance,
          servicesPreset: draftRow.servicesPreset,
          portfolioPreset: draftRow.portfolioPreset,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_DRAFT_ROW") {
      return { errors: ["No draft motion settings were found to publish."] };
    }
    console.error("Motion publish failed", { error });
    return { errors: ["We couldn't publish these changes. Please try again."] };
  }

  revalidatePath(HOMEPAGE_ROUTE);
  return { success: true };
}
