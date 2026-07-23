import type { ProductPricing, PurchaseMode } from "./products";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Formats integer cents as a USD currency string, e.g. 50000 -> "$500.00".
// This is the only place in the app that should divide a Money value by
// 100 — never scatter manual /100 formatting into components.
export function formatMoney(cents: number): string {
  return usdFormatter.format(cents / 100);
}

const PURCHASE_MODE_LABELS: Record<PurchaseMode, string> = {
  inquiry: "Inquiry only",
  "fixed-price": "Fixed price",
  "starting-price": "Starting price",
  deposit: "Deposit required",
  "full-payment": "Paid in full",
};

export function getPurchaseModeLabel(mode: PurchaseMode): string {
  return PURCHASE_MODE_LABELS[mode];
}

// Centralizes purchase-mode-aware pricing headline text so branching on
// pricing.mode doesn't get duplicated across ProductCard/ProductHero/
// ProductPricing. Falls back to "Inquire for pricing" whenever the expected
// number for a given mode hasn't been set yet (e.g. a draft still being
// priced) rather than showing a blank or malformed price.
export function formatPricingSummary(pricing: ProductPricing): string {
  switch (pricing.mode) {
    case "fixed-price":
    case "full-payment":
      return pricing.basePrice !== undefined ? formatMoney(pricing.basePrice) : "Inquire for pricing";
    case "starting-price":
      return pricing.startingPrice !== undefined
        ? `Starting at ${formatMoney(pricing.startingPrice)}`
        : "Inquire for pricing";
    case "deposit":
      return pricing.depositAmount !== undefined
        ? `${formatMoney(pricing.depositAmount)} deposit to start`
        : "Inquire for pricing";
    case "inquiry":
    default:
      return "Inquire for pricing";
  }
}
