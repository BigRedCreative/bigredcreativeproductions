import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { portfolioProjects, portfolioProjectVersions } from "@/db/schema";
import { MAX_FEATURED_PROJECTS } from "@/data/projects";
import type { Project } from "@/data/projects";
import { getMediaAssetsByIds } from "@/server/queries/media";

// The ONE place anything in the app reads a Project from Neon, as of
// Phase 17's public runtime cutover — mirrors src/server/queries/services.ts
// and src/server/queries/catalog.ts exactly. src/data/projects.ts's
// `projects` array is no longer read by any function in this file.
//
// `thumbnail` has no equivalent column here — confirmed dead/unrendered
// (ProjectCard.tsx never reads it) and intentionally omitted from the
// schema per approval; a mapped Project from this file never sets it.

function mapProjectRow(
  entityRow: typeof portfolioProjects.$inferSelect,
  versionRow: typeof portfolioProjectVersions.$inferSelect,
): Project {
  return {
    id: entityRow.id,
    slug: versionRow.slug,
    title: versionRow.title,
    shortTitle: versionRow.shortTitle,
    category: versionRow.category as Project["category"],
    services: versionRow.services,
    summary: versionRow.summary,
    fullDescription: versionRow.fullDescription,
    client: versionRow.client ?? undefined,
    year: versionRow.year ?? undefined,
    featured: versionRow.featured,
    className: versionRow.className,
    stamp: versionRow.stamp,
    heroImage: versionRow.heroImageSrc
      ? {
          src: versionRow.heroImageSrc,
          alt: versionRow.heroImageAlt ?? "",
          mediaAssetId: versionRow.heroMediaAssetId ?? undefined,
        }
      : undefined,
    gallery: versionRow.gallery ?? undefined,
    externalLink: versionRow.externalLink ?? undefined,
    results: versionRow.results ?? undefined,
    credits: versionRow.credits ?? undefined,
    seo: versionRow.seo,
    // Every row returned by this file's queries is already filtered to
    // entity status='published' at the SQL level — "undefined means
    // published" stays accurate here.
  };
}

async function resolveProjectsMedia(items: Project[]): Promise<Project[]> {
  const mediaAssetIds = new Set<string>();
  for (const project of items) {
    if (project.heroImage?.mediaAssetId) mediaAssetIds.add(project.heroImage.mediaAssetId);
    for (const image of project.gallery ?? []) {
      if (image.mediaAssetId) mediaAssetIds.add(image.mediaAssetId);
    }
  }
  if (mediaAssetIds.size === 0) return items;

  const assets = await getMediaAssetsByIds([...mediaAssetIds]);
  return items.map((project) => ({
    ...project,
    heroImage:
      project.heroImage && project.heroImage.mediaAssetId
        ? { ...project.heroImage, src: assets.get(project.heroImage.mediaAssetId)?.url ?? project.heroImage.src }
        : project.heroImage,
    gallery: project.gallery?.map((image) =>
      image.mediaAssetId ? { ...image, src: assets.get(image.mediaAssetId)?.url ?? image.src } : image,
    ),
  }));
}

// Entity status = 'published' AND version_type = 'published', ordered by
// the entity's sortOrder — which the seed populated directly from the old
// array's order, so this is identical to today's "array order" ordering
// immediately after cutover.
export async function getPublishedProjects(): Promise<Project[]> {
  const db = getDb();
  const rows = await db
    .select({ entity: portfolioProjects, version: portfolioProjectVersions })
    .from(portfolioProjects)
    .innerJoin(
      portfolioProjectVersions,
      and(
        eq(portfolioProjectVersions.projectId, portfolioProjects.id),
        eq(portfolioProjectVersions.versionType, "published"),
      ),
    )
    .where(eq(portfolioProjects.status, "published"))
    .orderBy(asc(portfolioProjects.sortOrder));

  return resolveProjectsMedia(rows.map((row) => mapProjectRow(row.entity, row.version)));
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const db = getDb();
  const rows = await db
    .select({ entity: portfolioProjects, version: portfolioProjectVersions })
    .from(portfolioProjects)
    .innerJoin(
      portfolioProjectVersions,
      and(
        eq(portfolioProjectVersions.projectId, portfolioProjects.id),
        eq(portfolioProjectVersions.versionType, "published"),
      ),
    )
    .where(and(eq(portfolioProjects.status, "published"), eq(portfolioProjectVersions.slug, slug)))
    .limit(1);

  if (rows.length === 0) return undefined;
  const [resolved] = await resolveProjectsMedia([mapProjectRow(rows[0].entity, rows[0].version)]);
  return resolved;
}

// Same cap/order semantics as the old array-backed getFeaturedProjects():
// featured, in sortOrder, capped at MAX_FEATURED_PROJECTS — the layout
// never breaks no matter how many entities are flagged featured.
export async function getFeaturedProjects(): Promise<Project[]> {
  const all = await getPublishedProjects();
  return all.filter((project) => project.featured).slice(0, MAX_FEATURED_PROJECTS);
}

// Same wrap-around semantics as the old array-backed getAdjacentProjects(),
// just walking the Neon-ordered (sortOrder) published list instead of the
// static array's order.
export async function getAdjacentProjects(slug: string): Promise<{
  previous?: Project;
  next?: Project;
}> {
  const published = await getPublishedProjects();
  const index = published.findIndex((project) => project.slug === slug);
  if (index === -1 || published.length <= 1) {
    return {};
  }
  return {
    previous: published[(index - 1 + published.length) % published.length],
    next: published[(index + 1) % published.length],
  };
}

// ---------------------------------------------------------------------
// Admin reads — every entity, every status, both version rows where they
// exist. No field-level fallback merge — an editor needs to see exactly
// what's stored, the same principle already established by
// getServiceEntityForAdmin() and every other admin detail/edit read in
// this codebase.
// ---------------------------------------------------------------------

export type PortfolioAdminListRow = {
  id: string;
  status: (typeof portfolioProjects.$inferSelect)["status"];
  sortOrder: number;
  updatedAt: Date;
  draft: { slug: string; title: string; featured: boolean } | null;
  published: { slug: string; title: string; featured: boolean } | null;
};

// Flat, unpaginated — 4 projects today, no filter/search UI, mirrors
// listServicesForAdmin()'s exact reasoning.
export async function listPortfolioForAdmin(): Promise<PortfolioAdminListRow[]> {
  const db = getDb();
  const [entityRows, versionRows] = await Promise.all([
    db.select().from(portfolioProjects).orderBy(asc(portfolioProjects.sortOrder)),
    db.select().from(portfolioProjectVersions),
  ]);

  const versionsByProject = new Map<
    string,
    { draft?: typeof portfolioProjectVersions.$inferSelect; published?: typeof portfolioProjectVersions.$inferSelect }
  >();
  for (const version of versionRows) {
    const entry = versionsByProject.get(version.projectId) ?? {};
    if (version.versionType === "draft") entry.draft = version;
    else entry.published = version;
    versionsByProject.set(version.projectId, entry);
  }

  return entityRows.map((entity) => {
    const versions = versionsByProject.get(entity.id) ?? {};
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

export type PortfolioAdminDetail = {
  entity: {
    id: string;
    status: (typeof portfolioProjects.$inferSelect)["status"];
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };
  draft: Project;
  published: Project | null;
};

export async function getPortfolioEntityForAdmin(id: string): Promise<PortfolioAdminDetail | undefined> {
  const db = getDb();
  const entityRow = await db.query.portfolioProjects.findFirst({ where: eq(portfolioProjects.id, id) });
  if (!entityRow) return undefined;

  const versionRows = await db.select().from(portfolioProjectVersions).where(eq(portfolioProjectVersions.projectId, id));
  const draftRow = versionRows.find((row) => row.versionType === "draft");
  const publishedRow = versionRows.find((row) => row.versionType === "published");
  if (!draftRow) return undefined;

  const [draft] = await resolveProjectsMedia([mapProjectRow(entityRow, draftRow)]);
  const published = publishedRow ? (await resolveProjectsMedia([mapProjectRow(entityRow, publishedRow)]))[0] : null;

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
