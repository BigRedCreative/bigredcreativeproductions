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

function validateHeroContent(value: ReturnType<typeof buildHeroContentFromFormData>): string[] {
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
  const errors = validateHeroContent(value);
  if (errors.length > 0) {
    return { errors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(homepageContent)
        .set({ ...value, updatedAt: new Date() })
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
