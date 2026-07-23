import type { AddOnChargeType, Product, ProductPackage, ProductType, PurchaseMode } from "./products";

// The cart schema version travels inside the persisted localStorage
// envelope ({ version, items }) — bump this whenever CartItem's shape
// changes in a way older persisted carts can't be safely read as. See
// CartProvider.tsx for how a version mismatch is handled (the whole
// persisted cart is discarded, never partially trusted).
export const CART_SCHEMA_VERSION = 1;

export type CartOptionSelection = {
  optionKey: string;
  optionLabel: string;
  value: string;
  valueLabel: string;
  // Cents, snapshot at add-time. 0 if the option carried no price delta.
  priceDelta: number;
};

export type CartPackageSelection = {
  packageSlug: string;
  label: string;
  price?: number;
  startingPrice?: number;
};

export type CartAddOnSelection = {
  addOnSlug: string;
  label: string;
  price?: number;
  // Snapshot of ProductAddOn.chargeType — the cart must keep pricing this
  // add-on the way it was configured when added, even if the live product's
  // add-on definition changes later.
  chargeType: AddOnChargeType;
};

export type CartItem = {
  // Identifies this LINE, not the product — the same product can appear as
  // multiple lines with different configurations. Never derived from
  // product identity; always crypto.randomUUID().
  cartLineId: string;
  // Permanent product identity — never the slug. See CLAUDE.md "id vs slug".
  productId: string;
  // Frozen display snapshots, captured once at add-time. Never re-read from
  // the live Product after this — a later rename/re-price must not change
  // what an existing cart line shows.
  productSlug: string;
  productTitle: string;
  productType: ProductType;
  purchaseMode: PurchaseMode;
  quantity: number;

  selectedPackage?: CartPackageSelection;
  selectedOptions: CartOptionSelection[];
  selectedAddOns: CartAddOnSelection[];

  // Cents. Resolved once at add-time from the selected package price (or
  // the product's base/starting price) plus the sum of selected options'
  // priceDelta. Add-ons are NOT included here — they're priced separately
  // per their own chargeType, see cart-pricing.ts.
  unitPrice: number;
  // Cents, only present when purchaseMode === "deposit".
  depositAmount?: number;

  addedAt: string;
};

export type CartState = {
  items: CartItem[];
};

// A product is cart-eligible when it's published, not inquiry-only, and
// carries enough resolved pricing data for its purchase mode to compute a
// real unitPrice. The Phase 7 validator already guarantees a published
// product has the fields its mode requires, so this is mostly a second,
// explicit safety check — not a new source of truth.
export function isCartEligible(product: Product): boolean {
  if (product.status !== "published") return false;
  const { mode, basePrice, startingPrice, depositAmount } = product.pricing;

  switch (mode) {
    case "inquiry":
      return false;
    case "fixed-price":
    case "full-payment":
      return basePrice !== undefined;
    case "starting-price":
      return startingPrice !== undefined || hasPackageWithPrice(product);
    case "deposit":
      return depositAmount !== undefined && (basePrice !== undefined || startingPrice !== undefined);
    default:
      return false;
  }
}

function hasPackageWithPrice(product: Product): boolean {
  return Boolean(product.packages?.some((pkg) => pkg.price !== undefined || pkg.startingPrice !== undefined));
}

// The in-progress selections a shopper is building on a product page,
// before they become a frozen CartItem.
export type ProductConfiguration = {
  selectedPackageSlug?: string;
  // optionKey -> chosen value
  selectedOptionValues: Record<string, string>;
  selectedAddOnSlugs: string[];
  quantity: number;
};

// True once every required piece of configuration has a selection —
// gates the Add to Cart button, independent of whether a price could be
// resolved (see buildCartItem, which is the actual pricing gate).
export function isConfigurationValid(product: Product, configuration: ProductConfiguration): boolean {
  if (product.packages && product.packages.length > 0 && !configuration.selectedPackageSlug) {
    return false;
  }
  for (const option of product.options ?? []) {
    if (option.required && !configuration.selectedOptionValues[option.key]) {
      return false;
    }
  }
  return configuration.quantity >= 1 && Number.isInteger(configuration.quantity);
}

// The one function that turns a Product + a shopper's selections into a
// CartItem snapshot. Used both by the real "Add to Cart" action and by a
// live price preview while configuring — so the number shown before
// clicking always matches what actually gets added.
export function buildCartItem(product: Product, configuration: ProductConfiguration): CartItem | undefined {
  const selectedPackage: ProductPackage | undefined = configuration.selectedPackageSlug
    ? product.packages?.find((pkg) => pkg.slug === configuration.selectedPackageSlug)
    : undefined;

  const selectedOptions: CartOptionSelection[] = [];
  for (const option of product.options ?? []) {
    const chosenValue = configuration.selectedOptionValues[option.key];
    if (!chosenValue) continue;
    const valueDef = option.values.find((value) => value.value === chosenValue);
    if (!valueDef) continue;
    selectedOptions.push({
      optionKey: option.key,
      optionLabel: option.label,
      value: valueDef.value,
      valueLabel: valueDef.label,
      priceDelta: valueDef.priceDelta ?? 0,
    });
  }

  const selectedAddOns: CartAddOnSelection[] = (product.addOns ?? [])
    .filter((addOn) => configuration.selectedAddOnSlugs.includes(addOn.slug))
    .map((addOn) => ({
      addOnSlug: addOn.slug,
      label: addOn.label,
      price: addOn.price,
      chargeType: addOn.chargeType,
    }));

  const basePrice = selectedPackage
    ? (selectedPackage.price ?? selectedPackage.startingPrice)
    : (product.pricing.basePrice ?? product.pricing.startingPrice);

  if (basePrice === undefined) {
    return undefined;
  }

  const unitPrice = basePrice + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);

  const packageSelection: CartPackageSelection | undefined = selectedPackage
    ? {
        packageSlug: selectedPackage.slug,
        label: selectedPackage.label,
        price: selectedPackage.price,
        startingPrice: selectedPackage.startingPrice,
      }
    : undefined;

  return {
    cartLineId: crypto.randomUUID(),
    productId: product.id,
    productSlug: product.slug,
    productTitle: product.title,
    productType: product.productType,
    purchaseMode: product.pricing.mode,
    quantity: configuration.quantity,
    selectedPackage: packageSelection,
    selectedOptions,
    selectedAddOns,
    unitPrice,
    depositAmount: product.pricing.mode === "deposit" ? product.pricing.depositAmount : undefined,
    addedAt: new Date().toISOString(),
  };
}

// A deterministic, order-safe "same configuration" signature used to
// decide whether ADD_ITEM should merge into an existing line (increment
// quantity) or create a new one. Deliberately excludes cartLineId/quantity/
// addedAt — those aren't part of a line's identity. Option/add-on order
// never affects the signature (both are sorted).
export function getConfigurationSignature(
  item: Pick<CartItem, "productId" | "selectedPackage" | "selectedOptions" | "selectedAddOns">,
): string {
  const packagePart = item.selectedPackage?.packageSlug ?? "";
  const optionsPart = item.selectedOptions
    .map((option) => `${option.optionKey}:${option.value}`)
    .sort()
    .join(",");
  const addOnsPart = [...item.selectedAddOns.map((addOn) => addOn.addOnSlug)].sort().join(",");
  return [item.productId, packagePart, optionsPart, addOnsPart].join("|");
}
