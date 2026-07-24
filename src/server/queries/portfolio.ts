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
