"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { portfolioProjects, portfolioProjectVersions } from "@/db/schema";
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from "@/data/projects";
import { collectProjectValidationErrors } from "@/data/projects.validate";
import { validateHref } from "@/server/validate-website-content";
import { requireAdminUser } from "@/server/require-admin-user";
import { buildPortfolioVersionFromFormData } from "@/server/build-portfolio-form";
import type { PortfolioVersionContent } from "@/server/build-portfolio-form";
import { recordAuditEvent } from "@/server/audit-log";
import { getPortfolioEntityForAdmin } from "@/server/queries/portfolio";

// The only place a portfolio_projects/portfolio_project_versions row is
// created or written. Direct mirror of mutate-service.ts's exact
// architecture — see CLAUDE.md "Services + Portfolio Admin" for the full
// write-up of why this diverges from Product's simpler single-row model.
class PortfolioMutationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super("PORTFOLIO_MUTATION_ERROR");
    this.errors = errors;
  }
}

export type PortfolioFormState = { errors: string[] } | null;
export type PortfolioActionState = { errors: string[] } | { success: true } | null;

const VALID_CLASS_NAMES = ["project-red", "project-dark", "project-cream"] as const;

// Cross-state slug collision check — identical strategy to
// mutate-service.ts's findSlugCollision(): checks BOTH draft and
// published portfolio_project_versions rows, excluding the current
// entity. The partial unique indexes remain the final database-level
// backstop.
async function findSlugCollision(
  // Accepts either the plain db client or a live transaction's `tx`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executor: any,
  slug: string,
  excludeProjectId: string,
): Promise<boolean> {
  const rows = await executor
    .select({ projectId: portfolioProjectVersions.projectId })
    .from(portfolioProjectVersions)
    .where(and(eq(portfolioProjectVersions.slug, slug), ne(portfolioProjectVersions.projectId, excludeProjectId)))
    .limit(1);
  return rows.length > 0;
}

function slugCollisionMessage(slug: string): string {
  return `Slug "${slug}" is already in use by another project's draft or published version. Choose a different slug.`;
}

function validateContent(content: PortfolioVersionContent): string[] {
  // collectProjectValidationErrors() takes an array + a validCategories/
  // validStatuses options object (its original build-time signature) —
  // called here with exactly one candidate, the same reuse pattern
  // already established for collectProductValidationErrors() and
  // collectServiceValidationErrors(). PortfolioVersionContent omits only
  // fields optional on Project (id, status, thumbnail), so it's
  // structurally a valid Project already — no cast needed.
  const errors = collectProjectValidationErrors([content], {
    validCategories: PROJECT_CATEGORIES,
    validStatuses: PROJECT_STATUSES,
  });

  if (!(VALID_CLASS_NAMES as readonly string[]).includes(content.className)) {
    errors.push(`Card style "${content.className}" must be one of ${VALID_CLASS_NAMES.join(", ")}`);
  }

  if (content.externalLink?.url) {
    const hrefError = validateHref(content.externalLink.url, "External link URL");
    if (hrefError) errors.push(hrefError);
  }

  return errors;
}

function extractContentColumns(row: typeof portfolioProjectVersions.$inferSelect) {
  return {
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle,
    category: row.category,
    services: row.services,
    summary: row.summary,
    fullDescription: row.fullDescription,
    client: row.client,
    year: row.year,
    featured: row.featured,
    className: row.className,
    stamp: row.stamp,
    heroMediaAssetId: row.heroMediaAssetId,
    heroImageSrc: row.heroImageSrc,
    heroImageAlt: row.heroImageAlt,
    gallery: row.gallery,
    externalLink: row.externalLink,
    results: row.results,
    credits: row.credits,
    seo: row.seo,
  };
}

function contentToColumns(content: PortfolioVersionContent) {
  return {
    slug: content.slug,
    title: content.title,
    shortTitle: content.shortTitle,
    category: content.category,
    services: content.services,
    summary: content.summary,
    fullDescription: content.fullDescription,
    client: content.client ?? null,
    year: content.year ?? null,
    featured: content.featured,
    className: content.className,
    stamp: content.stamp,
    heroMediaAssetId: content.heroImage?.mediaAssetId ?? null,
    heroImageSrc: content.heroImage?.src ?? null,
    heroImageAlt: content.heroImage?.alt ?? null,
    gallery: content.gallery ?? null,
    externalLink: content.externalLink ?? null,
    results: content.results ?? null,
    credits: content.credits ?? null,
    seo: content.seo,
  };
}

// ---------------------------------------------------------------------
// Create — entity + one draft version, no published row, never publicly
// visible.
// ---------------------------------------------------------------------
export async function createPortfolioAction(
  _prevState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildPortfolioVersionFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const contentErrors = validateContent(parsed.content);
  if (contentErrors.length > 0) {
    return { errors: contentErrors };
  }

  const db = getDb();
  const id = `project_${crypto.randomUUID()}`;

  try {
    await db.transaction(async (tx) => {
      const collision = await findSlugCollision(tx, parsed.content.slug, id);
      if (collision) {
        throw new PortfolioMutationError([slugCollisionMessage(parsed.content.slug)]);
      }

      const existingSortOrders = await tx.select({ sortOrder: portfolioProjects.sortOrder }).from(portfolioProjects).orderBy(asc(portfolioProjects.sortOrder));
      const nextSortOrder = existingSortOrders.length > 0 ? Math.max(...existingSortOrders.map((row) => row.sortOrder)) + 10 : 10;

      await tx.insert(portfolioProjects).values({ id, status: "draft", sortOrder: nextSortOrder });
      await tx.insert(portfolioProjectVersions).values({
        projectId: id,
        versionType: "draft",
        ...contentToColumns(parsed.content),
      });
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "portfolio.created",
        entityType: "portfolio_project",
        entityId: id,
        metadata: { slug: parsed.content.slug, title: parsed.content.title },
      });
    });
  } catch (error) {
    if (error instanceof PortfolioMutationError) {
      return { errors: error.errors };
    }
    console.error("Portfolio project creation failed", { error });
    return { errors: ["We couldn't create this project. Please try again."] };
  }

  revalidatePath("/admin/portfolio");
  redirect(`/admin/portfolio/${id}`);
}

// ---------------------------------------------------------------------
// Save draft — always writes ONLY the draft row.
// ---------------------------------------------------------------------
export async function savePortfolioDraftAction(
  id: string,
  _prevState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  const adminUser = await requireAdminUser();

  const existing = await getPortfolioEntityForAdmin(id);
  if (!existing) {
    return { errors: ["This project no longer exists."] };
  }

  const parsed = buildPortfolioVersionFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const contentErrors = validateContent(parsed.content);
  if (contentErrors.length > 0) {
    return { errors: contentErrors };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const collision = await findSlugCollision(tx, parsed.content.slug, id);
      if (collision) {
        throw new PortfolioMutationError([slugCollisionMessage(parsed.content.slug)]);
      }

      await tx
        .update(portfolioProjectVersions)
        .set({ ...contentToColumns(parsed.content), updatedAt: new Date() })
        .where(and(eq(portfolioProjectVersions.projectId, id), eq(portfolioProjectVersions.versionType, "draft")));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "portfolio.draft_saved",
        entityType: "portfolio_project",
        entityId: id,
        metadata: { slug: parsed.content.slug, title: parsed.content.title },
      });
    });
  } catch (error) {
    if (error instanceof PortfolioMutationError) {
      return { errors: error.errors };
    }
    console.error("Portfolio draft save failed", { id, error });
    return { errors: ["We couldn't save this draft. Please try again."] };
  }

  revalidatePath("/admin/portfolio");
  revalidatePath(`/admin/portfolio/${id}`);
  revalidatePath(`/admin/portfolio/${id}/preview`);
  redirect(`/admin/portfolio/${id}`);
}

// ---------------------------------------------------------------------
// Publish — one transaction: re-check slug collision, copy complete
// draft content onto the published row (creating it on first publish),
// flip entity status, audit, revalidate.
// ---------------------------------------------------------------------
export async function publishPortfolioAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: PortfolioActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<PortfolioActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  let oldSlug: string | undefined;
  let newSlug: string | undefined;

  try {
    await db.transaction(async (tx) => {
      const entity = await tx.query.portfolioProjects.findFirst({ where: eq(portfolioProjects.id, id) });
      if (!entity) {
        throw new PortfolioMutationError(["This project no longer exists."]);
      }

      const draftRow = await tx.query.portfolioProjectVersions.findFirst({
        where: and(eq(portfolioProjectVersions.projectId, id), eq(portfolioProjectVersions.versionType, "draft")),
      });
      if (!draftRow) {
        throw new PortfolioMutationError(["No draft content exists to publish."]);
      }

      const publishedRow = await tx.query.portfolioProjectVersions.findFirst({
        where: and(eq(portfolioProjectVersions.projectId, id), eq(portfolioProjectVersions.versionType, "published")),
      });

      const collision = await findSlugCollision(tx, draftRow.slug, id);
      if (collision) {
        throw new PortfolioMutationError([slugCollisionMessage(draftRow.slug)]);
      }

      const contentColumns = extractContentColumns(draftRow);

      if (publishedRow) {
        await tx
          .update(portfolioProjectVersions)
          .set({ ...contentColumns, updatedAt: new Date() })
          .where(eq(portfolioProjectVersions.id, publishedRow.id));
      } else {
        await tx.insert(portfolioProjectVersions).values({ ...contentColumns, projectId: id, versionType: "published" });
      }

      await tx.update(portfolioProjects).set({ status: "published", updatedAt: new Date() }).where(eq(portfolioProjects.id, id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "portfolio.published",
        entityType: "portfolio_project",
        entityId: id,
        metadata: { slug: draftRow.slug, title: draftRow.title },
      });

      oldSlug = publishedRow?.slug;
      newSlug = draftRow.slug;
    });
  } catch (error) {
    if (error instanceof PortfolioMutationError) {
      return { errors: error.errors };
    }
    console.error("Portfolio publish failed", { id, error });
    return { errors: ["We couldn't publish this project. Please try again."] };
  }

  revalidatePath("/");
  if (oldSlug && oldSlug !== newSlug) revalidatePath(`/work/${oldSlug}`);
  if (newSlug) revalidatePath(`/work/${newSlug}`);
  revalidatePath("/admin/portfolio");
  revalidatePath(`/admin/portfolio/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------
// Archive / unarchive — entity-level only, never touches either version
// row.
// ---------------------------------------------------------------------
export async function setPortfolioArchivedAction(
  id: string,
  archived: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: PortfolioActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<PortfolioActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  let publishedSlug: string | undefined;

  try {
    await db.transaction(async (tx) => {
      const entity = await tx.query.portfolioProjects.findFirst({ where: eq(portfolioProjects.id, id) });
      if (!entity) {
        throw new PortfolioMutationError(["This project no longer exists."]);
      }

      const publishedRow = await tx.query.portfolioProjectVersions.findFirst({
        where: and(eq(portfolioProjectVersions.projectId, id), eq(portfolioProjectVersions.versionType, "published")),
      });
      publishedSlug = publishedRow?.slug;

      if (archived) {
        await tx.update(portfolioProjects).set({ status: "archived", updatedAt: new Date() }).where(eq(portfolioProjects.id, id));
        await recordAuditEvent(tx, {
          adminUserId: adminUser.id,
          action: "portfolio.archived",
          entityType: "portfolio_project",
          entityId: id,
          metadata: {},
        });
      } else {
        const restoredStatus = publishedRow ? "published" : "draft";
        await tx.update(portfolioProjects).set({ status: restoredStatus, updatedAt: new Date() }).where(eq(portfolioProjects.id, id));
        await recordAuditEvent(tx, {
          adminUserId: adminUser.id,
          action: "portfolio.unarchived",
          entityType: "portfolio_project",
          entityId: id,
          metadata: { restoredTo: restoredStatus },
        });
      }
    });
  } catch (error) {
    if (error instanceof PortfolioMutationError) {
      return { errors: error.errors };
    }
    console.error("Portfolio archive/unarchive failed", { id, error });
    return { errors: ["We couldn't update this project. Please try again."] };
  }

  revalidatePath("/");
  if (publishedSlug) revalidatePath(`/work/${publishedSlug}`);
  revalidatePath("/admin/portfolio");
  revalidatePath(`/admin/portfolio/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------
// Reorder — immediate, entity-level, swaps sortOrder with the adjacent
// entity in the full (any-status) list.
// ---------------------------------------------------------------------
export async function movePortfolioAction(
  id: string,
  direction: "up" | "down",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: PortfolioActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<PortfolioActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const all = await tx.select({ id: portfolioProjects.id, sortOrder: portfolioProjects.sortOrder }).from(portfolioProjects).orderBy(asc(portfolioProjects.sortOrder));
      const index = all.findIndex((row) => row.id === id);
      if (index === -1) {
        throw new PortfolioMutationError(["This project no longer exists."]);
      }

      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= all.length) {
        return;
      }

      const current = all[index];
      const swapWith = all[swapIndex];

      await tx.update(portfolioProjects).set({ sortOrder: swapWith.sortOrder, updatedAt: new Date() }).where(eq(portfolioProjects.id, current.id));
      await tx.update(portfolioProjects).set({ sortOrder: current.sortOrder, updatedAt: new Date() }).where(eq(portfolioProjects.id, swapWith.id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "portfolio.reordered",
        entityType: "portfolio_project",
        entityId: id,
        metadata: { direction, swappedWithId: swapWith.id },
      });
    });
  } catch (error) {
    if (error instanceof PortfolioMutationError) {
      return { errors: error.errors };
    }
    console.error("Portfolio reorder failed", { id, error });
    return { errors: ["We couldn't reorder this project. Please try again."] };
  }

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
  return { success: true };
}
