import type { Media } from "./media";

// The product/catalog TYPE model — shared by every layer that needs to
// know what a Product IS: the database schema (src/db/schema.ts), the
// admin product forms, the cart, and order verification. As of Phase 13,
// Neon is the sole authoritative catalog — this file intentionally no
// longer holds any product DATA or query logic. See
// src/server/queries/catalog.ts for the real, database-backed
// getPublishedProducts()/getProductBySlug()/getProductById()/etc., and
// CLAUDE.md "Product admin + database-backed catalog" for the full
// writeup of why the split landed here.

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

export const ADD_ON_CHARGE_TYPES = ["per-line", "per-unit"] as const;
export type AddOnChargeType = (typeof ADD_ON_CHARGE_TYPES)[number];

export type ProductAddOn = {
  slug: string;
  label: string;
  description?: string;
  price?: Money;
  // Required so cart/order math is never ambiguous about how this add-on
  // scales: "per-line" charges the price once per cart line regardless of
  // quantity (e.g. rush production); "per-unit" multiplies by quantity.
  chargeType: AddOnChargeType;
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

// Builds the conventional path for a product media asset — see
// public/images/products/[slug]/ in CLAUDE.md. Does not touch the file
// system; it only builds the string a real, already-placed file should
// live at.
export function productImagePath(slug: string, filename: string): string {
  return `/images/products/${slug}/${filename}`;
}

export const STORE_INDEX_HREF = "/store";

export function productHref(slug: string): string {
  return `/store/${slug}`;
}

export function isPublishedProduct(product: Product): boolean {
  return product.status === "published";
}

// Pure, dependency-free — used both client-side (the admin title→slug
// auto-fill, before the user has touched the slug field by hand) and
// server-side (final normalization in src/server/build-product-form.ts).
// The server-side normalization is what's ever actually authoritative;
// the client-side use is UX convenience only.
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
