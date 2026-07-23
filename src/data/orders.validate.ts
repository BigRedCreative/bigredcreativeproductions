import { ORDER_STATUSES, type OrderDraft } from "./orders";

// Unlike projects.validate.ts/services.validate.ts/products.validate.ts,
// this is a RUNTIME validator, not a build-time one: it validates an
// OrderDraft constructed dynamically from checkout form input + live cart
// state, called imperatively at the moment of submission — it returns a
// list of problems for inline UI display instead of throwing and blocking
// a build. The "collect everything, not just the first error" philosophy
// carries over from the build-time validators.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function validateOrderDraft(draft: OrderDraft): string[] {
  const errors: string[] = [];

  if (!draft.id?.trim()) {
    errors.push("Order id is required.");
  }
  if (!draft.createdAt?.trim() || !draft.updatedAt?.trim()) {
    errors.push("Order timestamps are required.");
  }
  if (!ORDER_STATUSES.includes(draft.status)) {
    errors.push(`Order status "${draft.status}" is not valid.`);
  }

  if (!draft.customer.firstName?.trim()) {
    errors.push("First name is required.");
  }
  if (!draft.customer.lastName?.trim()) {
    errors.push("Last name is required.");
  }
  if (!draft.customer.email?.trim()) {
    errors.push("Email is required.");
  } else if (!EMAIL_PATTERN.test(draft.customer.email.trim())) {
    errors.push("Enter a valid email address.");
  }

  if (!draft.lines || draft.lines.length === 0) {
    errors.push("Your order must contain at least one item.");
  } else {
    draft.lines.forEach((line, index) => {
      const label = `Item ${index + 1}`;

      if (!line.orderLineId?.trim()) {
        errors.push(`${label}: orderLineId is required.`);
      }
      if (!line.productId?.trim()) {
        errors.push(`${label}: productId is required.`);
      }
      if (!line.productSlug?.trim()) {
        errors.push(`${label}: productSlug is required.`);
      }
      if (!line.productTitle?.trim()) {
        errors.push(`${label}: productTitle is required.`);
      }

      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        errors.push(`${label}: quantity must be a positive integer.`);
      }

      if (!isNonNegativeInteger(line.unitPrice)) {
        errors.push(`${label}: unitPrice must be a non-negative integer number of cents.`);
      }
      if (!isNonNegativeInteger(line.lineSubtotal)) {
        errors.push(`${label}: lineSubtotal must be a non-negative integer number of cents.`);
      }

      if (line.depositAmount !== undefined) {
        if (!isNonNegativeInteger(line.depositAmount)) {
          errors.push(`${label}: depositAmount must be a non-negative integer number of cents.`);
        }
        if (line.purchaseMode !== "deposit") {
          errors.push(`${label}: depositAmount is only valid when purchaseMode is "deposit".`);
        }
      }

      if (line.purchaseMode === "starting-price" && !draft.pricingSummary.hasEstimatedPricing) {
        errors.push(`${label}: is a starting-price line but the order isn't flagged as estimated.`);
      }
    });
  }

  if (!isNonNegativeInteger(draft.pricingSummary.subtotal)) {
    errors.push("Order subtotal must be a non-negative integer number of cents.");
  }
  if (!isNonNegativeInteger(draft.pricingSummary.depositDue)) {
    errors.push("Order deposit due must be a non-negative integer number of cents.");
  }

  return errors;
}
