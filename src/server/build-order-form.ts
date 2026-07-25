import "server-only";
import { dollarsToCents } from "@/server/dollars-to-cents";

export type ManualOrderLineCandidate = {
  productId: string | null;
  productSlug: string | null;
  productTitle: string;
  description: string | null;
  productType: "physical" | "service";
  quantity: number;
  unitPrice: number; // cents
};

export type OrderLinesFormResult =
  | { ok: true; lines: ManualOrderLineCandidate[] }
  | { ok: false; errors: string[] };

export type ManualOrderFormResult =
  | { ok: true; customerId: string; lines: ManualOrderLineCandidate[] }
  | { ok: false; errors: string[] };

type RawLine = {
  productId?: string | null;
  productSlug?: string | null;
  productTitle?: string;
  description?: string;
  productType?: string;
  quantity?: number;
  unitPriceDollars?: string;
};

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Shared line-item parsing for both order creation and draft-only line
// editing. Each line is admin-entered — unitPrice is trusted as typed
// (dollarsToCents, same conversion ProductForm already uses), since a
// manual order has no live catalog price to verify against (that
// verification pipeline exists specifically for the PUBLIC, unauthenticated
// checkout path — see verify-configuration.ts — not this trusted internal
// admin form). What is NEVER trusted from the client is any computed
// total: this function only returns unitPrice/quantity per line, never a
// lineSubtotal — the caller (create-manual-order.ts / mutate-order.ts)
// always computes lineSubtotal = unitPrice * quantity itself.
function parseOrderLines(formData: FormData): OrderLinesFormResult {
  const rawLinesJson = getString(formData, "linesJson");
  if (!rawLinesJson) {
    return { ok: false, errors: ["At least one line item is required."] };
  }

  let rawLines: RawLine[];
  try {
    const parsed: unknown = JSON.parse(rawLinesJson);
    if (!Array.isArray(parsed)) {
      return { ok: false, errors: ["Line items: submitted data is malformed."] };
    }
    rawLines = parsed as RawLine[];
  } catch {
    return { ok: false, errors: ["Line items: submitted data is malformed."] };
  }

  if (rawLines.length === 0) {
    return { ok: false, errors: ["At least one line item is required."] };
  }

  const errors: string[] = [];
  const lines: ManualOrderLineCandidate[] = [];

  rawLines.forEach((raw, index) => {
    const title = (raw.productTitle ?? "").trim();
    if (!title) errors.push(`Line ${index + 1}: a title is required.`);

    const productType = raw.productType;
    if (productType !== "physical" && productType !== "service") {
      errors.push(`Line ${index + 1}: type must be Physical or Service.`);
    }

    const quantity = Number(raw.quantity);
    const validQuantity = Number.isFinite(quantity) && Number.isInteger(quantity) && quantity >= 1;
    if (!validQuantity) errors.push(`Line ${index + 1}: quantity must be a whole number of at least 1.`);

    const unitPrice = dollarsToCents(raw.unitPriceDollars);
    if (unitPrice === null) errors.push(`Line ${index + 1}: a valid unit price is required.`);

    if (title && (productType === "physical" || productType === "service") && validQuantity && unitPrice !== null) {
      lines.push({
        productId: raw.productId || null,
        productSlug: raw.productSlug || null,
        productTitle: title,
        description: raw.description?.trim() || null,
        productType,
        quantity,
        unitPrice,
      });
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, lines };
}

export function buildOrderLinesFromFormData(formData: FormData): OrderLinesFormResult {
  return parseOrderLines(formData);
}

export function buildManualOrderFromFormData(formData: FormData): ManualOrderFormResult {
  const customerId = getString(formData, "customerId");
  const linesResult = parseOrderLines(formData);

  const errors: string[] = [];
  if (!customerId) errors.push("A customer is required.");
  if (!linesResult.ok) errors.push(...linesResult.errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, customerId, lines: (linesResult as { ok: true; lines: ManualOrderLineCandidate[] }).lines };
}
