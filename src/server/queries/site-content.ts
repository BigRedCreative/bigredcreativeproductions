import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings, homepageContent, contactContent } from "@/db/schema";
import type { HomepageContentStatus } from "@/db/schema";
import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { hero as heroFallback, contact as contactFallback, footer as footerFallback } from "@/data/homepage";
import { primaryNav as primaryNavFallback, headerCta as headerCtaFallback } from "@/data/navigation";
import { getMediaAssetsByIds } from "@/server/queries/media";

// The ONE place anything in the app reads Phase 14 website content from
// Neon. Every public read here is field-level-fallback-safe: a null/empty
// DB field falls back to the matching src/config or src/data constant, so
// a partially-populated row can never blank out unrelated content on the
// public site (see CLAUDE.md "Website content admin" — content fallback
// strategy). Admin reads (used to prefill edit forms) intentionally skip
// the fallback merge and return true DB state instead — an editor needs to
// see what's actually stored, not a code-blended approximation.
//
// Wrapped in React's cache() so the several components that each need the
// same row within one request (e.g. Header + Footer + layout metadata all
// need site_settings) share a single DB round trip per request instead of
// querying it redundantly once per component.

// ---------------------------------------------------------------------
// site_settings — singleton, immediate/current.
// ---------------------------------------------------------------------

export type SiteSettingsContent = {
  siteName: string;
  legalName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string | null;
  location: string;
  socialLinks: { platform: string; url: string }[];
  metaTitle: string;
  metaDescription: string;
  ogDescription: string;
  ogImageSrc: string | null;
  canonicalUrl: string;
  logoHorizontalSrc: string;
  logoWhiteSrc: string;
};

const siteSettingsFallback: SiteSettingsContent = {
  siteName: siteConfig.name,
  legalName: siteConfig.legalName,
  tagline: footerFallback.tagline,
  contactEmail: siteConfig.email,
  contactPhone: null,
  location: siteConfig.location,
  socialLinks: siteConfig.socialLinks,
  metaTitle: siteConfig.metaTitle,
  metaDescription: siteConfig.description,
  ogDescription: siteConfig.ogDescription,
  ogImageSrc: null,
  canonicalUrl: siteConfig.url,
  logoHorizontalSrc: "/brand/logo-horizontal.svg",
  logoWhiteSrc: "/brand/logo-white.svg",
};

function mergeSiteSettingsRow(row: typeof siteSettings.$inferSelect | undefined): SiteSettingsContent {
  if (!row) return siteSettingsFallback;
  return {
    siteName: row.siteName || siteSettingsFallback.siteName,
    legalName: row.legalName || siteSettingsFallback.legalName,
    tagline: row.tagline || siteSettingsFallback.tagline,
    contactEmail: row.contactEmail || siteSettingsFallback.contactEmail,
    contactPhone: row.contactPhone ?? siteSettingsFallback.contactPhone,
    location: row.location || siteSettingsFallback.location,
    socialLinks: row.socialLinks ?? siteSettingsFallback.socialLinks,
    metaTitle: row.metaTitle || siteSettingsFallback.metaTitle,
    metaDescription: row.metaDescription || siteSettingsFallback.metaDescription,
    ogDescription: row.ogDescription || siteSettingsFallback.ogDescription,
    ogImageSrc: row.ogImageSrc ?? siteSettingsFallback.ogImageSrc,
    canonicalUrl: row.canonicalUrl || siteSettingsFallback.canonicalUrl,
    logoHorizontalSrc: row.logoHorizontalSrc || siteSettingsFallback.logoHorizontalSrc,
    logoWhiteSrc: row.logoWhiteSrc || siteSettingsFallback.logoWhiteSrc,
  };
}

// Public + admin share this one reader — site_settings has no draft state,
// so there's only ever one "current" value to read either way.
export const getSiteSettings = cache(async (): Promise<SiteSettingsContent> => {
  const db = getDb();
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, "default") });
  return mergeSiteSettingsRow(row);
});

// ---------------------------------------------------------------------
// navigation_items — multi-row, immediate/current.
// ---------------------------------------------------------------------

export type NavItemContent = { label: string; href: string };

export type NavigationContent = {
  primary: NavItemContent[];
  headerCta: NavItemContent;
};

const navigationFallback: NavigationContent = {
  primary: primaryNavFallback.map(({ label, href }) => ({ label, href })),
  headerCta: { label: headerCtaFallback.label, href: headerCtaFallback.href },
};

// Public read — enabled rows only, ordered, field/row-level fallback: if
// the DB has zero enabled primary rows (or the header CTA row is missing/
// disabled), that specific piece falls back to the TS constant rather than
// rendering an empty nav.
export const getNavigation = cache(async (): Promise<NavigationContent> => {
  const db = getDb();
  const rows = await db.query.navigationItems.findMany({
    orderBy: (table, { asc }) => [asc(table.placement), asc(table.sortOrder)],
  });
  const primaryRows = rows.filter((row) => row.placement === "primary" && row.enabled);
  const headerCtaRow = rows.find((row) => row.placement === "header_cta" && row.enabled);
  return {
    primary: primaryRows.length > 0 ? primaryRows.map((row) => ({ label: row.label, href: row.href })) : navigationFallback.primary,
    headerCta: headerCtaRow ? { label: headerCtaRow.label, href: headerCtaRow.href } : navigationFallback.headerCta,
  };
});

// Admin read — every row (including disabled ones), full shape, for the
// Navigation edit form. No fallback merge: the editor needs true DB state.
export async function getNavigationItemsForAdmin() {
  const db = getDb();
  return db.query.navigationItems.findMany({
    orderBy: (table, { asc }) => [asc(table.placement), asc(table.sortOrder)],
  });
}

// ---------------------------------------------------------------------
// homepage_content — exactly two rows (draft/published).
// ---------------------------------------------------------------------

export type HeroMediaMode = "none" | "image" | "video";

export type HeroContent = {
  badgePrimary: string;
  badgeSecondary: string;
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  tagline: string;
  supportingCopy: string;
  ctaLabel: string;
  ctaHref: string;
  // Phase 19D-2 — RESOLVED at read time, same convention already proven
  // for ServiceImage/ProjectImage: when heroMediaAssetId resolves to an
  // IMAGE asset, this is overwritten with that asset's current Blob URL;
  // otherwise it's the legacy manual path (or null). The STORED column
  // never changes meaning — only what this resolved object returns can
  // differ from what's in the database, exactly like every other Media
  // Library integration in this codebase.
  heroImageSrc: string | null;
  heroImageAlt: string | null;
  // Phase 19D-2 — the permanent reference, passed through for admin/
  // debugging convenience. Public rendering branches on heroMediaMode,
  // not this field directly.
  heroMediaAssetId: string | null;
  // Phase 19D-2 — READ-TIME ONLY derived convenience, never persisted.
  // "none" | "image" | "video", computed from heroMediaAssetId's
  // resolved asset type (or the legacy manual path) — see
  // resolveHeroMedia() below.
  heroMediaMode: HeroMediaMode;
  // Phase 19D-2 — READ-TIME ONLY, only set when heroMediaMode === "video".
  // Never persisted into homepage_content — mirrors ProjectImage/
  // ServiceImage's posterSrc precedent exactly (and the real Phase 19B
  // bug that proved this needs active server-side enforcement, not just
  // a comment — see sanitizeHeroMediaForStorage() in
  // mutate-website-content.ts).
  heroVideoSrc: string | null;
  heroPosterSrc: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
};

const heroContentFallback: HeroContent = {
  badgePrimary: heroFallback.badgePrimary,
  badgeSecondary: heroFallback.badgeSecondary,
  eyebrow: heroFallback.eyebrow,
  headlineLead: heroFallback.headlineLead,
  headlineAccent: heroFallback.headlineAccent,
  tagline: heroFallback.tagline,
  supportingCopy: heroFallback.supportingCopy,
  ctaLabel: heroFallback.cta.label,
  ctaHref: `#${sectionAnchors.portfolio}`,
  heroImageSrc: null,
  heroImageAlt: null,
  heroMediaAssetId: null,
  heroMediaMode: "none",
  heroVideoSrc: null,
  heroPosterSrc: null,
  secondaryCtaLabel: null,
  secondaryCtaHref: null,
};

// Phase 19D-2 — the one place a homepage_content row's hero media is
// resolved. Direct structural port of resolveProjectsMedia()/
// resolveServicesMedia()'s two-pass shape, sized down to Hero's single
// slot: resolve heroMediaAssetId to its live asset (if any); if that
// asset is a video with its own posterMediaAssetId (Phase 19A),
// batch-resolve that too. No status filter is ever applied here — an
// already-published reference to a since-archived asset must keep
// resolving exactly like Portfolio/Service hero media already does; only
// NEW draft saves reject an archived asset (see mutate-website-content.ts).
async function resolveHeroMedia(row: typeof homepageContent.$inferSelect | undefined): Promise<Pick<HeroContent, "heroImageSrc" | "heroImageAlt" | "heroMediaAssetId" | "heroMediaMode" | "heroVideoSrc" | "heroPosterSrc">> {
  if (!row?.heroMediaAssetId) {
    // No Media Library selection — either the legacy manual path or none.
    return {
      heroImageSrc: row?.heroImageSrc ?? null,
      heroImageAlt: row?.heroImageAlt ?? null,
      heroMediaAssetId: null,
      heroMediaMode: row?.heroImageSrc ? "image" : "none",
      heroVideoSrc: null,
      heroPosterSrc: null,
    };
  }

  const assets = await getMediaAssetsByIds([row.heroMediaAssetId]);
  const asset = assets.get(row.heroMediaAssetId);
  if (!asset) {
    // The referenced row no longer resolves (shouldn't happen under
    // normal operation — ON DELETE SET NULL means a deleted asset clears
    // this column — but defensive: never let a dangling id reach the
    // page as if it were real media).
    return { heroImageSrc: null, heroImageAlt: row.heroImageAlt ?? null, heroMediaAssetId: null, heroMediaMode: "none", heroVideoSrc: null, heroPosterSrc: null };
  }

  if (asset.type === "video") {
    let posterSrc: string | null = null;
    if (asset.posterMediaAssetId) {
      const posterAssets = await getMediaAssetsByIds([asset.posterMediaAssetId]);
      posterSrc = posterAssets.get(asset.posterMediaAssetId)?.url ?? null;
    }
    return {
      heroImageSrc: null,
      heroImageAlt: row.heroImageAlt ?? null,
      heroMediaAssetId: row.heroMediaAssetId,
      heroMediaMode: "video",
      heroVideoSrc: asset.url,
      heroPosterSrc: posterSrc,
    };
  }

  // Image, resolved via the Media Library.
  return {
    heroImageSrc: asset.url,
    heroImageAlt: row.heroImageAlt ?? null,
    heroMediaAssetId: row.heroMediaAssetId,
    heroMediaMode: "image",
    heroVideoSrc: null,
    heroPosterSrc: null,
  };
}

async function mergeHeroRow(row: typeof homepageContent.$inferSelect | undefined): Promise<HeroContent> {
  const media = await resolveHeroMedia(row);
  if (!row) return { ...heroContentFallback, ...media };
  return {
    badgePrimary: row.badgePrimary || heroContentFallback.badgePrimary,
    badgeSecondary: row.badgeSecondary || heroContentFallback.badgeSecondary,
    eyebrow: row.eyebrow || heroContentFallback.eyebrow,
    headlineLead: row.headlineLead || heroContentFallback.headlineLead,
    headlineAccent: row.headlineAccent || heroContentFallback.headlineAccent,
    tagline: row.tagline || heroContentFallback.tagline,
    supportingCopy: row.supportingCopy || heroContentFallback.supportingCopy,
    ctaLabel: row.ctaLabel || heroContentFallback.ctaLabel,
    ctaHref: row.ctaHref || heroContentFallback.ctaHref,
    secondaryCtaLabel: row.secondaryCtaLabel ?? null,
    secondaryCtaHref: row.secondaryCtaHref ?? null,
    ...media,
  };
}

// Public read — the live homepage only ever renders the published row.
export const getPublishedHeroContent = cache(async (): Promise<HeroContent> => {
  const db = getDb();
  const row = await db.query.homepageContent.findFirst({ where: eq(homepageContent.status, "published") });
  return mergeHeroRow(row);
});

// Phase 19D-2 — admin-preview-only read, used exclusively by
// /admin/website/homepage/preview, never by any public page. Direct
// mirror of getPublishedHeroContent(), keyed to the draft row instead —
// this previously didn't exist; the preview page used to hand-build an
// unresolved override object from the raw draft row, which had no way to
// show resolved hero media (or draft motion settings — see that page).
export const getDraftHeroContent = cache(async (): Promise<HeroContent> => {
  const db = getDb();
  const row = await db.query.homepageContent.findFirst({ where: eq(homepageContent.status, "draft") });
  return mergeHeroRow(row);
});

// Admin read — the raw row for either status, used to prefill the edit
// form (draft) and to render the "currently live" reference (published).
// No fallback merge: the editor needs true DB state, not a code blend.
export async function getHeroContentRowForAdmin(status: HomepageContentStatus) {
  const db = getDb();
  return db.query.homepageContent.findFirst({ where: eq(homepageContent.status, status) });
}

// ---------------------------------------------------------------------
// contact_content — singleton, immediate/current.
// ---------------------------------------------------------------------

export type ContactContentValue = {
  kicker: string;
  heading: string;
  description: string;
  submitLabel: string;
};

const contactContentFallback: ContactContentValue = {
  kicker: contactFallback.kicker,
  heading: contactFallback.heading,
  description: contactFallback.description,
  submitLabel: contactFallback.form.submitLabel,
};

// Public + admin share this one reader — contact_content has no draft
// state, so there's only ever one "current" value to read either way.
export const getContactContent = cache(async (): Promise<ContactContentValue> => {
  const db = getDb();
  const row = await db.query.contactContent.findFirst({ where: eq(contactContent.id, "default") });
  if (!row) return contactContentFallback;
  return {
    kicker: row.kicker || contactContentFallback.kicker,
    heading: row.heading || contactContentFallback.heading,
    description: row.description || contactContentFallback.description,
    submitLabel: row.submitLabel || contactContentFallback.submitLabel,
  };
});
