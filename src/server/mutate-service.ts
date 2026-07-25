"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { services, serviceVersions } from "@/db/schema";
import { collectServiceValidationErrors } from "@/data/services.validate";
import { requireAdminUser } from "@/server/require-admin-user";
import { buildServiceVersionFromFormData } from "@/server/build-service-form";
import type { ServiceVersionContent } from "@/server/build-service-form";
import { recordAuditEvent } from "@/server/audit-log";
import { getServiceEntityForAdmin } from "@/server/queries/services";

// The only place a services/service_versions row is created or written.
// Every export here independently calls requireAdminUser() — Server
// Actions aren't covered by the protected admin layout's own check, per
// the rule established since Phase 12.
//
// Thrown, not returned-early, on validation failure inside a transaction:
// a thrown error guarantees rollback (nothing partially written), and is
// caught outside to produce a clean { errors } result rather than a raw
// Postgres error reaching the admin form. See CLAUDE.md "Services +
// Portfolio Admin" for the full write-up of why this diverges from
// Product's simpler single-row model.
class ServiceMutationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super("SERVICE_MUTATION_ERROR");
    this.errors = errors;
  }
}

export type ServiceFormState = { errors: string[] } | null;
export type ServiceActionState = { errors: string[] } | { success: true } | null;

// ---------------------------------------------------------------------
// Cross-state slug collision check — the server-side layer the partial
// unique indexes alone cannot provide (see the Phase 17 migration
// approval: entity A's published slug and entity B's draft slug live in
// different partial indexes, so Postgres never compares them against each
// other). Checks BOTH draft and published service_versions rows,
// excluding the current entity, so a collision anywhere in either state
// is caught before any write. The partial unique indexes remain the
// final database-level backstop if a genuine race slips past this check.
// ---------------------------------------------------------------------
async function findSlugCollision(
  // Accepts either the plain db client or a live transaction's `tx` —
  // both expose the same .select() shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executor: any,
  slug: string,
  excludeServiceId: string,
): Promise<boolean> {
  const rows = await executor
    .select({ serviceId: serviceVersions.serviceId })
    .from(serviceVersions)
    .where(and(eq(serviceVersions.slug, slug), ne(serviceVersions.serviceId, excludeServiceId)))
    .limit(1);
  return rows.length > 0;
}

function slugCollisionMessage(slug: string): string {
  return `Slug "${slug}" is already in use by another service's draft or published version. Choose a different slug.`;
}

function validateContent(content: ServiceVersionContent): string[] {
  // collectServiceValidationErrors() takes an array (its original
  // build-time signature checked cross-entry duplicates within one
  // array) — called here with exactly one candidate, the same reuse
  // pattern Phase 13 established for collectProductValidationErrors().
  // ServiceVersionContent omits only fields that are optional on Service
  // (id, status, the 8 dormant commerce fields), so it's structurally a
  // valid Service already — no cast needed.
  return collectServiceValidationErrors([content]);
}

// Strips a fetched service_versions row down to just its content columns
// (no id/serviceId/versionType/updatedAt, no dormant commerce fields) —
// used by publishServiceAction to copy draft content onto the published
// row without ever touching commerce columns it doesn't know about.
function extractContentColumns(row: typeof serviceVersions.$inferSelect) {
  return {
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle,
    serviceNumber: row.serviceNumber,
    featured: row.featured,
    summary: row.summary,
    fullDescription: row.fullDescription,
    capabilities: row.capabilities,
    deliverables: row.deliverables,
    process: row.process,
    ctaLabel: row.ctaLabel,
    heroMediaAssetId: row.heroMediaAssetId,
    heroImageSrc: row.heroImageSrc,
    heroImageAlt: row.heroImageAlt,
    gallery: row.gallery,
    seo: row.seo,
  };
}

function contentToColumns(content: ServiceVersionContent) {
  return {
    slug: content.slug,
    title: content.title,
    shortTitle: content.shortTitle,
    serviceNumber: content.serviceNumber,
    featured: content.featured,
    summary: content.summary,
    fullDescription: content.fullDescription,
    capabilities: content.capabilities,
    deliverables: content.deliverables,
    process: content.process,
    ctaLabel: content.ctaLabel,
    heroMediaAssetId: content.heroImage?.mediaAssetId ?? null,
    heroImageSrc: content.heroImage?.src ?? null,
    heroImageAlt: content.heroImage?.alt ?? null,
    gallery: content.gallery ?? null,
    seo: content.seo,
  };
}

// ---------------------------------------------------------------------
// Create — entity + one draft version, no published row, never publicly
// visible. See CLAUDE.md "Services + Portfolio Admin".
// ---------------------------------------------------------------------
export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildServiceVersionFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const contentErrors = validateContent(parsed.content);
  if (contentErrors.length > 0) {
    return { errors: contentErrors };
  }

  const db = getDb();
  const id = `service_${crypto.randomUUID()}`;

  try {
    await db.transaction(async (tx) => {
      const collision = await findSlugCollision(tx, parsed.content.slug, id);
      if (collision) {
        throw new ServiceMutationError([slugCollisionMessage(parsed.content.slug)]);
      }

      const maxSortOrder = await tx.select({ sortOrder: services.sortOrder }).from(services).orderBy(asc(services.sortOrder));
      const nextSortOrder = maxSortOrder.length > 0 ? Math.max(...maxSortOrder.map((row) => row.sortOrder)) + 10 : 10;

      await tx.insert(services).values({ id, status: "draft", sortOrder: nextSortOrder });
      await tx.insert(serviceVersions).values({
        serviceId: id,
        versionType: "draft",
        ...contentToColumns(parsed.content),
      });
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "service.created",
        entityType: "service",
        entityId: id,
        metadata: { slug: parsed.content.slug, title: parsed.content.title },
      });
    });
  } catch (error) {
    if (error instanceof ServiceMutationError) {
      return { errors: error.errors };
    }
    console.error("Service creation failed", { error });
    return { errors: ["We couldn't create this service. Please try again."] };
  }

  revalidatePath("/admin/services");
  redirect(`/admin/services/${id}`);
}

// ---------------------------------------------------------------------
// Save draft — always writes ONLY the draft row. The published row (if
// any) and every public route are untouched by construction: this
// function never selects, updates, or reads anything from a published
// service_versions row.
// ---------------------------------------------------------------------
export async function saveServiceDraftAction(
  id: string,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const adminUser = await requireAdminUser();

  const existing = await getServiceEntityForAdmin(id);
  if (!existing) {
    return { errors: ["This service no longer exists."] };
  }

  const parsed = buildServiceVersionFromFormData(formData);
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
        throw new ServiceMutationError([slugCollisionMessage(parsed.content.slug)]);
      }

      await tx
        .update(serviceVersions)
        .set({ ...contentToColumns(parsed.content), updatedAt: new Date() })
        .where(and(eq(serviceVersions.serviceId, id), eq(serviceVersions.versionType, "draft")));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "service.draft_saved",
        entityType: "service",
        entityId: id,
        metadata: { slug: parsed.content.slug, title: parsed.content.title },
      });
    });
  } catch (error) {
    if (error instanceof ServiceMutationError) {
      return { errors: error.errors };
    }
    console.error("Service draft save failed", { id, error });
    return { errors: ["We couldn't save this draft. Please try again."] };
  }

  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}`);
  revalidatePath(`/admin/services/${id}/preview`);
  redirect(`/admin/services/${id}`);
}

// ---------------------------------------------------------------------
// Publish — one transaction: re-check the slug collision (a draft can sit
// unpublished for a while; something else may have taken the slug since
// it was last saved), copy the complete draft content onto the published
// row (creating it on first publish), flip entity status to published,
// audit. Takes no form fields of its own — publishes whatever the draft
// currently holds, mirroring PublishBrandButton/PublishHeroButton's exact
// fieldless pattern.
// ---------------------------------------------------------------------
export async function publishServiceAction(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: ServiceActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<ServiceActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  let oldSlug: string | undefined;
  let newSlug: string | undefined;

  try {
    await db.transaction(async (tx) => {
      const entity = await tx.query.services.findFirst({ where: eq(services.id, id) });
      if (!entity) {
        throw new ServiceMutationError(["This service no longer exists."]);
      }

      const draftRow = await tx.query.serviceVersions.findFirst({
        where: and(eq(serviceVersions.serviceId, id), eq(serviceVersions.versionType, "draft")),
      });
      if (!draftRow) {
        throw new ServiceMutationError(["No draft content exists to publish."]);
      }

      const publishedRow = await tx.query.serviceVersions.findFirst({
        where: and(eq(serviceVersions.serviceId, id), eq(serviceVersions.versionType, "published")),
      });

      const collision = await findSlugCollision(tx, draftRow.slug, id);
      if (collision) {
        throw new ServiceMutationError([slugCollisionMessage(draftRow.slug)]);
      }

      const contentColumns = extractContentColumns(draftRow);

      if (publishedRow) {
        await tx
          .update(serviceVersions)
          .set({ ...contentColumns, updatedAt: new Date() })
          .where(eq(serviceVersions.id, publishedRow.id));
      } else {
        await tx.insert(serviceVersions).values({ ...contentColumns, serviceId: id, versionType: "published" });
      }

      await tx.update(services).set({ status: "published", updatedAt: new Date() }).where(eq(services.id, id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "service.published",
        entityType: "service",
        entityId: id,
        metadata: { slug: draftRow.slug, title: draftRow.title },
      });

      oldSlug = publishedRow?.slug;
      newSlug = draftRow.slug;
    });
  } catch (error) {
    if (error instanceof ServiceMutationError) {
      return { errors: error.errors };
    }
    console.error("Service publish failed", { id, error });
    return { errors: ["We couldn't publish this service. Please try again."] };
  }

  revalidatePath("/");
  if (oldSlug && oldSlug !== newSlug) revalidatePath(`/services/${oldSlug}`);
  if (newSlug) revalidatePath(`/services/${newSlug}`);
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------
// Archive / unarchive — entity-level only, never touches either version
// row. Unarchiving restores to "published" if a published row exists
// (the same content becomes public again, unmodified), or to "draft" if
// it never had one — never accidentally publishing an unpublished draft.
// ---------------------------------------------------------------------
export async function setServiceArchivedAction(
  id: string,
  archived: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: ServiceActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<ServiceActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  let publishedSlug: string | undefined;

  try {
    await db.transaction(async (tx) => {
      const entity = await tx.query.services.findFirst({ where: eq(services.id, id) });
      if (!entity) {
        throw new ServiceMutationError(["This service no longer exists."]);
      }

      if (archived) {
        const publishedRow = await tx.query.serviceVersions.findFirst({
          where: and(eq(serviceVersions.serviceId, id), eq(serviceVersions.versionType, "published")),
        });
        publishedSlug = publishedRow?.slug;

        await tx.update(services).set({ status: "archived", updatedAt: new Date() }).where(eq(services.id, id));
        await recordAuditEvent(tx, {
          adminUserId: adminUser.id,
          action: "service.archived",
          entityType: "service",
          entityId: id,
          metadata: {},
        });
      } else {
        const publishedRow = await tx.query.serviceVersions.findFirst({
          where: and(eq(serviceVersions.serviceId, id), eq(serviceVersions.versionType, "published")),
        });
        const restoredStatus = publishedRow ? "published" : "draft";
        publishedSlug = publishedRow?.slug;

        await tx.update(services).set({ status: restoredStatus, updatedAt: new Date() }).where(eq(services.id, id));
        await recordAuditEvent(tx, {
          adminUserId: adminUser.id,
          action: "service.unarchived",
          entityType: "service",
          entityId: id,
          metadata: { restoredTo: restoredStatus },
        });
      }
    });
  } catch (error) {
    if (error instanceof ServiceMutationError) {
      return { errors: error.errors };
    }
    console.error("Service archive/unarchive failed", { id, error });
    return { errors: ["We couldn't update this service. Please try again."] };
  }

  revalidatePath("/");
  if (publishedSlug) revalidatePath(`/services/${publishedSlug}`);
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------
// Reorder — immediate, entity-level, swaps sortOrder with the adjacent
// entity in the full (any-status) list. No-op at either edge.
// ---------------------------------------------------------------------
export async function moveServiceAction(
  id: string,
  direction: "up" | "down",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: ServiceActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<ServiceActionState> {
  const adminUser = await requireAdminUser();
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const all = await tx.select({ id: services.id, sortOrder: services.sortOrder }).from(services).orderBy(asc(services.sortOrder));
      const index = all.findIndex((row) => row.id === id);
      if (index === -1) {
        throw new ServiceMutationError(["This service no longer exists."]);
      }

      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= all.length) {
        // Already at the edge — nothing to do, not an error.
        return;
      }

      const current = all[index];
      const swapWith = all[swapIndex];

      await tx.update(services).set({ sortOrder: swapWith.sortOrder, updatedAt: new Date() }).where(eq(services.id, current.id));
      await tx.update(services).set({ sortOrder: current.sortOrder, updatedAt: new Date() }).where(eq(services.id, swapWith.id));

      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "service.reordered",
        entityType: "service",
        entityId: id,
        metadata: { direction, swappedWithId: swapWith.id },
      });
    });
  } catch (error) {
    if (error instanceof ServiceMutationError) {
      return { errors: error.errors };
    }
    console.error("Service reorder failed", { id, error });
    return { errors: ["We couldn't reorder this service. Please try again."] };
  }

  revalidatePath("/");
  revalidatePath("/admin/services");
  return { success: true };
}
