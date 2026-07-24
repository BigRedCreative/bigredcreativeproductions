import "server-only";
import { slugify } from "@/data/products";
import type { Service, ServiceImage, ServiceProcessStep } from "@/data/services";

// The one untrusted-input boundary for Service create/save-draft — mirrors
// build-product-form.ts exactly: shape parsing only (JSON array fields,
// slug normalization, hero/gallery assembly), never business validation.
// collectServiceValidationErrors() (called separately by mutate-service.ts)
// is the authoritative business-rule check, reused verbatim rather than
// duplicated here.
//
// Deliberately does NOT parse any of the 8 dormant commerce fields
// (startingPrice, pricingNote, turnaround, revisions, depositAmount,
// purchasable, intakeFormSlug, cartEligible) — none of them appear in the
// admin form this phase, so there is nothing to read from FormData for
// them. mutate-service.ts's UPDATE statement never includes these keys,
// which is what actually keeps their existing DB values untouched — see
// CLAUDE.md "Services + Portfolio Admin" for the full reasoning.

// The version-row content shape — every column EXCEPT the identity/
// bookkeeping ones (id, serviceId, versionType, updatedAt) and the 8
// dormant commerce fields, which mutate-service.ts never touches via this
// parser.
export type ServiceVersionContent = Omit<
  Service,
  | "id"
  | "status"
  | "startingPrice"
  | "pricingNote"
  | "turnaround"
  | "revisions"
  | "depositAmount"
  | "purchasable"
  | "intakeFormSlug"
  | "cartEligible"
>;

export type ServiceFormResult = { ok: true; content: ServiceVersionContent } | { ok: false; errors: string[] };

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseJson<T>(formData: FormData, key: string, label: string, errors: string[]): T | undefined {
  const raw = getString(formData, key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    errors.push(`${label}: submitted data is malformed.`);
    return undefined;
  }
}

export function buildServiceVersionFromFormData(formData: FormData): ServiceFormResult {
  const errors: string[] = [];

  const title = getString(formData, "title");
  const shortTitle = getString(formData, "shortTitle") || title;
  const slug = slugify(getString(formData, "slug") || title);
  const serviceNumber = getString(formData, "serviceNumber");
  const featured = formData.get("featured") === "on";
  const summary = getString(formData, "summary");
  const fullDescription = getString(formData, "fullDescription");
  const ctaLabel = getString(formData, "ctaLabel");
  const seoTitle = getString(formData, "seoTitle");
  const seoDescription = getString(formData, "seoDescription");

  const capabilities = parseJson<string[]>(formData, "capabilitiesJson", "Capabilities", errors) ?? [];
  const deliverables = parseJson<string[]>(formData, "deliverablesJson", "Deliverables", errors) ?? [];
  const process = parseJson<ServiceProcessStep[]>(formData, "processJson", "Process", errors) ?? [];
  const heroImage = parseJson<ServiceImage | null>(formData, "heroImageJson", "Hero image", errors);
  const gallery = parseJson<ServiceImage[]>(formData, "galleryJson", "Gallery", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const content: ServiceVersionContent = {
    slug,
    title,
    shortTitle,
    serviceNumber,
    featured,
    summary,
    fullDescription,
    capabilities,
    deliverables,
    process,
    ctaLabel,
    heroImage: heroImage && heroImage.src ? heroImage : undefined,
    gallery: gallery && gallery.length > 0 ? gallery : undefined,
    seo: { title: seoTitle, description: seoDescription },
  };

  return { ok: true, content };
}
