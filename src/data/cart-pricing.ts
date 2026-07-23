import type { CartItem } from "./cart";

// The only place that computes totals from CartItem[]. Everything here is
// derived on demand from the frozen per-item snapshots (unitPrice,
// selectedAddOns, etc.) — nothing is stored on CartItem itself, so a
// quantity change can never leave a stale stored total behind. Components
// must call these instead of doing their own arithmetic.

// Add-ons priced "per-unit" scale with quantity; "per-line" charge once for
// the whole line no matter how many units are ordered.
function calculateAddOnsTotal(item: CartItem): number {
  return item.selectedAddOns.reduce((sum, addOn) => {
    const price = addOn.price ?? 0;
    return sum + (addOn.chargeType === "per-unit" ? price * item.quantity : price);
  }, 0);
}

export function calculateLineSubtotal(item: CartItem): number {
  return item.unitPrice * item.quantity + calculateAddOnsTotal(item);
}

export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
}

// Total quantity across all lines (not distinct line count) — e.g. a line
// with quantity 2 and a line with quantity 1 count as 3.
export function calculateCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateCartDepositDue(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.depositAmount ?? 0), 0);
}

// True when any line's price was only ever a "starting at" estimate —
// callers use this to decide whether to label a total as estimated rather
// than a confirmed, final number.
export function cartHasEstimatedPricing(items: CartItem[]): boolean {
  return items.some((item) => item.purchaseMode === "starting-price");
}

export function isCartEmpty(items: CartItem[]): boolean {
  return items.length === 0;
}
