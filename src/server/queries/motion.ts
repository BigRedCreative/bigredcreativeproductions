import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { motionSettings } from "@/db/schema";
import type { MotionSettingsStatus } from "@/data/motion";
import type { MotionSettings } from "@/data/motion";
import { MOTION_SETTINGS_FALLBACK, normalizeMotionIntensity, normalizeMotionPreset, normalizeHeroEntrance } from "@/data/motion";

// The ONE place anything in the app reads motion_settings from Neon.
// Mirrors src/server/queries/brand.ts exactly: public reads are
// field-level-fallback-safe against MOTION_SETTINGS_FALLBACK (itself
// byte-identical to the approved seed values), so a missing row or an
// unreachable database never breaks rendering — the homepage just falls
// back to the same conservative defaults the real rows were seeded with.
//
// Every field is passed through normalizeMotionPreset()/
// normalizeMotionIntensity()/normalizeHeroEntrance() before leaving this
// module — this is the actual enforcement point for "invalid database
// values must never flow into arbitrary CSS": even a hypothetically
// corrupted raw column value narrows to a safe, known default here, never
// reaches a data-motion attribute unchecked.
function resolveRow(row: typeof motionSettings.$inferSelect | undefined): MotionSettings {
  if (!row) return MOTION_SETTINGS_FALLBACK;
  return {
    intensity: normalizeMotionIntensity(row.intensity),
    heroEntrance: normalizeHeroEntrance(row.heroEntrance),
    servicesPreset: normalizeMotionPreset(row.servicesPreset),
    servicesStagger: row.servicesStagger,
    statementPreset: normalizeMotionPreset(row.statementPreset),
    portfolioPreset: normalizeMotionPreset(row.portfolioPreset),
    portfolioStagger: row.portfolioStagger,
    studioPreset: normalizeMotionPreset(row.studioPreset),
    processPreset: normalizeMotionPreset(row.processPreset),
    processStagger: row.processStagger,
  };
}

// Public read — used by every homepage motion-aware component on every
// public page render.
export const getPublishedMotionSettings = cache(async (): Promise<MotionSettings> => {
  const db = getDb();
  const row = await db.query.motionSettings.findFirst({ where: eq(motionSettings.status, "published") });
  return resolveRow(row);
});

// Admin-preview-only read — used exclusively by the authenticated
// /admin/website/motion/preview route, never by any public page.
export const getDraftMotionSettings = cache(async (): Promise<MotionSettings> => {
  const db = getDb();
  const row = await db.query.motionSettings.findFirst({ where: eq(motionSettings.status, "draft") });
  return resolveRow(row);
});

// Admin read — the raw row (draft or published), no fallback merge. The
// edit form needs to see exactly what's stored, the same principle
// already established by getBrandSettingsRowForAdmin()/getServiceEntityForAdmin().
export async function getMotionSettingsRowForAdmin(status: MotionSettingsStatus) {
  const db = getDb();
  return db.query.motionSettings.findFirst({ where: eq(motionSettings.status, status) });
}
