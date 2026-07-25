import { siteConfig } from "@/config/site";
import type { CartAddOnSelection, CartItem, CartOptionSelection, CartPackageSelection } from "./cart";
import { calculateLineSubtotal } from "./cart-pricing";
import { formatMoney } from "./money";
import type { ProductType, PurchaseMode } from "./products";

// OrderDraft/OrderLine are the checkout-and-beyond counterpart to Cart/
// CartItem: where a cart is mutable and always re-derives its totals, an
// OrderLine freezes everything permanently the moment it's created from a
// CartItem. See CLAUDE.md "Checkout + Order foundation" for the full
// architecture writeup, including why there is deliberately no
// orderNumber, no payment/fulfillment statuses, and no server persistence
// yet in this phase.

// Phase 18B — widened from the original 5-value checkout-only set to the
// approved 8-value creative-project work lifecycle. buildOrderDraft() below
// (the checkout path) only ever writes "needs-review" or "submitted" —
// both remain valid members of this set, so this widening is not a
// behavior change for checkout, only for the new admin-driven manual-order
// lifecycle. See CLAUDE.md "Leads, Customers, and Orders Admin".
export const ORDER_STATUSES = [
  "draft",
  "needs-review",
  "submitted",
  "approved",
  "in-progress",
  "awaiting-client",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Explicit, fixed transition table — never an arbitrary status-to-status
// jump. "completed" and "cancelled" are terminal (empty arrays). Enforced
// server-side by isValidOrderStatusTransition() below; every admin status
// change must go through it.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["needs-review", "submitted", "cancelled"],
  "needs-review": ["submitted", "cancelled"],
  submitted: ["approved", "needs-review", "cancelled"],
  approved: ["in-progress", "cancelled"],
  "in-progress": ["awaiting-client", "completed", "cancelled"],
  "awaiting-client": ["in-progress", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return (ORDER_STATUS_TRANSITIONS[from] as readonly OrderStatus[]).includes(to);
}

// Payment status — a fully independent axis from work status (see
// orders.paymentStatus in src/db/schema.ts). Tracking only: no Stripe, no
// processor, no charge/refund API. "refunded" is terminal.
export const PAYMENT_STATUSES = ["unpaid", "deposit-paid", "paid-in-full", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ["deposit-paid", "paid-in-full"],
  "deposit-paid": ["paid-in-full", "refunded"],
  "paid-in-full": ["refunded"],
  refunded: [],
};

export function isValidPaymentStatusTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return false;
  return (PAYMENT_STATUS_TRANSITIONS[from] as readonly PaymentStatus[]).includes(to);
}

export type OrderLine = {
  // Stable identity for this line within the order — crypto.randomUUID(),
  // independent of the CartItem's own cartLineId.
  orderLineId: string;

  productId: string;
  productSlug: string;
  productTitle: string;
  productType: ProductType;
  purchaseMode: PurchaseMode;
  quantity: number;

  // Reused directly from cart.ts — already frozen, Product-independent
  // value shapes with no live-lookup dependency of their own.
  selectedPackage?: CartPackageSelection;
  selectedOptions: CartOptionSelection[];
  selectedAddOns: CartAddOnSelection[];

  unitPrice: number;
  depositAmount?: number;

  // Frozen here — unlike CartItem, which never stores a total so it can
  // never go stale. An OrderLine is historical, so freezing is correct.
  lineSubtotal: number;

  // Service-intake handoff. Always undefined in Phase 10 — nothing
  // produces these yet (neither Product nor Service currently declares an
  // "intake required" concept that reaches a Product). A future phase must
  // decide whether this originates from Product, Service, or an explicit
  // offering-to-intake relationship. Never duplicate questionnaire answers
  // into an OrderLine — this is a reference/status only.
  intakeRequired?: boolean;
  intakeFormSlug?: string;
  intakeStatus?: "not-started" | "in-progress" | "complete";
};

export type OrderCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
};

// Defined now for stable future typing — NOT collected by any Phase 10
// checkout UI. No shipping/tax/payment integration exists yet to justify
// asking for it, and many offerings are service/digital work with no
// shipping address at all.
export type OrderAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderPricingSummary = {
  subtotal: number;
  depositDue: number;
  hasEstimatedPricing: boolean;
};

export type OrderDraft = {
  // Permanent internal identity — crypto.randomUUID(). Deliberately no
  // human-readable orderNumber in Phase 10: generating one safely requires
  // a single server-side coordinating source of truth to guarantee
  // uniqueness, which doesn't exist yet. Do not derive an order number from
  // a timestamp, email, or client-side counter.
  id: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;

  customer: OrderCustomer;
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;

  lines: OrderLine[];
  pricingSummary: OrderPricingSummary;
  notes?: string;
};

export function cartItemToOrderLine(item: CartItem): OrderLine {
  return {
    orderLineId: crypto.randomUUID(),
    productId: item.productId,
    productSlug: item.productSlug,
    productTitle: item.productTitle,
    productType: item.productType,
    purchaseMode: item.purchaseMode,
    quantity: item.quantity,
    selectedPackage: item.selectedPackage,
    selectedOptions: item.selectedOptions,
    selectedAddOns: item.selectedAddOns,
    unitPrice: item.unitPrice,
    depositAmount: item.depositAmount,
    lineSubtotal: calculateLineSubtotal(item),
  };
}

// The single place a CartItem[] + customer input becomes an OrderDraft.
// Status is decided here, not by the caller: any starting-price line makes
// the whole draft "needs-review" rather than "submitted" — see CLAUDE.md
// for why (an unresolved estimate must never be presented as a confirmed,
// ready-to-fulfill request).
export function buildOrderDraft(items: CartItem[], customer: OrderCustomer, notes: string): OrderDraft {
  const lines = items.map(cartItemToOrderLine);
  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  const depositDue = lines.reduce((sum, line) => sum + (line.depositAmount ?? 0), 0);
  const hasEstimatedPricing = lines.some((line) => line.purchaseMode === "starting-price");
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: hasEstimatedPricing ? "needs-review" : "submitted",
    customer,
    lines,
    pricingSummary: { subtotal, depositDue, hasEstimatedPricing },
    notes: notes.trim() ? notes.trim() : undefined,
  };
}

// Plain-text order-request summary for the temporary mailto handoff (see
// CLAUDE.md — this is a pre-backend bridge, not a real submission
// mechanism). Deliberately includes only what's needed to act on the
// request: no browser/system information.
export function buildOrderRequestSummary(draft: OrderDraft): string {
  const lines: string[] = [];
  lines.push(`Order request — reference ${draft.id}`);
  lines.push(`Status: ${draft.status}`);
  lines.push("");
  lines.push("Customer:");
  lines.push(`  ${draft.customer.firstName} ${draft.customer.lastName}`);
  lines.push(`  ${draft.customer.email}`);
  if (draft.customer.phone) lines.push(`  ${draft.customer.phone}`);
  if (draft.customer.company) lines.push(`  ${draft.customer.company}`);
  lines.push("");
  lines.push("Items:");
  draft.lines.forEach((line, index) => {
    lines.push(`${index + 1}. ${line.productTitle} x${line.quantity}`);
    if (line.selectedPackage) {
      lines.push(`   Package: ${line.selectedPackage.label}`);
    }
    line.selectedOptions.forEach((option) => {
      lines.push(`   ${option.optionLabel}: ${option.valueLabel}`);
    });
    if (line.selectedAddOns.length > 0) {
      lines.push(`   Add-ons: ${line.selectedAddOns.map((addOn) => addOn.label).join(", ")}`);
    }
    const estimateNote = line.purchaseMode === "starting-price" ? " (estimated)" : "";
    lines.push(`   Line subtotal: ${formatMoney(line.lineSubtotal)}${estimateNote}`);
    if (line.depositAmount !== undefined) {
      lines.push(`   Deposit expected later: ${formatMoney(line.depositAmount)}`);
    }
  });
  lines.push("");
  const summaryLabel = draft.pricingSummary.hasEstimatedPricing ? "Estimated subtotal" : "Order value";
  lines.push(`${summaryLabel}: ${formatMoney(draft.pricingSummary.subtotal)}`);
  if (draft.pricingSummary.depositDue > 0) {
    lines.push(`Deposit expected later: ${formatMoney(draft.pricingSummary.depositDue)}`);
  }
  if (draft.pricingSummary.hasEstimatedPricing) {
    lines.push("");
    lines.push("NOTE: This request includes starting-price items. Final pricing is subject to confirmation.");
  }
  if (draft.notes) {
    lines.push("");
    lines.push("Notes:");
    lines.push(draft.notes);
  }
  lines.push("");
  lines.push("No payment has been collected. This request is not yet stored in an order system.");
  return lines.join("\n");
}

export function buildOrderRequestMailto(draft: OrderDraft): string {
  const subject = `Order request — ${draft.customer.firstName} ${draft.customer.lastName} (${draft.id.slice(0, 8)})`;
  const body = buildOrderRequestSummary(draft);
  return `mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
