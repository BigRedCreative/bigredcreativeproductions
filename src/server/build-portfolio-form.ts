import "server-only";
import { slugify } from "@/data/products";
import type { Project, ProjectImage, ProjectExternalLink, ProjectResult, ProjectCredit } from "@/data/projects";

// The one untrusted-input boundary for Portfolio create/save-draft — mirrors
// build-service-form.ts exactly: shape parsing only (JSON fields, slug
// normalization), never business validation. collectProjectValidationErrors()
// (called separately by mutate-portfolio.ts) is the authoritative check,
// reused verbatim rather than duplicated here.

// The version-row content shape — every column except the identity/
// bookkeeping ones (id, status). `thumbnail` is deliberately absent — not
// part of the database schema, never parsed here.
export type PortfolioVersionContent = Omit<Project, "id" | "status" | "thumbnail">;

export type PortfolioFormResult = { ok: true; content: PortfolioVersionContent } | { ok: false; errors: string[] };

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

export function buildPortfolioVersionFromFormData(formData: FormData): PortfolioFormResult {
  const errors: string[] = [];

  const title = getString(formData, "title");
  const shortTitle = getString(formData, "shortTitle") || title;
  const slug = slugify(getString(formData, "slug") || title);
  const category = getString(formData, "category") as Project["category"];
  const summary = getString(formData, "summary");
  const fullDescription = getString(formData, "fullDescription");
  const client = getString(formData, "client");
  const year = getString(formData, "year");
  const featured = formData.get("featured") === "on";
  const className = getString(formData, "className");
  const stamp = getString(formData, "stamp");
  const seoTitle = getString(formData, "seoTitle");
  const seoDescription = getString(formData, "seoDescription");

  const services = parseJson<string[]>(formData, "servicesJson", "Services", errors) ?? [];
  const heroImage = parseJson<ProjectImage | null>(formData, "heroImageJson", "Hero image", errors);
  const gallery = parseJson<ProjectImage[]>(formData, "galleryJson", "Gallery", errors);
  const externalLink = parseJson<ProjectExternalLink | null>(formData, "externalLinkJson", "External link", errors);
  const results = parseJson<ProjectResult[]>(formData, "resultsJson", "Results", errors);
  const credits = parseJson<ProjectCredit[]>(formData, "creditsJson", "Credits", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const content: PortfolioVersionContent = {
    slug,
    title,
    shortTitle,
    category,
    services,
    summary,
    fullDescription,
    client: client || undefined,
    year: year || undefined,
    featured,
    className,
    stamp,
    heroImage: heroImage && heroImage.src ? heroImage : undefined,
    gallery: gallery && gallery.length > 0 ? gallery : undefined,
    externalLink: externalLink && externalLink.url ? externalLink : undefined,
    results: results && results.length > 0 ? results : undefined,
    credits: credits && credits.length > 0 ? credits : undefined,
    seo: { title: seoTitle, description: seoDescription },
  };

  return { ok: true, content };
}
