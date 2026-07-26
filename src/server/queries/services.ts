import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { services, serviceVersions } from "@/db/schema";
import type { Service } from "@/data/services";
import { getMediaAssetsByIds } from "@/server/queries/media";

// The ONE place anything in the app reads a Service from Neon, as of
// Phase 17's public runtime cutover — mirrors src/server/queries/catalog.ts's
// established shape: entity (permanent id + lifecycle status) joined to its
// PUBLISHED version row only, media resolved live, widened `string` columns
// narrowed back to their real union types. src/data/services.ts's `services`
// array is no longer read by any function in this file — see CLAUDE.md
// "Services + Portfolio Admin" for the full architecture writeup.

function mapServiceRow(
  entityRow: typeof services.$inferSelect,
  versionRow: typeof serviceVersions.$inferSelect,
): Service {
  return {
    id: entityRow.id,
    // "undefined means published" — the exact idiom Project.status already
    // used before this phase. Every row this file's queries return has
    // already been filtered to status='published' at the SQL level, so
    // this is always undefined in practice; written this way for
    // correctness rather than assuming that filter can never change.
    status: entityRow.status === "published" ? undefined : entityRow.status,
    slug: versionRow.slug,
    title: versionRow.title,
    shortTitle: versionRow.shortTitle,
    serviceNumber: versionRow.serviceNumber,
    featured: versionRow.featured,
    summary: versionRow.summary,
    fullDescription: versionRow.fullDescription,
    capabilities: versionRow.capabilities,
    deliverables: versionRow.deliverables,
    process: versionRow.process,
    ctaLabel: versionRow.ctaLabel,
    heroImage: versionRow.heroImageSrc
      ? {
          src: versionRow.heroImageSrc,
          alt: versionRow.heroImageAlt ?? "",
          mediaAssetId: versionRow.heroMediaAssetId ?? undefined,
        }
      : undefined,
    gallery: versionRow.gallery ?? undefined,
    seo: versionRow.seo,
    startingPrice: versionRow.startingPrice ?? undefined,
    pricingNote: versionRow.pricingNote ?? undefined,
    turnaround: versionRow.turnaround ?? undefined,
    revisions: versionRow.revisions ?? undefined,
    depositAmount: versionRow.depositAmount ?? undefined,
    purchasable: versionRow.purchasable ?? undefined,
    intakeFormSlug: versionRow.intakeFormSlug ?? undefined,
    cartEligible: versionRow.cartEligible ?? undefined,
  };
}

// Phase 15/16's live-resolution pattern, extended to services: any
// heroImage/gallery item carrying a mediaAssetId has its `src` overridden
// with the asset's CURRENT url before this ever reaches a page component.
// Items with no mediaAssetId (every current service, post-seed) pass
// through completely unchanged — this is what "preserve legacy hero/gallery
// paths exactly when no mediaAssetId exists" means in practice.
//
// Phase 19C — extended with a SECOND resolution pass for video posters,
// a direct structural port of resolveProjectsMedia()'s equivalent
// extension in src/server/queries/portfolio.ts. Step 1 (unchanged):
// resolve every heroImage/gallery mediaAssetId to its live asset,
// overwriting `src`. Step 2 (new): for any resolved gallery item that is
// a video with its own posterMediaAssetId (Phase 19A), batch-resolve
// THAT id too and attach the poster's current URL as `posterSrc` — a
// read-time-only enrichment, never written back to
// service_versions.gallery's JSONB. A video with no poster configured
// simply keeps `posterSrc` undefined.
async function resolveServicesMedia(items: Service[]): Promise<Service[]> {
  const mediaAssetIds = new Set<string>();
  for (const service of items) {
    if (service.heroImage?.mediaAssetId) mediaAssetIds.add(service.heroImage.mediaAssetId);
    for (const image of service.gallery ?? []) {
      if (image.mediaAssetId) mediaAssetIds.add(image.mediaAssetId);
    }
  }
  if (mediaAssetIds.size === 0) return items;

  const assets = await getMediaAssetsByIds([...mediaAssetIds]);

  const posterAssetIds = new Set<string>();
  for (const asset of assets.values()) {
    if (asset.type === "video" && asset.posterMediaAssetId) {
      posterAssetIds.add(asset.posterMediaAssetId);
    }
  }
  const posterAssets = posterAssetIds.size > 0 ? await getMediaAssetsByIds([...posterAssetIds]) : new Map();

  function resolvePosterSrc(mediaAssetId: string | undefined): string | undefined {
    if (!mediaAssetId) return undefined;
    const asset = assets.get(mediaAssetId);
    if (!asset || asset.type !== "video" || !asset.posterMediaAssetId) return undefined;
    return posterAssets.get(asset.posterMediaAssetId)?.url;
  }

  return items.map((service) => ({
    ...service,
    heroImage:
      service.heroImage && service.heroImage.mediaAssetId
        ? { ...service.heroImage, src: assets.get(service.heroImage.mediaAssetId)?.url ?? service.heroImage.src }
        : service.heroImage,
    gallery: service.gallery?.map((image) =>
      image.mediaAssetId
        ? { ...image, src: assets.get(image.mediaAssetId)?.url ?? image.src, posterSrc: resolvePosterSrc(image.mediaAssetId) }
        : image,
    ),
  }));
}

// Entity status = 'published' AND version_type = 'published' — both
// conditions required. A draft-only or archived entity never reaches this
// query at all, regardless of what its version rows contain.
export async function getPublishedServices(): Promise<Service[]> {
  const db = getDb();
  const rows = await db
    .select({ entity: services, version: serviceVersions })
    .from(services)
    .innerJoin(
      serviceVersions,
      and(eq(serviceVersions.serviceId, services.id), eq(serviceVersions.versionType, "published")),
    )
    .where(eq(services.status, "published"))
    .orderBy(asc(services.sortOrder));

  return resolveServicesMedia(rows.map((row) => mapServiceRow(row.entity, row.version)));
}

export async function getServiceBySlug(slug: string): Promise<Service | undefined> {
  const db = getDb();
  const rows = await db
    .select({ entity: services, version: serviceVersions })
    .from(services)
    .innerJoin(
      serviceVersions,
      and(eq(serviceVersions.serviceId, services.id), eq(serviceVersions.versionType, "published")),
    )
    .where(and(eq(services.status, "published"), eq(serviceVersions.slug, slug)))
    .limit(1);

  if (rows.length === 0) return undefined;
  const [resolved] = await resolveServicesMedia([mapServiceRow(rows[0].entity, rows[0].version)]);
  return resolved;
}

export async function getFeaturedServices(): Promise<Service[]> {
  const all = await getPublishedServices();
  return all.filter((service) => service.featured);
}

// ---------------------------------------------------------------------
// Admin reads — every entity, every status, both version rows where they
// exist. No field-level fallback merge (unlike Phase 14's site-content
// reads) — an editor needs to see exactly what's stored, the same
// principle already established for every other admin detail/edit read
// in this codebase (getBrandSettingsRowForAdmin, getProductById, etc.).
// ---------------------------------------------------------------------

export type ServiceAdminListRow = {
  id: string;
  status: (typeof services.$inferSelect)["status"];
  sortOrder: number;
  updatedAt: Date;
  draft: { slug: string; title: string; featured: boolean } | null;
  published: { slug: string; title: string; featured: boolean } | null;
};

// Flat, unpaginated — 7 services today, no filter/search UI. Matches the
// same "adequate at this business's realistic scale" reasoning already
// used for the Media Library picker's flat recent-first list.
export async function listServicesForAdmin(): Promise<ServiceAdminListRow[]> {
  const db = getDb();
  const [entityRows, versionRows] = await Promise.all([
    db.select().from(services).orderBy(asc(services.sortOrder)),
    db.select().from(serviceVersions),
  ]);

  const versionsByService = new Map<
    string,
    { draft?: typeof serviceVersions.$inferSelect; published?: typeof serviceVersions.$inferSelect }
  >();
  for (const version of versionRows) {
    const entry = versionsByService.get(version.serviceId) ?? {};
    if (version.versionType === "draft") entry.draft = version;
    else entry.published = version;
    versionsByService.set(version.serviceId, entry);
  }

  return entityRows.map((entity) => {
    const versions = versionsByService.get(entity.id) ?? {};
    return {
      id: entity.id,
      status: entity.status,
      sortOrder: entity.sortOrder,
      updatedAt: entity.updatedAt,
      draft: versions.draft
        ? { slug: versions.draft.slug, title: versions.draft.title, featured: versions.draft.featured }
        : null,
      published: versions.published
        ? { slug: versions.published.slug, title: versions.published.title, featured: versions.published.featured }
        : null,
    };
  });
}

export type ServiceAdminDetail = {
  entity: {
    id: string;
    status: (typeof services.$inferSelect)["status"];
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };
  draft: Service;
  published: Service | null;
};

export async function getServiceEntityForAdmin(id: string): Promise<ServiceAdminDetail | undefined> {
  const db = getDb();
  const entityRow = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!entityRow) return undefined;

  const versionRows = await db.select().from(serviceVersions).where(eq(serviceVersions.serviceId, id));
  const draftRow = versionRows.find((row) => row.versionType === "draft");
  const publishedRow = versionRows.find((row) => row.versionType === "published");
  if (!draftRow) return undefined;

  const [draft] = await resolveServicesMedia([mapServiceRow(entityRow, draftRow)]);
  const published = publishedRow ? (await resolveServicesMedia([mapServiceRow(entityRow, publishedRow)]))[0] : null;

  return {
    entity: {
      id: entityRow.id,
      status: entityRow.status,
      sortOrder: entityRow.sortOrder,
      createdAt: entityRow.createdAt,
      updatedAt: entityRow.updatedAt,
    },
    draft,
    published: published ?? null,
  };
}
