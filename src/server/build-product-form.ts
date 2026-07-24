import "server-only";
import { slugify } from "@/data/products";
import { dollarsToCents } from "@/server/dollars-to-cents";
import type { Media } from "@/data/media";
import type { Product, ProductAddOn, ProductOption, ProductPackage } from "@/data/products";

export type ProductFormResult =
  | { ok: true; product: Omit<Product, "id"> }
  | { ok: false; errors: string[] };

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

// Turns raw admin-form FormData into a candidate Product (minus id) — the
// ONE untrusted-input boundary for product create/edit. This does NOT
// validate business rules (required fields, pricing-mode consistency,
// media rules, etc.) — that's collectProductValidationErrors()'s job,
// called separately by src/server/mutate-product.ts, exactly per the
// "reuse the existing validator, don't build a second one" decision. This
// function only handles: shape parsing (JSON fields), dollars→cents
// conversion, and slug normalization.
export function buildProductFromFormData(formData: FormData): ProductFormResult {
  const errors: string[] = [];

  const title = getString(formData, "title");
  const shortTitle = getString(formData, "shortTitle");
  const slug = slugify(getString(formData, "slug") || title);
  const category = getString(formData, "category");
  const productType = getString(formData, "productType");
  const summary = getString(formData, "summary");
  const fullDescription = getString(formData, "fullDescription");
  const status = getString(formData, "status");
  const featured = formData.get("featured") === "on";
  const ctaLabel = getString(formData, "ctaLabel");
  const relatedServiceSlug = getString(formData, "relatedServiceSlug");
  const seoTitle = getString(formData, "seoTitle");
  const seoDescription = getString(formData, "seoDescription");

  const purchaseMode = getString(formData, "purchaseMode");
  const basePrice = dollarsToCents(getString(formData, "basePrice"));
  const startingPrice = dollarsToCents(getString(formData, "startingPrice"));
  const depositAmount = dollarsToCents(getString(formData, "depositAmount"));
  const pricingNote = getString(formData, "pricingNote");

  const options = parseJsonArray<ProductOption>(formData, "optionsJson", "Options", errors);
  const packages = parseJsonArray<ProductPackage>(formData, "packagesJson", "Packages", errors);
  const addOns = parseJsonArray<ProductAddOn>(formData, "addOnsJson", "Add-ons", errors);
  const media = parseJsonArray<Media>(formData, "mediaJson", "Media", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const product: Omit<Product, "id"> = {
    slug,
    productType: productType as Product["productType"],
    title,
    shortTitle,
    summary,
    fullDescription,
    status: status as Product["status"],
    featured,
    category: category as Product["category"],
    media,
    options: options.length > 0 ? options : undefined,
    packages: packages.length > 0 ? packages : undefined,
    addOns: addOns.length > 0 ? addOns : undefined,
    pricing: {
      mode: purchaseMode as Product["pricing"]["mode"],
      basePrice: basePrice ?? undefined,
      startingPrice: startingPrice ?? undefined,
      depositAmount: depositAmount ?? undefined,
      pricingNote: pricingNote || undefined,
    },
    relatedServiceSlug: relatedServiceSlug || undefined,
    ctaLabel,
    seo: { title: seoTitle, description: seoDescription },
  };

  return { ok: true, product };
}
