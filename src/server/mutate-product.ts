"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import {
  ADD_ON_CHARGE_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  PURCHASE_MODES,
} from "@/data/products";
import type { Product } from "@/data/products";
import { collectProductValidationErrors } from "@/data/products.validate";
import { requireAdminUser } from "@/server/require-admin-user";
import { buildProductFromFormData } from "@/server/build-product-form";
import { recordAuditEvent } from "@/server/audit-log";
import { isUniqueViolation } from "@/server/is-unique-violation";
import { getProductById } from "@/server/queries/catalog";

// The only place a product row is created or written. Every export here
// independently calls requireAdminUser() — this file is a Server Action
// boundary, not covered by the protected admin layout's own check (see
// CLAUDE.md "Admin foundation" and src/server/require-admin-user.ts).
//
// Validation is never duplicated: collectProductValidationErrors() is the
// exact same function src/data/products.validate.ts already exported for
// the old build-time array checks — reused here verbatim as the
// authoritative runtime check for admin-submitted data, per the approved
// "do not build a competing validation system" decision.

export type ProductFormState = { errors: string[] } | null;

function validateCandidate(id: string, candidate: Omit<Product, "id">): string[] {
  return collectProductValidationErrors([{ ...candidate, id }], {
    validTypes: PRODUCT_TYPES,
    validStatuses: PRODUCT_STATUSES,
    validCategories: PRODUCT_CATEGORIES,
    validPurchaseModes: PURCHASE_MODES,
    validAddOnChargeTypes: ADD_ON_CHARGE_TYPES,
  });
}

function revalidateStorefrontFor(slug: string, previousSlug?: string): void {
  revalidatePath("/store");
  revalidatePath(`/store/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/store/${previousSlug}`);
  }
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const adminUser = await requireAdminUser();

  const parsed = buildProductFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const id = `prod_${crypto.randomUUID()}`;
  const validationErrors = validateCandidate(id, parsed.product);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(products).values({ id, ...parsed.product });
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "product.created",
        entityType: "product",
        entityId: id,
        metadata: { slug: parsed.product.slug, title: parsed.product.title, status: parsed.product.status },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, "products_slug_unique")) {
      return { errors: [`Slug "${parsed.product.slug}" is already in use by another product.`] };
    }
    console.error("Product creation failed", { error });
    return { errors: ["We couldn't save this product. Please try again."] };
  }

  revalidateStorefrontFor(parsed.product.slug);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${id}`);
}

export async function updateProductAction(
  id: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const adminUser = await requireAdminUser();

  const existing = await getProductById(id);
  if (!existing) {
    return { errors: ["This product no longer exists."] };
  }

  const parsed = buildProductFromFormData(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  const validationErrors = validateCandidate(id, parsed.product);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  let action = "product.updated";
  if (parsed.product.status === "published" && existing.status !== "published") {
    action = "product.published";
  } else if (parsed.product.status === "archived" && existing.status !== "archived") {
    action = "product.archived";
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ ...parsed.product, updatedAt: new Date() })
        .where(eq(products.id, id));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action,
        entityType: "product",
        entityId: id,
        metadata: {
          slug: parsed.product.slug,
          title: parsed.product.title,
          from: existing.status,
          to: parsed.product.status,
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, "products_slug_unique")) {
      return { errors: [`Slug "${parsed.product.slug}" is already in use by another product.`] };
    }
    console.error("Product update failed", { id, error });
    return { errors: ["We couldn't save this product. Please try again."] };
  }

  revalidateStorefrontFor(parsed.product.slug, existing.slug);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect(`/admin/products/${id}`);
}
