import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@/data/products";
import type { Product, ProductCategory, ProductStatus } from "@/data/products";
import { getMediaAssetsByIds } from "@/server/queries/media";

// The real, database-backed catalog — Neon is the sole authoritative
// product source as of Phase 13 (see CLAUDE.md "Product admin +
// database-backed catalog"). This module is the ONE place anything in the
// app reads a Product from the database; nothing outside it should import
// `@/db/schema`'s `products` table directly. Server-only, never imported
// by a client component.

// Drizzle only narrows JSONB columns via `.$type<T>()` — `productType`/
// `status`/`category` are plain `text` columns, so a fetched row's values
// are widened to `string`. This is the one place that narrows them back
// to their real union types, and normalizes nullable-JSONB/nullable-text
// columns (`null`) to `Product`'s "absent means `undefined`" convention.
function mapProductRow(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    slug: row.slug,
    productType: row.productType as Product["productType"],
    title: row.title,
    shortTitle: row.shortTitle,
    summary: row.summary,
    fullDescription: row.fullDescription,
    status: row.status as ProductStatus,
    featured: row.featured,
    category: row.category as ProductCategory,
    media: row.media,
    options: row.options ?? undefined,
    packages: row.packages ?? undefined,
    addOns: row.addOns ?? undefined,
    pricing: row.pricing,
    relatedServiceSlug: row.relatedServiceSlug ?? undefined,
    ctaLabel: row.ctaLabel,
    seo: row.seo,
  };
}

// Phase 15 — resolves any Product.media entry carrying a mediaAssetId
// against the live media_assets table, overriding its frozen `src` with
// the asset's current url. This is what lets replacing a media asset's
// underlying file (see src/server/mutate-media.ts's replaceMediaAssetAction)
// update every product referencing it with zero per-product edits. Legacy
// entries with no mediaAssetId pass through completely unchanged. Batches
// across every product/media item in one query rather than one lookup per
// item, since this runs on every public product read.
async function resolveProductsMedia(items: Product[]): Promise<Product[]> {
  const mediaAssetIds = new Set<string>();
  for (const product of items) {
    for (const media of product.media) {
      if (media.mediaAssetId) mediaAssetIds.add(media.mediaAssetId);
    }
  }
  if (mediaAssetIds.size === 0) return items;

  const assets = await getMediaAssetsByIds([...mediaAssetIds]);
  return items.map((product) => ({
    ...product,
    media: product.media.map((media) => {
      if (!media.mediaAssetId) return media;
      const asset = assets.get(media.mediaAssetId);
      return asset ? { ...media, src: asset.url } : media;
    }),
  }));
}

// ---------------------------------------------------------------------
// Public reads — published products only. Mirrors the exact function
// names/signatures the old array-backed src/data/products.ts exposed, so
// every caller (storefront pages, order verification) needed only an
// import-path change, not a rewrite.
// ---------------------------------------------------------------------

export async function getPublishedProducts(): Promise<Product[]> {
  const db = getDb();
  const rows = await db.select().from(products).where(eq(products.status, "published")).orderBy(desc(products.createdAt));
  return resolveProductsMedia(rows.map(mapProductRow));
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const db = getDb();
  const row = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
  });
  if (!row) return undefined;
  const [resolved] = await resolveProductsMedia([mapProductRow(row)]);
  return resolved;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const all = await getPublishedProducts();
  return all.filter((product) => product.featured);
}

export async function getProductsByServiceSlug(serviceSlug: string): Promise<Product[]> {
  const all = await getPublishedProducts();
  return all.filter((product) => product.relatedServiceSlug === serviceSlug);
}

// Searches the full catalog regardless of status — a draft or archived
// product must still resolve by its permanent id, for admin edit/preview
// AND for order verification (see src/server/product-source.ts), exactly
// matching the old array-backed function's documented behavior.
export async function getProductById(id: string): Promise<Product | undefined> {
  const db = getDb();
  const row = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!row) return undefined;
  const [resolved] = await resolveProductsMedia([mapProductRow(row)]);
  return resolved;
}

// ---------------------------------------------------------------------
// Admin reads — every status, paginated/filtered/searched.
// ---------------------------------------------------------------------

export const PRODUCTS_PAGE_SIZE = 25;

export type ProductListRow = {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  productType: Product["productType"];
  status: ProductStatus;
  featured: boolean;
  pricing: Product["pricing"];
  updatedAt: Date;
};

export type ListProductsParams = {
  page?: number;
  status?: string;
  category?: string;
  search?: string;
};

export type ListProductsResult = {
  rows: ProductListRow[];
  totalCount: number;
  page: number;
  pageCount: number;
};

function isValidProductStatus(value: string | undefined): value is ProductStatus {
  return !!value && (PRODUCT_STATUSES as readonly string[]).includes(value);
}

function isValidProductCategory(value: string | undefined): value is ProductCategory {
  return !!value && (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export async function listProducts(params: ListProductsParams): Promise<ListProductsResult> {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * PRODUCTS_PAGE_SIZE;

  const conditions = [];
  if (isValidProductStatus(params.status)) {
    conditions.push(eq(products.status, params.status));
  }
  if (isValidProductCategory(params.category)) {
    conditions.push(eq(products.category, params.category));
  }
  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(products.title, pattern), ilike(products.slug, pattern)));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        category: products.category,
        productType: products.productType,
        status: products.status,
        featured: products.featured,
        pricing: products.pricing,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updatedAt))
      .limit(PRODUCTS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(products).where(whereClause),
  ]);

  const totalCount = totalResult[0]?.value ?? 0;

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category as ProductCategory,
      productType: row.productType as Product["productType"],
      status: row.status as ProductStatus,
      featured: row.featured,
      pricing: row.pricing,
      updatedAt: row.updatedAt,
    })),
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / PRODUCTS_PAGE_SIZE)),
  };
}

