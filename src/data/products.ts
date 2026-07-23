import { validateProducts } from "./products.validate";
import type { Media } from "./media";

// Catalog/data foundation only — see CLAUDE.md "Catalog system (commerce
// foundation)" for the full architecture writeup. No store route, cart,
// checkout, or admin exists yet; this file just establishes the shape and
// validation so those phases don't require a data-model migration later.

export const PRODUCT_CATEGORIES = [
  "Design Services",
  "Printing",
  "Stickers & Labels",
  "Event & Promotional",
  "Merchandise",
  "Other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_TYPES = ["physical", "service"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

// Unlike Project.status, Product.status is required (not optional) — see
// the `Product` type below for why.
export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PURCHASE_MODES = ["inquiry", "fixed-price", "starting-price", "deposit", "full-payment"] as const;
export type PurchaseMode = (typeof PURCHASE_MODES)[number];

// Integer cents. No currency field yet — USD implied, matching the rest of
// the site. Never store a float dollar amount in a Money field.
export type Money = number;

export type ProductOptionValue = {
  label: string;
  // Stable machine value for this choice (e.g. "3in") — independent of
  // `label` so the display text can change without breaking a reference.
  value: string;
  // May be negative (e.g. a smaller size costing less than the base price).
  priceDelta?: Money;
};

export type ProductOption = {
  // Stable machine key for this option (e.g. "size", "quantity", "finish",
  // "package", "turnaround") — intentionally generic, not sticker-specific.
  key: string;
  label: string;
  values: ProductOptionValue[];
  required: boolean;
};

export type ProductAddOn = {
  slug: string;
  label: string;
  description?: string;
  price?: Money;
};

export type ProductPackage = {
  slug: string;
  label: string;
  description: string;
  price?: Money;
  startingPrice?: Money;
  deliverables?: string[];
  turnaround?: string;
};

export type ProductPricing = {
  mode: PurchaseMode;
  basePrice?: Money;
  startingPrice?: Money;
  depositAmount?: Money;
  // Future use — always undefined today, no discount system exists yet.
  salePrice?: Money;
  pricingNote?: string;
};

export type Product = {
  // Permanent internal identity. Never derive from title/slug, never
  // changes once assigned, validated for uniqueness. Future orders should
  // reference product.id, not product.slug — see CLAUDE.md.
  id: string;
  // Editable public URL identity — may change over the product's life
  // without breaking historical references, because those reference `id`.
  slug: string;
  productType: ProductType;
  title: string;
  shortTitle: string;
  summary: string;
  fullDescription: string;
  // Required, not optional — a newly created product must explicitly state
  // its status so it can never become public by omission. A future admin
  // should default new products to "draft".
  status: ProductStatus;
  featured: boolean;
  category: ProductCategory;
  // Ordered; media[0] is the primary/hero item by convention. This is
  // deliberately a flat array (not a hero/gallery split like
  // Project/Service) so a future admin can drag-to-reorder it directly.
  media: Media[];
  options?: ProductOption[];
  packages?: ProductPackage[];
  addOns?: ProductAddOn[];
  pricing: ProductPricing;
  // Optional link back to an informational Service page (e.g. "packaging").
  // One-directional only — Service has no knowledge of this field.
  relatedServiceSlug?: string;
  ctaLabel: string;
  seo: {
    title: string;
    description: string;
  };
};

// Intentionally empty — no real, confirmed product/pricing data exists yet.
// See src/data/product.template.ts for a reference-only example of the
// shape; it is never imported here or anywhere else in the app.
export const products: Product[] = [];

// Fails loudly (build or dev server) with every problem listed at once if
// product data is invalid — see src/data/products.validate.ts.
validateProducts(products, {
  validTypes: PRODUCT_TYPES,
  validStatuses: PRODUCT_STATUSES,
  validCategories: PRODUCT_CATEGORIES,
  validPurchaseModes: PURCHASE_MODES,
});

// Builds the conventional path for a product media asset — see
// public/images/products/[slug]/ in CLAUDE.md. Does not touch the file
// system; it only builds the string a real, already-placed file should
// live at.
export function productImagePath(slug: string, filename: string): string {
  return `/images/products/${slug}/${filename}`;
}

// Planned public route shape — no /store or /store/[slug] route exists yet.
export function productHref(slug: string): string {
  return `/store/${slug}`;
}

export function isPublishedProduct(product: Product): boolean {
  return product.status === "published";
}

// The only product list that's safe to expose publicly. Draft and archived
// products are excluded from every public-facing lookup below.
export function getPublishedProducts(): Product[] {
  return products.filter(isPublishedProduct);
}

export function getProductBySlug(slug: string): Product | undefined {
  return getPublishedProducts().find((product) => product.slug === slug);
}

// Searches the full catalog, not just published products — a draft or
// archived product must still be resolvable by its permanent id (e.g. for a
// future order that references an item no longer publicly listed).
export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getFeaturedProducts(): Product[] {
  return getPublishedProducts().filter((product) => product.featured);
}

// Products that reference a given Service by slug — the one-directional
// link described in CLAUDE.md. Returns only published products.
export function getProductsByServiceSlug(serviceSlug: string): Product[] {
  return getPublishedProducts().filter((product) => product.relatedServiceSlug === serviceSlug);
}
