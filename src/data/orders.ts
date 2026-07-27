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
// orders.paymentStatus in src/db/schema.ts).
//
// Phase 21C-2A — widened, additively, to support a future Stripe-linked
// payment path alongside the existing manual/off-platform one. Nothing
// existing was removed or renamed: "unpaid"/"deposit-paid"/"paid-in-full"/
// "refunded" keep their exact original meaning and remain the values used
// by manual/off-platform orders (admin-recorded phone/check/etc. payments,
// unchanged since Phase 18B) — confirmed by inspection to still be read
// by src/server/brain/context-builder.ts, the admin dashboard
// (src/app/admin/(protected)/page.tsx), and OrdersFilterBar.tsx, all of
// which check these exact literal strings and required zero changes here.
//
// "pending"/"paid"/"failed"/"canceled" are new: the future Stripe-linked
// path's own values. "paid" is deliberately a NEW, separate value from
// "paid-in-full" — not a rename — so a fully-paid manual order and a
// fully-paid Stripe order stay textually distinguishable at a glance
// (and so no existing code checking for "paid-in-full" needs to also
// learn about "paid"). See CLAUDE.md's Phase 21C-2A writeup, "Manual vs.
// Stripe-linked payment status values," for the full compatibility
// findings and the "stripePaymentIntentId is the discriminator" design.
//
// "canceled" (US spelling) is used here deliberately, distinct from
// orders.status's own "cancelled" (UK spelling, the pre-existing WORK
// status value) — this is a real, easy-to-miss inconsistency between two
// independent enums, not a typo introduced by this phase; flagged
// explicitly rather than silently normalized, since fixing orders.status's
// spelling is a separate, unrelated concern well outside 21C-2A's scope.
export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "canceled",
  "deposit-paid",
  "paid-in-full",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Two overlapping sub-vocabularies live in one flat table, on purpose —
// PAYMENT_STATUSES/PaymentStatus stay a single type so every existing
// caller (OrderPaymentStatusForm, setOrderPaymentStatusAction,
// getPaymentStatusCounts, etc.) keeps working unmodified. Every EXISTING
// manual transition below is byte-for-byte unchanged from before this
// phase. The new Stripe-linked transitions are additive.
//
// Phase 21C-2A semantic rule (see CLAUDE.md): order creation alone does
// NOT mean "pending" — no code in this phase ever performs the
// unpaid -> pending transition. It exists here now only so a FUTURE,
// separately-approved PaymentIntent-creation step (21C-2B) has a real,
// already-reviewed transition to call isValidPaymentStatusTransition()
// against, once it actually exists. "paid" has no outgoing transition
// yet — refund transitions for Stripe-linked orders are explicitly
// deferred to Phase 21C-2F, not added here.
//
// KNOWN, DOCUMENTED GAP (not fixed this phase, flagged for 21C-2D): today,
// OrderPaymentStatusForm renders every value in
// PAYMENT_STATUS_TRANSITIONS[currentStatus] as an admin-clickable option,
// with no awareness of whether an order is Stripe-linked
// (stripePaymentIntentId set) or manual. This is harmless right now —
// no code anywhere in the app can set stripePaymentIntentId yet (that
// first happens in Phase 21C-2B), so no real order can currently be
// Stripe-linked. Before any real Stripe-linked order can exist, 21C-2D
// MUST add a stripePaymentIntentId-aware restriction so an admin can
// never manually pick "pending"/"paid"/"failed"/"canceled" for a
// Stripe-linked order (or "deposit-paid"/"paid-in-full" in contradiction
// to what Stripe reports) — see CLAUDE.md Part F's write-up for the full
// reasoning.
export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  // Existing manual transitions — unchanged. "pending" added as the one
  // new addition, for a future Stripe-initiated PaymentIntent creation.
  unpaid: ["pending", "deposit-paid", "paid-in-full"],
  pending: ["paid", "failed", "canceled"],
  paid: [],
  failed: ["pending"],
  canceled: [],
  // Existing manual transitions — byte-for-byte unchanged.
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
