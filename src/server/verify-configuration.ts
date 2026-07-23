import "server-only";
import type { Product } from "@/data/products";
import type { ProductConfiguration } from "@/data/cart";

// A stricter check than cart.ts's isConfigurationValid(), specifically for
// the untrusted API boundary. isConfigurationValid() only checks that
// required options/packages have SOME value present — it was written for
// a UI that only ever offers real choices, so it never needed to check
// those values are real. An API request can claim anything, so this
// additionally verifies every referenced option key/value, package slug,
// and add-on slug actually exists on the product. Returns a human-readable
// error, or null if the configuration is fully valid against `product`.
export function verifyConfigurationAgainstProduct(
  product: Product,
  configuration: ProductConfiguration,
): string | null {
  if (configuration.selectedPackageSlug) {
    const packageExists = product.packages?.some((pkg) => pkg.slug === configuration.selectedPackageSlug);
    if (!packageExists) {
      return `Unknown package selection for "${product.title}".`;
    }
  }

  for (const [optionKey, value] of Object.entries(configuration.selectedOptionValues)) {
    const option = product.options?.find((candidate) => candidate.key === optionKey);
    if (!option) {
      return `Unknown option "${optionKey}" for "${product.title}".`;
    }
    const valueExists = option.values.some((candidate) => candidate.value === value);
    if (!valueExists) {
      return `Unknown value for option "${option.label}" on "${product.title}".`;
    }
  }

  for (const option of product.options ?? []) {
    if (option.required && !configuration.selectedOptionValues[option.key]) {
      return `Missing required option "${option.label}" for "${product.title}".`;
    }
  }

  for (const addOnSlug of configuration.selectedAddOnSlugs) {
    const addOnExists = product.addOns?.some((addOn) => addOn.slug === addOnSlug);
    if (!addOnExists) {
      return `Unknown add-on selection for "${product.title}".`;
    }
  }

  return null;
}
