// Starter template for adding a new catalog product. Copy the object you
// need into the `products` array in src/data/products.ts and fill it in
// with real, confirmed information.
//
// This file is reference-only — it is never imported by the app, and
// neither example below is added to `products` or the build. Every value
// here is a labeled placeholder, not real data.
//
// Rules:
// - `id` is permanent. Never derive it from title/slug, never change it,
//   and never reuse one. `slug` may change later (e.g. a rename) without
//   breaking anything that references `id` — see CLAUDE.md "Catalog
//   system" for why this distinction exists.
// - `status` is required, not optional. New products should start as
//   "draft" until real content, media, and pricing are confirmed.
// - Never invent real pricing, deposits, turnaround guarantees, or client
//   facts. Leave pricing fields undefined until the number is real and
//   confirmed — same rule as the portfolio and services systems.
// - `media[0]` is treated as the primary/hero item. Leave `media: []`
//   entirely rather than pointing it at a stock/placeholder photo, unless
//   you're using the same hand-built branded-placeholder pattern documented
//   for the portfolio.
// - See CLAUDE.md → "Catalog system (commerce foundation)" for the full
//   field reference and validation rules.

import type { Product } from "./products";
import { productImagePath } from "./products";

// ---- Example: a physical product with options ----
// Demonstrates size/quantity/finish-style options with per-value price
// deltas. This shape is intentionally generic — it is not sticker-specific,
// even though stickers are the example used here.
export const physicalProductExample: Product = {
  id: "prod_example_sticker_001", // EXAMPLE PLACEHOLDER — never derive from slug/title
  slug: "example-die-cut-sticker",
  productType: "physical",
  title: "EXAMPLE — Die-Cut Sticker",
  shortTitle: "EXAMPLE Sticker",
  status: "draft",
  featured: false,
  category: "Stickers & Labels",
  summary: "EXAMPLE PLACEHOLDER — one sentence describing the product.",
  fullDescription: "EXAMPLE PLACEHOLDER — two or three sentences describing the product in more depth.",
  media: [
    {
      type: "image",
      src: productImagePath("example-die-cut-sticker", "example-hero.jpg"),
      alt: "EXAMPLE PLACEHOLDER — describe exactly what the image shows.",
    },
  ],
  options: [
    {
      key: "size",
      label: "Size",
      required: true,
      values: [
        { label: "3 in", value: "3in" },
        { label: "4 in", value: "4in", priceDelta: 0 }, // EXAMPLE — real delta TBD
      ],
    },
    {
      key: "finish",
      label: "Finish",
      required: true,
      values: [
        { label: "Matte", value: "matte" },
        { label: "Gloss", value: "gloss" },
      ],
    },
  ],
  pricing: {
    mode: "fixed-price",
    // basePrice intentionally omitted — no real, confirmed price yet.
    pricingNote: "EXAMPLE PLACEHOLDER — e.g. per-unit pricing note once confirmed.",
  },
  ctaLabel: "EXAMPLE — Order this product",
  seo: {
    title: "EXAMPLE — Die-Cut Sticker | Big Red Creative Productions",
    description: "EXAMPLE PLACEHOLDER SEO description.",
  },
};

// ---- Example: a service-type product with packages ----
// Demonstrates how a purchasable offering can link back to an existing,
// unmodified informational Service page via relatedServiceSlug, and how
// tiered packages (Basic/Standard/Premium) attach to a single product.
export const serviceProductExample: Product = {
  id: "prod_example_packaging_design_001", // EXAMPLE PLACEHOLDER
  slug: "example-packaging-design",
  productType: "service",
  title: "EXAMPLE — Packaging Design",
  shortTitle: "EXAMPLE Packaging Design",
  status: "draft",
  featured: false,
  category: "Design Services",
  summary: "EXAMPLE PLACEHOLDER — one sentence describing the offering.",
  fullDescription: "EXAMPLE PLACEHOLDER — two or three sentences describing the offering in more depth.",
  media: [],
  relatedServiceSlug: "packaging", // links back to the real, unmodified Packaging service page
  packages: [
    {
      slug: "basic",
      label: "EXAMPLE — Basic",
      description: "EXAMPLE PLACEHOLDER — what's included at this tier.",
      // price intentionally omitted — no real, confirmed price yet.
    },
    {
      slug: "standard",
      label: "EXAMPLE — Standard",
      description: "EXAMPLE PLACEHOLDER — what's included at this tier.",
    },
    {
      slug: "premium",
      label: "EXAMPLE — Premium",
      description: "EXAMPLE PLACEHOLDER — what's included at this tier.",
    },
  ],
  addOns: [
    {
      slug: "extra-revision",
      label: "EXAMPLE — Extra revision round",
      description: "EXAMPLE PLACEHOLDER add-on description.",
    },
  ],
  pricing: {
    mode: "starting-price",
    // startingPrice intentionally omitted — no real, confirmed price yet.
    pricingNote: "EXAMPLE PLACEHOLDER — e.g. \"starting at\" note once confirmed.",
  },
  ctaLabel: "EXAMPLE — Start a packaging design project",
  seo: {
    title: "EXAMPLE — Packaging Design | Big Red Creative Productions",
    description: "EXAMPLE PLACEHOLDER SEO description.",
  },
};
