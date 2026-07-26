"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings, navigationItems, homepageContent, contactContent } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import {
  buildSiteSettingsFromFormData,
  buildNavigationFromFormData,
  buildContactContentFromFormData,
  buildHeroContentFromFormData,
} from "@/server/build-website-content-form";
import {
  validateRequiredText,
  validateEmailShape,
  validateHref,
  validateAbsoluteHttpsUrl,
  validateOptionalLocalMediaPath,
  validateRequiredLocalMediaPath,
} from "@/server/validate-website-content";
import { getMediaAssetsByIds } from "@/server/queries/media";

// Every Phase 14 content mutation lives here. Every export independently
// calls requireAdminUser() as its first line — this file is a Server
// Action boundary, not covered by the protected admin layout's own check
// (see CLAUDE.md "Admin foundation"). Each write is wrapped in a
// db.transaction() alongside its recordAuditEvent(tx, ...) call so the
// content change and its audit trail can never drift apart.

export type WebsiteContentFormState = { errors: string[] } | { success: true } | null;

// Known, fixed public routes revalidated immediately on a navigation
// change. Header/Footer are not in a shared root layout (see CLAUDE.md —
// documented technical debt, not changed this phase), so full instant
// propagation to every dynamic detail route (/store/[slug], /work/[slug],
// /services/[slug]) isn't attempted here; those pick up the change via the
// existing revalidate = 3600 ISR fallback already in place for those
// routes, per the approved Phase 14 revalidation strategy.
const KNOWN_MAJOR_ROUTES = ["/", "/store", "/cart", "/checkout"] as const;

function revalidateKnownMajorRoutes(): void {
  for (const route of KNOWN_MAJOR_ROUTES) {
    revalidatePath(route);
  }
}

// ---------------------------------------------------------------------
// site_settings — immediate/current, no draft state.
// ---------------------------------------------------------------------

export async function updateSiteSettingsAction(
  _prevState: WebsiteContentFormState,
  formData: FormData,
): Promise<WebsiteContentFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildSiteSettingsFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }
  const value = parsed.value;

  const errors: string[] = [];
  const pushIfError = (result: string | null) => {
    if (result) errors.push(result);
  };

  pushIfError(validateRequiredText(value.siteName, "Site name"));
  pushIfError(validateRequiredText(value.legalName, "Legal name"));
  pushIfError(validateRequiredText(value.tagline, "Tagline"));
  pushIfError(validateEmailShape(value.contactEmail, "Contact email"));
  pushIfError(validateRequiredText(value.location, "Location"));
  pushIfError(validateRequiredText(value.metaTitle, "Meta title"));
  pushIfError(validateRequiredText(value.metaDescription, "Meta description"));
  pushIfError(validateRequiredText(value.ogDescription, "Social share description"));
  pushIfError(validateAbsoluteHttpsUrl(value.canonicalUrl, "Canonical URL"));
  pushIfError(validateRequiredLocalMediaPath(value.logoHorizontalSrc, "Primary logo"));
  pushIfError(validateRequiredLocalMediaPath(value.logoWhiteSrc, "Alternate logo"));
  if (value.ogImageSrc) {
    pushIfError(validateOptionalLocalMediaPath(value.ogImageSrc, "Social share image"));
  }
  value.socialLinks.forEach((link, i) => {
    pushIfError(validateRequiredText(link.platform, `Social link ${i + 1}: platform`));
    pushIfError(validateAbsoluteHttpsUrl(link.url, `Social link ${i + 1}: URL`));
  });

  if (errors.length > 0) {
    return { errors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(siteSettings)
        .set({ ...value, updatedAt: new Date() })
        .where(eq(siteSettings.id, "default"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.settings.updated",
        entityType: "site_settings",
        entityId: "default",
        metadata: { siteName: value.siteName, metaTitle: value.metaTitle },
      });
    });
  } catch (error) {
    console.error("Site settings update failed", { error });
    return { errors: ["We couldn't save these settings. Please try again."] };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ---------------------------------------------------------------------
// navigation_items — immediate/current, no draft state.
// ---------------------------------------------------------------------

export async function updateNavigationAction(
  _prevState: WebsiteContentFormState,
  formData: FormData,
): Promise<WebsiteContentFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildNavigationFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }
  const { primaryItems, headerCtaLabel, headerCtaHref } = parsed.value;

  const errors: string[] = [];
  const pushIfError = (result: string | null) => {
    if (result) errors.push(result);
  };

  if (primaryItems.length === 0) {
    errors.push("At least one primary navigation item is required.");
  }
  primaryItems.forEach((item, i) => {
    pushIfError(validateRequiredText(item.label, `Nav item ${i + 1}: label`));
    pushIfError(validateHref(item.href, `Nav item ${i + 1}: link`));
  });
  pushIfError(validateRequiredText(headerCtaLabel, "Header button label"));
  pushIfError(validateHref(headerCtaHref, "Header button link"));

  if (errors.length > 0) {
    return { errors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.delete(navigationItems).where(eq(navigationItems.placement, "primary"));
      if (primaryItems.length > 0) {
        await tx.insert(navigationItems).values(
          primaryItems.map((item, index) => ({
            placement: "primary" as const,
            label: item.label,
            href: item.href,
            enabled: item.enabled,
            sortOrder: index,
          })),
        );
      }
      await tx
        .update(navigationItems)
        .set({ label: headerCtaLabel, href: headerCtaHref, updatedAt: new Date() })
        .where(eq(navigationItems.placement, "header_cta"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.navigation.updated",
        entityType: "navigation_items",
        entityId: "primary+header_cta",
        metadata: { itemCount: primaryItems.length },
      });
    });
  } catch (error) {
    console.error("Navigation update failed", { error });
    return { errors: ["We couldn't save the navigation. Please try again."] };
  }

  revalidateKnownMajorRoutes();
  return { success: true };
}

// ---------------------------------------------------------------------
// contact_content — immediate/current, no draft state.
// ---------------------------------------------------------------------

export async function updateContactContentAction(
  _prevState: WebsiteContentFormState,
  formData: FormData,
): Promise<WebsiteContentFormState> {
  const adminUser = await requireAdminUser();

  const value = buildContactContentFromFormData(formData);

  const errors: string[] = [];
  const pushIfError = (result: string | null) => {
    if (result) errors.push(result);
  };
  pushIfError(validateRequiredText(value.kicker, "Kicker"));
  pushIfError(validateRequiredText(value.heading, "Heading"));
  pushIfError(validateRequiredText(value.description, "Description"));
  pushIfError(validateRequiredText(value.submitLabel, "Submit button label"));

  if (errors.length > 0) {
    return { errors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(contactContent)
        .set({ ...value, updatedAt: new Date() })
        .where(eq(contactContent.id, "default"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.contact.updated",
        entityType: "contact_content",
        entityId: "default",
        metadata: { heading: value.heading },
      });
    });
  } catch (error) {
    console.error("Contact content update failed", { error });
    return { errors: ["We couldn't save the contact section. Please try again."] };
  }

  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------
// homepage_content — draft/published split.
// ---------------------------------------------------------------------

// Phase 19D-2 — the one place that decides what's ALLOWED to reach
// homepage_content's hero-media columns. Never trusts the client's mode
// selector, the picker's own filtering, or which hidden form fields
// happen to be populated — mutual exclusivity is re-derived purely from
// which raw values are actually present. A Media Library selection
// (heroMediaAssetId) always wins and forces heroImageSrc null — this is
// what makes "never copy the Blob URL into heroImageSrc" and "no stale
// manual fallback behind a selected Media Library asset" true by
// construction, not by convention. Only when no Media Library selection
// exists does the legacy manual path apply.
type NormalizedHeroMedia = { heroMediaAssetId: string | null; heroImageSrc: string | null; heroImageAlt: string | null };

function normalizeHeroMediaFields(raw: { heroMediaAssetId: string | null; heroImageSrc: string | null; heroImageAlt: string | null }): NormalizedHeroMedia {
  if (raw.heroMediaAssetId) {
    return { heroMediaAssetId: raw.heroMediaAssetId, heroImageSrc: null, heroImageAlt: raw.heroImageAlt };
  }
  if (raw.heroImageSrc) {
    return { heroMediaAssetId: null, heroImageSrc: raw.heroImageSrc, heroImageAlt: raw.heroImageAlt };
  }
  return { heroMediaAssetId: null, heroImageSrc: null, heroImageAlt: null };
}

// Phase 19D-2 — the deeper, real-Neon-data check validateHeroContent()
// can't do on its own (no database access, by design). Never trusts that
// the admin picker's own "active only" filtering was the only gate — a
// stale page, a race with someone archiving the asset mid-edit, or a
// hand-crafted request are all caught identically here. Deliberately
// checks BOTH image and video references (not just video, unlike
// Portfolio/Service galleries) — the hero's single slot can legitimately
// be either type, so both need the same real-asset guarantee. A
// previously-published reference to an asset that later becomes archived
// keeps resolving fine at read time (see resolveHeroMedia() in
// queries/site-content.ts) — only a NEW draft save is rejected here.
async function validateHeroMediaAsset(heroMediaAssetId: string | null): Promise<string[]> {
  if (!heroMediaAssetId) return [];
  const assets = await getMediaAssetsByIds([heroMediaAssetId]);
  const asset = assets.get(heroMediaAssetId);
  if (!asset) {
    return ["The selected hero media no longer exists in the Media Library."];
  }
  if (asset.status !== "active") {
    return [`"${asset.filename}" is archived and can't be selected for a new hero media save. Choose an active image or video instead.`];
  }
  if (asset.type !== "image" && asset.type !== "video") {
    return [`"${asset.filename}" is not a supported hero media type.`];
  }
  return [];
}

function validateHeroContent(value: ReturnType<typeof buildHeroContentFromFormData>, media: NormalizedHeroMedia): string[] {
  const errors: string[] = [];
  const pushIfError = (result: string | null) => {
    if (result) errors.push(result);
  };
  pushIfError(validateRequiredText(value.badgePrimary, "Badge (primary)"));
  pushIfError(validateRequiredText(value.badgeSecondary, "Badge (secondary)"));
  pushIfError(validateRequiredText(value.eyebrow, "Eyebrow"));
  pushIfError(validateRequiredText(value.headlineLead, "Headline"));
  pushIfError(validateRequiredText(value.headlineAccent, "Headline (accent)"));
  pushIfError(validateRequiredText(value.tagline, "Tagline"));
  pushIfError(validateRequiredText(value.supportingCopy, "Supporting copy"));
  pushIfError(validateRequiredText(value.ctaLabel, "Button label"));
  pushIfError(validateHref(value.ctaHref, "Button link"));
  // Only relevant when the legacy manual path is actually the active
  // mode (media.heroImageSrc is null whenever a Media Library asset is
  // selected instead, per normalizeHeroMediaFields() above).
  if (media.heroImageSrc) {
    pushIfError(validateOptionalLocalMediaPath(media.heroImageSrc, "Hero image path"));
  }
  return errors;
}

// Saves the DRAFT row only — never touches the published row, never
// revalidates the public site. This is what "Save Draft" does.
export async function saveHeroDraftAction(
  _prevState: WebsiteContentFormState,
  formData: FormData,
): Promise<WebsiteContentFormState> {
  const adminUser = await requireAdminUser();

  const value = buildHeroContentFromFormData(formData);
  // Normalize BEFORE validating/writing — mutual exclusivity is enforced
  // here, server-side, regardless of what the client's hidden fields
  // happened to contain (see normalizeHeroMediaFields()'s own comment).
  const media = normalizeHeroMediaFields(value);
  const errors = validateHeroContent(value, media);
  if (errors.length > 0) {
    return { errors };
  }
  const mediaAssetErrors = await validateHeroMediaAsset(media.heroMediaAssetId);
  if (mediaAssetErrors.length > 0) {
    return { errors: mediaAssetErrors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(homepageContent)
        // `media` spreads AFTER `value` so the normalized, authoritative
        // heroMediaAssetId/heroImageSrc/heroImageAlt always win over
        // whatever raw values the client submitted — this is the actual
        // enforcement point, not just documentation of intent.
        .set({ ...value, ...media, updatedAt: new Date() })
        .where(eq(homepageContent.status, "draft"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.hero.draft_saved",
        entityType: "homepage_content",
        entityId: "draft",
        metadata: { headlineLead: value.headlineLead },
      });
    });
  } catch (error) {
    console.error("Hero draft save failed", { error });
    return { errors: ["We couldn't save the draft. Please try again."] };
  }

  return { success: true };
}

// Copies the CURRENT draft row's content onto the published row —
// transactionally, with no form input of its own. This is what "Publish"
// does: it publishes whatever was last saved as a draft, never content the
// admin hasn't explicitly saved first (Save Draft -> Preview -> Publish is
// a deliberate three-step flow, not collapsed into one).
// Signature matches useActionState's required (state, payload) shape; publish
// takes no form input of its own, see comment above.
export async function publishHeroAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: WebsiteContentFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<WebsiteContentFormState> {
  const adminUser = await requireAdminUser();

  const db = getDb();
  try {
    const draftRow = await db.query.homepageContent.findFirst({ where: eq(homepageContent.status, "draft") });
    if (!draftRow) {
      return { errors: ["No draft content was found to publish."] };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(homepageContent)
        .set({
          badgePrimary: draftRow.badgePrimary,
          badgeSecondary: draftRow.badgeSecondary,
          eyebrow: draftRow.eyebrow,
          headlineLead: draftRow.headlineLead,
          headlineAccent: draftRow.headlineAccent,
          tagline: draftRow.tagline,
          supportingCopy: draftRow.supportingCopy,
          ctaLabel: draftRow.ctaLabel,
          ctaHref: draftRow.ctaHref,
          heroImageSrc: draftRow.heroImageSrc,
          heroImageAlt: draftRow.heroImageAlt,
          heroMediaAssetId: draftRow.heroMediaAssetId,
          secondaryCtaLabel: draftRow.secondaryCtaLabel,
          secondaryCtaHref: draftRow.secondaryCtaHref,
          updatedAt: new Date(),
        })
        .where(eq(homepageContent.status, "published"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.hero.published",
        entityType: "homepage_content",
        entityId: "published",
        metadata: { headlineLead: draftRow.headlineLead },
      });
    });
  } catch (error) {
    console.error("Hero publish failed", { error });
    return { errors: ["We couldn't publish these changes. Please try again."] };
  }

  revalidatePath("/");
  return { success: true };
}
