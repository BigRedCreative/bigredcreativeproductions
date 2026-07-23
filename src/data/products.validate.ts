import { services } from "./services";
import { MEDIA_TYPES } from "./media";
import type { Product } from "./products";

// Type/status/category/purchase-mode lists are passed in (not imported) so
// this module has no runtime dependency on products.ts — avoids a circular
// import since products.ts calls validateProducts() with its own data at
// module load. Mirrors the same avoidance pattern used by
// projects.validate.ts. `services` is safe to import directly: services.ts
// never imports from products.ts, so there's no cycle there.
export type ProductValidationOptions = {
  validTypes: readonly string[];
  validStatuses: readonly string[];
  validCategories: readonly string[];
  validPurchaseModes: readonly string[];
  validAddOnChargeTypes: readonly string[];
};

function isLocalImagePath(src: string): boolean {
  return !/^https?:\/\//i.test(src);
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validateMoneyField(
  value: number | undefined,
  field: string,
  label: string,
  errors: string[],
): void {
  if (value !== undefined && !isNonNegativeInteger(value)) {
    errors.push(`${label}: ${field} must be a non-negative integer number of cents (got ${value})`);
  }
}

export function collectProductValidationErrors(
  products: Product[],
  { validTypes, validStatuses, validCategories, validPurchaseModes, validAddOnChargeTypes }: ProductValidationOptions,
): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const validServiceSlugs = new Set(services.map((service) => service.slug));

  for (const product of products) {
    const label = product.id || product.slug || product.title || "(unnamed product)";

    if (!product.id?.trim()) {
      errors.push(`${label}: id is required`);
    } else if (seenIds.has(product.id)) {
      errors.push(`Duplicate product id: "${product.id}"`);
    } else {
      seenIds.add(product.id);
    }

    if (!product.slug?.trim()) {
      errors.push(`${label}: slug is required`);
    } else if (seenSlugs.has(product.slug)) {
      errors.push(`Duplicate product slug: "${product.slug}"`);
    } else {
      seenSlugs.add(product.slug);
    }

    if (!product.title?.trim()) {
      errors.push(`${label}: title must not be empty`);
    }

    if (!product.summary?.trim()) {
      errors.push(`${label}: summary must not be empty`);
    }

    if (!validTypes.includes(product.productType)) {
      errors.push(`${label}: productType "${product.productType}" must be one of ${validTypes.join(", ")}`);
    }

    if (!validStatuses.includes(product.status)) {
      errors.push(`${label}: status "${product.status}" must be one of ${validStatuses.join(", ")}`);
    }

    if (!validCategories.includes(product.category)) {
      errors.push(`${label}: category "${product.category}" must be one of ${validCategories.join(", ")}`);
    }

    if (!product.seo?.title?.trim()) {
      errors.push(`${label}: seo.title is required`);
    }
    if (!product.seo?.description?.trim()) {
      errors.push(`${label}: seo.description is required`);
    }

    if (product.relatedServiceSlug && !validServiceSlugs.has(product.relatedServiceSlug)) {
      errors.push(
        `${label}: relatedServiceSlug "${product.relatedServiceSlug}" does not match any service slug`,
      );
    }

    // Pricing — structural checks always apply; "must eventually have a
    // price" checks only apply once a product is published, so drafts can
    // freely omit real numbers while the offering is still being defined.
    const { pricing } = product;
    if (!pricing || !validPurchaseModes.includes(pricing.mode)) {
      errors.push(
        `${label}: pricing.mode "${pricing?.mode}" must be one of ${validPurchaseModes.join(", ")}`,
      );
    } else {
      validateMoneyField(pricing.basePrice, "pricing.basePrice", label, errors);
      validateMoneyField(pricing.startingPrice, "pricing.startingPrice", label, errors);
      validateMoneyField(pricing.depositAmount, "pricing.depositAmount", label, errors);
      validateMoneyField(pricing.salePrice, "pricing.salePrice", label, errors);

      if (product.status === "published") {
        if (
          (pricing.mode === "fixed-price" || pricing.mode === "full-payment") &&
          pricing.basePrice === undefined
        ) {
          errors.push(`${label}: published products with pricing.mode "${pricing.mode}" require pricing.basePrice`);
        }
        if (pricing.mode === "starting-price" && pricing.startingPrice === undefined) {
          errors.push(`${label}: published products with pricing.mode "starting-price" require pricing.startingPrice`);
        }
        if (pricing.mode === "deposit") {
          if (pricing.depositAmount === undefined) {
            errors.push(`${label}: published products with pricing.mode "deposit" require pricing.depositAmount`);
          }
          if (pricing.basePrice === undefined && pricing.startingPrice === undefined) {
            errors.push(
              `${label}: published products with pricing.mode "deposit" require pricing.basePrice or pricing.startingPrice`,
            );
          }
        }
      }
    }

    // Media
    if (product.status === "published" && (!product.media || product.media.length === 0)) {
      errors.push(`${label}: published products require at least one media item`);
    }

    if (product.media) {
      const seenMediaSrc = new Set<string>();
      const expectedPrefix = product.slug ? `/images/products/${product.slug}/` : undefined;
      const checkMediaPath = (src: string, field: string) => {
        if (!isLocalImagePath(src)) {
          errors.push(`${label}: ${field} must be a local path, not an external URL ("${src}")`);
          return;
        }
        if (expectedPrefix && !src.startsWith(expectedPrefix)) {
          errors.push(`${label}: ${field} should live under "${expectedPrefix}" (got "${src}")`);
        }
      };

      product.media.forEach((media, i) => {
        const field = `media[${i}]`;

        if (!MEDIA_TYPES.includes(media.type)) {
          errors.push(`${label}: ${field}.type "${media.type}" must be one of ${MEDIA_TYPES.join(", ")}`);
        }

        if (!media.alt?.trim()) {
          errors.push(`${label}: ${field}.alt is required`);
        }

        if (!media.src?.trim()) {
          errors.push(`${label}: ${field}.src is required`);
        } else {
          checkMediaPath(media.src, `${field}.src`);
          if (seenMediaSrc.has(media.src)) {
            errors.push(`${label}: duplicate media src "${media.src}"`);
          } else {
            seenMediaSrc.add(media.src);
          }
        }

        if (media.type === "video") {
          if (!media.poster?.trim()) {
            errors.push(`${label}: ${field} is a video and requires a poster`);
          } else {
            checkMediaPath(media.poster, `${field}.poster`);
          }
        }
      });
    }

    // Options
    if (product.options) {
      const seenOptionKeys = new Set<string>();
      product.options.forEach((option, i) => {
        const field = `options[${i}]`;
        if (!option.key?.trim()) {
          errors.push(`${label}: ${field}.key is required`);
        } else if (seenOptionKeys.has(option.key)) {
          errors.push(`${label}: duplicate option key "${option.key}"`);
        } else {
          seenOptionKeys.add(option.key);
        }

        if (!option.label?.trim()) {
          errors.push(`${label}: ${field}.label is required`);
        }

        if (!option.values || option.values.length === 0) {
          errors.push(`${label}: ${field} must have at least one value`);
        } else {
          option.values.forEach((value, vi) => {
            if (!value.label?.trim()) {
              errors.push(`${label}: ${field}.values[${vi}].label is required`);
            }
            if (!value.value?.trim()) {
              errors.push(`${label}: ${field}.values[${vi}].value is required`);
            }
            // priceDelta may be negative (e.g. a smaller size costs less
            // than the base) — only whole-cent integers are enforced here.
            if (value.priceDelta !== undefined && !Number.isInteger(value.priceDelta)) {
              errors.push(`${label}: ${field}.values[${vi}].priceDelta must be an integer number of cents`);
            }
          });
        }
      });
    }

    // Packages
    if (product.packages) {
      const seenPackageSlugs = new Set<string>();
      product.packages.forEach((pkg, i) => {
        const field = `packages[${i}]`;
        if (!pkg.slug?.trim()) {
          errors.push(`${label}: ${field}.slug is required`);
        } else if (seenPackageSlugs.has(pkg.slug)) {
          errors.push(`${label}: duplicate package slug "${pkg.slug}"`);
        } else {
          seenPackageSlugs.add(pkg.slug);
        }

        if (!pkg.label?.trim()) {
          errors.push(`${label}: ${field}.label is required`);
        }
        if (!pkg.description?.trim()) {
          errors.push(`${label}: ${field}.description is required`);
        }

        validateMoneyField(pkg.price, `${field}.price`, label, errors);
        validateMoneyField(pkg.startingPrice, `${field}.startingPrice`, label, errors);
      });
    }

    // Add-ons
    if (product.addOns) {
      const seenAddOnSlugs = new Set<string>();
      product.addOns.forEach((addOn, i) => {
        const field = `addOns[${i}]`;
        if (!addOn.slug?.trim()) {
          errors.push(`${label}: ${field}.slug is required`);
        } else if (seenAddOnSlugs.has(addOn.slug)) {
          errors.push(`${label}: duplicate add-on slug "${addOn.slug}"`);
        } else {
          seenAddOnSlugs.add(addOn.slug);
        }

        if (!addOn.label?.trim()) {
          errors.push(`${label}: ${field}.label is required`);
        }

        if (!validAddOnChargeTypes.includes(addOn.chargeType)) {
          errors.push(
            `${label}: ${field}.chargeType "${addOn.chargeType}" must be one of ${validAddOnChargeTypes.join(", ")}`,
          );
        }

        validateMoneyField(addOn.price, `${field}.price`, label, errors);
      });
    }
  }

  return errors;
}

// Throws with every problem listed at once (not just the first) so a build
// or dev-server failure is immediately actionable. An empty product array
// produces zero errors — the catalog is allowed to start empty.
export function validateProducts(products: Product[], options: ProductValidationOptions): void {
  const errors = collectProductValidationErrors(products, options);
  if (errors.length > 0) {
    throw new Error(`Invalid product data in src/data/products.ts:\n- ${errors.join("\n- ")}`);
  }
}
