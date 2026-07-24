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
  heroImageSrc: string | null;
  heroImageAlt: string | null;
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
  secondaryCtaLabel: null,
  secondaryCtaHref: null,
};

function mergeHeroRow(row: typeof homepageContent.$inferSelect | undefined): HeroContent {
  if (!row) return heroContentFallback;
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
    heroImageSrc: row.heroImageSrc ?? null,
    heroImageAlt: row.heroImageAlt ?? null,
    secondaryCtaLabel: row.secondaryCtaLabel ?? null,
    secondaryCtaHref: row.secondaryCtaHref ?? null,
  };
}

// Public read — the live homepage only ever renders the published row.
export const getPublishedHeroContent = cache(async (): Promise<HeroContent> => {
  const db = getDb();
  const row = await db.query.homepageContent.findFirst({ where: eq(homepageContent.status, "published") });
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
