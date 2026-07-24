import "server-only";

// Turns raw admin FormData into candidate shapes — the untrusted-input
// boundary for every Phase 14 website-content mutation, mirroring the
// exact split already established by src/server/build-product-form.ts:
// this file only handles shape parsing (strings, JSON arrays, booleans),
// never business validation — that's src/server/validate-website-content.ts
// and each mutate-website-content.ts action's job.

export function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string): string | null {
  const value = getString(formData, key);
  return value ? value : null;
}

function parseJsonArray<T>(formData: FormData, key: string, label: string, errors: string[]): T[] {
  const raw = getString(formData, key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      errors.push(`${label}: submitted data is malformed.`);
      return [];
    }
    return parsed as T[];
  } catch {
    errors.push(`${label}: submitted data is malformed.`);
    return [];
  }
}

// --- site_settings -----------------------------------------------------

export type SocialLinkInput = { platform: string; url: string };

export type SiteSettingsFormResult =
  | {
      ok: true;
      value: {
        siteName: string;
        legalName: string;
        tagline: string;
        contactEmail: string;
        contactPhone: string | null;
        location: string;
        socialLinks: SocialLinkInput[];
        metaTitle: string;
        metaDescription: string;
        ogDescription: string;
        ogImageSrc: string | null;
        canonicalUrl: string;
        logoHorizontalSrc: string;
        logoWhiteSrc: string;
      };
    }
  | { ok: false; errors: string[] };

export function buildSiteSettingsFromFormData(formData: FormData): SiteSettingsFormResult {
  const errors: string[] = [];
  const socialLinks = parseJsonArray<SocialLinkInput>(formData, "socialLinksJson", "Social links", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      siteName: getString(formData, "siteName"),
      legalName: getString(formData, "legalName"),
      tagline: getString(formData, "tagline"),
      contactEmail: getString(formData, "contactEmail"),
      contactPhone: getNullableString(formData, "contactPhone"),
      location: getString(formData, "location"),
      socialLinks,
      metaTitle: getString(formData, "metaTitle"),
      metaDescription: getString(formData, "metaDescription"),
      ogDescription: getString(formData, "ogDescription"),
      ogImageSrc: getNullableString(formData, "ogImageSrc"),
      canonicalUrl: getString(formData, "canonicalUrl"),
      logoHorizontalSrc: getString(formData, "logoHorizontalSrc"),
      logoWhiteSrc: getString(formData, "logoWhiteSrc"),
    },
  };
}

// --- navigation_items ----------------------------------------------------

export type NavItemInput = { label: string; href: string; enabled: boolean };

export type NavigationFormResult =
  | {
      ok: true;
      value: {
        primaryItems: NavItemInput[];
        headerCtaLabel: string;
        headerCtaHref: string;
      };
    }
  | { ok: false; errors: string[] };

export function buildNavigationFromFormData(formData: FormData): NavigationFormResult {
  const errors: string[] = [];
  const primaryItems = parseJsonArray<NavItemInput>(formData, "primaryItemsJson", "Navigation items", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      primaryItems,
      headerCtaLabel: getString(formData, "headerCtaLabel"),
      headerCtaHref: getString(formData, "headerCtaHref"),
    },
  };
}

// --- contact_content -----------------------------------------------------

export type ContactContentFormValue = {
  kicker: string;
  heading: string;
  description: string;
  submitLabel: string;
};

export function buildContactContentFromFormData(formData: FormData): ContactContentFormValue {
  return {
    kicker: getString(formData, "kicker"),
    heading: getString(formData, "heading"),
    description: getString(formData, "description"),
    submitLabel: getString(formData, "submitLabel"),
  };
}

// --- homepage_content (hero) ---------------------------------------------

export type HeroContentFormValue = {
  badgePrimary: string;
  badgeSecondary: string;
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  tagline: string;
  supportingCopy: string;
  ctaLabel: string;
  ctaHref: string;
};

export function buildHeroContentFromFormData(formData: FormData): HeroContentFormValue {
  return {
    badgePrimary: getString(formData, "badgePrimary"),
    badgeSecondary: getString(formData, "badgeSecondary"),
    eyebrow: getString(formData, "eyebrow"),
    headlineLead: getString(formData, "headlineLead"),
    headlineAccent: getString(formData, "headlineAccent"),
    tagline: getString(formData, "tagline"),
    supportingCopy: getString(formData, "supportingCopy"),
    ctaLabel: getString(formData, "ctaLabel"),
    ctaHref: getString(formData, "ctaHref"),
  };
}
