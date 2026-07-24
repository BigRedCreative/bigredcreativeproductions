"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brandSettings } from "@/db/schema";
import { requireAdminUser } from "@/server/require-admin-user";
import { recordAuditEvent } from "@/server/audit-log";
import { validateAndNormalizeColor } from "@/server/validate-brand-color";

// Every brand_settings write lives here. Every export independently calls
// requireAdminUser() as its first line, per the standing rule. Each write
// is wrapped in a db.transaction() alongside its recordAuditEvent(tx, ...)
// call, exactly like every other admin mutation in this codebase.

export type BrandFormState = { errors: string[] } | { success: true } | null;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string): string | null {
  const value = getString(formData, key);
  return value ? value : null;
}

const COLOR_FIELDS = [
  ["primaryColor", "Primary brand color"],
  ["accentColor", "Accent color"],
  ["backgroundColor", "Background color"],
  ["surfaceColor", "Surface color"],
  ["textColor", "Text color"],
  ["mutedTextColor", "Muted text color"],
  ["borderColor", "Border color"],
  ["buttonBackground", "Button background"],
  ["buttonText", "Button text"],
  ["buttonHoverBackground", "Button hover background"],
] as const;

// Only saves the DRAFT row — never touches the published row, never
// revalidates the public site. This is what "Save Draft" does.
export async function saveBrandDraftAction(
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const adminUser = await requireAdminUser();

  const errors: string[] = [];
  const normalized: Record<string, string> = {};

  for (const [field, label] of COLOR_FIELDS) {
    const result = validateAndNormalizeColor(getString(formData, field), label);
    if (result.ok) {
      normalized[field] = result.normalized;
    } else {
      errors.push(result.error);
    }
  }

  const logoHorizontalMediaAssetId = getNullableString(formData, "logoHorizontalMediaAssetId");
  const logoWhiteMediaAssetId = getNullableString(formData, "logoWhiteMediaAssetId");

  if (errors.length > 0) {
    return { errors };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(brandSettings)
        .set({
          primaryColor: normalized.primaryColor,
          accentColor: normalized.accentColor,
          backgroundColor: normalized.backgroundColor,
          surfaceColor: normalized.surfaceColor,
          textColor: normalized.textColor,
          mutedTextColor: normalized.mutedTextColor,
          borderColor: normalized.borderColor,
          buttonBackground: normalized.buttonBackground,
          buttonText: normalized.buttonText,
          buttonHoverBackground: normalized.buttonHoverBackground,
          logoHorizontalMediaAssetId,
          logoWhiteMediaAssetId,
          updatedAt: new Date(),
        })
        .where(eq(brandSettings.status, "draft"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.brand.draft_saved",
        entityType: "brand_settings",
        entityId: "draft",
        metadata: { primaryColor: normalized.primaryColor, accentColor: normalized.accentColor },
      });
    });
  } catch (error) {
    console.error("Brand draft save failed", { error });
    return { errors: ["We couldn't save this draft. Please try again."] };
  }

  return { success: true };
}

const KNOWN_MAJOR_ROUTES = ["/", "/store", "/cart", "/checkout"] as const;

function revalidateKnownMajorRoutes(): void {
  for (const route of KNOWN_MAJOR_ROUTES) {
    revalidatePath(route);
  }
}

// Copies the CURRENT draft row's complete state (colors + logo selections)
// onto the published row — transactionally, with no form input of its
// own. Publishes whatever was last explicitly saved as a draft, never
// unsaved form edits — the same Save Draft -> Preview -> Publish
// discipline already established for the homepage hero in Phase 14.
export async function publishBrandAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: BrandFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<BrandFormState> {
  const adminUser = await requireAdminUser();

  const db = getDb();
  try {
    const draftRow = await db.query.brandSettings.findFirst({ where: eq(brandSettings.status, "draft") });
    if (!draftRow) {
      return { errors: ["No draft brand settings were found to publish."] };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(brandSettings)
        .set({
          primaryColor: draftRow.primaryColor,
          accentColor: draftRow.accentColor,
          backgroundColor: draftRow.backgroundColor,
          surfaceColor: draftRow.surfaceColor,
          textColor: draftRow.textColor,
          mutedTextColor: draftRow.mutedTextColor,
          borderColor: draftRow.borderColor,
          buttonBackground: draftRow.buttonBackground,
          buttonText: draftRow.buttonText,
          buttonHoverBackground: draftRow.buttonHoverBackground,
          logoHorizontalMediaAssetId: draftRow.logoHorizontalMediaAssetId,
          logoWhiteMediaAssetId: draftRow.logoWhiteMediaAssetId,
          updatedAt: new Date(),
        })
        .where(eq(brandSettings.status, "published"));
      await recordAuditEvent(tx, {
        adminUserId: adminUser.id,
        action: "website.brand.published",
        entityType: "brand_settings",
        entityId: "published",
        metadata: { primaryColor: draftRow.primaryColor, accentColor: draftRow.accentColor },
      });
    });
  } catch (error) {
    console.error("Brand publish failed", { error });
    return { errors: ["We couldn't publish these changes. Please try again."] };
  }

  // Known major routes get instant revalidation; deep dynamic detail
  // routes (/store/[slug], /work/[slug], /services/[slug]) rely on their
  // existing revalidate = 3600 ISR fallback — same documented tradeoff
  // already established for Phase 14's navigation publish.
  revalidateKnownMajorRoutes();
  return { success: true };
}
