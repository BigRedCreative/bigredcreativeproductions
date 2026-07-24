import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets, products, MEDIA_ASSET_STATUSES, MEDIA_ASSET_TYPES } from "@/db/schema";
import type { MediaAssetStatus, MediaAssetType } from "@/db/schema";

// The ONE place anything in the app reads a media_assets row from Neon.
// Server-only, zero insert/update/delete calls — mirrors the exact
// read/write split already established for products/orders/customers.

export type MediaAsset = {
  id: string;
  storageProvider: string;
  storageKey: string;
  url: string;
  type: MediaAssetType;
  mimeType: string;
  filename: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  alt: string;
  caption: string | null;
  status: MediaAssetStatus;
  createdByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapMediaAssetRow(row: typeof mediaAssets.$inferSelect): MediaAsset {
  return {
    id: row.id,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    url: row.url,
    type: row.type as MediaAssetType,
    mimeType: row.mimeType,
    filename: row.filename,
    originalFilename: row.originalFilename,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    alt: row.alt,
    caption: row.caption,
    status: row.status as MediaAssetStatus,
    createdByAdminUserId: row.createdByAdminUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const MEDIA_ASSETS_PAGE_SIZE = 25;

export type ListMediaAssetsParams = {
  page?: number;
  status?: string;
  type?: string;
  search?: string;
};

export type ListMediaAssetsResult = {
  rows: MediaAsset[];
  totalCount: number;
  page: number;
  pageCount: number;
};

function isValidMediaAssetStatus(value: string | undefined): value is MediaAssetStatus {
  return !!value && (MEDIA_ASSET_STATUSES as readonly string[]).includes(value);
}

function isValidMediaAssetType(value: string | undefined): value is MediaAssetType {
  return !!value && (MEDIA_ASSET_TYPES as readonly string[]).includes(value);
}

export async function listMediaAssets(params: ListMediaAssetsParams): Promise<ListMediaAssetsResult> {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * MEDIA_ASSETS_PAGE_SIZE;

  const conditions = [];
  if (isValidMediaAssetStatus(params.status)) {
    conditions.push(eq(mediaAssets.status, params.status));
  }
  if (isValidMediaAssetType(params.type)) {
    conditions.push(eq(mediaAssets.type, params.type));
  }
  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(mediaAssets.filename, pattern), ilike(mediaAssets.alt, pattern)));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(mediaAssets)
      .where(whereClause)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(MEDIA_ASSETS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(mediaAssets).where(whereClause),
  ]);

  const totalCount = totalResult[0]?.value ?? 0;

  return {
    rows: rows.map(mapMediaAssetRow),
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / MEDIA_ASSETS_PAGE_SIZE)),
  };
}

export async function getMediaAssetById(id: string): Promise<MediaAsset | undefined> {
  const db = getDb();
  const row = await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
  return row ? mapMediaAssetRow(row) : undefined;
}

// Batch lookup by id — used by src/server/queries/catalog.ts to resolve
// Product.media entries that carry a mediaAssetId, so a product's read
// path never issues one query per media item.
export async function getMediaAssetsByIds(ids: string[]): Promise<Map<string, MediaAsset>> {
  if (ids.length === 0) return new Map();
  const db = getDb();
  const rows = await db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
  return new Map(rows.map((row) => [row.id, mapMediaAssetRow(row)]));
}

// The "Choose from Media Library" picker's data source — active images
// only, most recent first, capped at a flat page size. No search/filter
// inside the picker yet: at this business's realistic scale a recent-first
// list is sufficient for v1, and the full library (with search/filter) is
// always one click away at /admin/media.
const PICKER_LIMIT = 60;

export async function getActiveImageAssetsForPicker(): Promise<MediaAsset[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, "active"), eq(mediaAssets.type, "image")))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(PICKER_LIMIT);
  return rows.map(mapMediaAssetRow);
}

// ---------------------------------------------------------------------
// Usage scanning — query-time, per Phase 15 approval (no separate
// media_usage tracking table for v1). Checks products.media's JSONB array
// for any entry whose mediaAssetId matches, using Postgres's own JSONB
// containment operator (`@>`) rather than pulling every product into the
// app to check in memory. Called before archiving (to show a non-blocking
// "in use by..." warning) and after replacing an asset (to know which
// product pages need revalidating) — the same scan serves both.
//
// Website-content fields (site_settings logos, homepage_content hero
// image) are NOT scanned here — they don't reference media_assets at all
// yet, per Phase 15's explicit scope (Product integration only; website
// integration is planned, not built, this phase).
// ---------------------------------------------------------------------

export type MediaAssetUsageRef = { productId: string; productSlug: string; productTitle: string };

export async function findProductsReferencingMediaAsset(mediaAssetId: string): Promise<MediaAssetUsageRef[]> {
  const db = getDb();
  const containment = JSON.stringify([{ mediaAssetId }]);
  const rows = await db
    .select({ id: products.id, slug: products.slug, title: products.title })
    .from(products)
    .where(sql`${products.media} @> ${containment}::jsonb`);
  return rows.map((row) => ({ productId: row.id, productSlug: row.slug, productTitle: row.title }));
}
