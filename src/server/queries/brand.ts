import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brandSettings } from "@/db/schema";
import type { BrandSettingsStatus } from "@/db/schema";
import { getSiteSettings } from "@/server/queries/site-content";
import { getMediaAssetsByIds } from "@/server/queries/media";

// The ONE place anything in the app reads brand_settings from Neon. Public
// reads are field-level-fallback-safe against the exact same hex values
// hardcoded in src/app/globals.css's :root block — if the DB is
// unreachable or a value is somehow missing, the known-good Big Red
// design keeps rendering exactly as it does today. See CLAUDE.md "Brand
// Controls" for the full architecture.

export type BrandTokenValues = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  buttonBackground: string;
  buttonText: string;
  buttonHoverBackground: string;
  logoHorizontalSrc: string;
  logoWhiteSrc: string;
};

// Byte-identical to globals.css's :root defaults — the ultimate fallback
// if the database is unreachable or a brand_settings row is missing.
const CSS_DEFAULTS = {
  primaryColor: "#D71920",
  accentColor: "#F5FF35",
  backgroundColor: "#EFE9DF",
  surfaceColor: "#FFFFFF",
  textColor: "#0B0B0B",
  mutedTextColor: "#777777",
  borderColor: "#0B0B0B",
  buttonBackground: "#0B0B0B",
  buttonText: "#FFFFFF",
  buttonHoverBackground: "#D71920",
} as const;

async function resolveBrandRow(row: typeof brandSettings.$inferSelect | undefined): Promise<BrandTokenValues> {
  // site_settings' existing, immediate/current logo paths remain the
  // fallback whenever a brand row has no Media Library selection — the
  // exact same field the public site already reads today, untouched.
  const settings = await getSiteSettings();

  const mediaIds = [row?.logoHorizontalMediaAssetId, row?.logoWhiteMediaAssetId].filter(
    (id): id is string => Boolean(id),
  );
  const assets = mediaIds.length > 0 ? await getMediaAssetsByIds(mediaIds) : new Map();

  const logoHorizontalSrc = row?.logoHorizontalMediaAssetId
    ? (assets.get(row.logoHorizontalMediaAssetId)?.url ?? settings.logoHorizontalSrc)
    : settings.logoHorizontalSrc;
  const logoWhiteSrc = row?.logoWhiteMediaAssetId
    ? (assets.get(row.logoWhiteMediaAssetId)?.url ?? settings.logoWhiteSrc)
    : settings.logoWhiteSrc;

  if (!row) {
    return { ...CSS_DEFAULTS, logoHorizontalSrc, logoWhiteSrc };
  }

  return {
    primaryColor: row.primaryColor || CSS_DEFAULTS.primaryColor,
    accentColor: row.accentColor || CSS_DEFAULTS.accentColor,
    backgroundColor: row.backgroundColor || CSS_DEFAULTS.backgroundColor,
    surfaceColor: row.surfaceColor || CSS_DEFAULTS.surfaceColor,
    textColor: row.textColor || CSS_DEFAULTS.textColor,
    mutedTextColor: row.mutedTextColor || CSS_DEFAULTS.mutedTextColor,
    borderColor: row.borderColor || CSS_DEFAULTS.borderColor,
    buttonBackground: row.buttonBackground || CSS_DEFAULTS.buttonBackground,
    buttonText: row.buttonText || CSS_DEFAULTS.buttonText,
    buttonHoverBackground: row.buttonHoverBackground || CSS_DEFAULTS.buttonHoverBackground,
    logoHorizontalSrc,
    logoWhiteSrc,
  };
}

// Public read — used by <BrandTokens variant="published"> on every public page.
export const getPublishedBrandTokens = cache(async (): Promise<BrandTokenValues> => {
  const db = getDb();
  const row = await db.query.brandSettings.findFirst({ where: eq(brandSettings.status, "published") });
  return resolveBrandRow(row);
});

// Admin-preview-only read — used by <BrandTokens variant="draft">, reachable
// only from the authenticated /admin/website/branding/preview route.
export const getDraftBrandTokens = cache(async (): Promise<BrandTokenValues> => {
  const db = getDb();
  const row = await db.query.brandSettings.findFirst({ where: eq(brandSettings.status, "draft") });
  return resolveBrandRow(row);
});

// Admin read — the raw row (draft or published) for prefilling the edit
// form / showing the "currently live" reference. No fallback merge: the
// editor needs true DB state, not a code-blended approximation.
export async function getBrandSettingsRowForAdmin(status: BrandSettingsStatus) {
  const db = getDb();
  return db.query.brandSettings.findFirst({ where: eq(brandSettings.status, status) });
}
