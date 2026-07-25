"use client";

import { useState } from "react";

export type CatalogProductOption = { id: string; slug: string; title: string };

export type InitialOrderLine = {
  productId: string | null;
  productSlug: string | null;
  productTitle: string;
  description: string | null;
  productType: string;
  quantity: number;
  unitPrice: number; // cents
};

type LineItemState = {
  productId: string | null;
  productSlug: string | null;
  productTitle: string;
  description: string;
  productType: "physical" | "service";
  quantity: number;
  unitPriceDollars: string;
};

function emptyLine(): LineItemState {
  return {
    productId: null,
    productSlug: null,
    productTitle: "",
    description: "",
    productType: "service",
    quantity: 1,
    unitPriceDollars: "",
  };
}

function dollarsFromCents(cents: number): string {
  return String(cents / 100);
}

// Repeatable line-item array editor, mirroring ProductOptionsEditor.tsx's
// exact local-state/add/remove/serialize-to-one-hidden-JSON-field pattern.
// Every line can EITHER reference a published catalog product (selecting
// one prefills the title, still editable, and sets productId/productSlug)
// OR stay a fully custom/manual item (productId/productSlug left null —
// never a fake identifier). "Type" defaults to Service but is a real
// controlled <select> so Physical (print/production work) is never
// silently forced — see CLAUDE.md. The subtotal shown here is a live
// preview only; the server always recalculates the authoritative total
// from unitPrice * quantity on save, never trusting this number.
export default function OrderLineItemsEditor({
  initialLines = [],
  catalogProducts,
}: {
  initialLines?: InitialOrderLine[];
  catalogProducts: CatalogProductOption[];
}) {
  const [lines, setLines] = useState<LineItemState[]>(
    initialLines.length > 0
      ? initialLines.map((line) => ({
          productId: line.productId,
          productSlug: line.productSlug,
          productTitle: line.productTitle,
          description: line.description ?? "",
          productType: line.productType === "physical" ? "physical" : "service",
          quantity: line.quantity,
          unitPriceDollars: dollarsFromCents(line.unitPrice),
        }))
      : [emptyLine()],
  );

  function updateLine(index: number, patch: Partial<LineItemState>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function applyCatalogProduct(index: number, productId: string) {
    if (!productId) {
      updateLine(index, { productId: null, productSlug: null });
      return;
    }
    const product = catalogProducts.find((p) => p.id === productId);
    if (!product) return;
    updateLine(index, {
      productId: product.id,
      productSlug: product.slug,
      productTitle: lines[index].productTitle || product.title,
    });
  }

  const linesJson = JSON.stringify(
    lines.map((line) => ({
      productId: line.productId,
      productSlug: line.productSlug,
      productTitle: line.productTitle,
      description: line.description,
      productType: line.productType,
      quantity: line.quantity,
      unitPriceDollars: line.unitPriceDollars,
    })),
  );

  const previewSubtotalCents = lines.reduce((sum, line) => {
    const unitCents = Math.round(Number(line.unitPriceDollars || 0) * 100);
    return sum + (Number.isFinite(unitCents) ? unitCents * (Number(line.quantity) || 0) : 0);
  }, 0);

  return (
    <div>
      <input type="hidden" name="linesJson" value={linesJson} />
      {lines.map((line, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Line {index + 1}</span>
            {lines.length > 1 && (
              <button type="button" className="admin-remove-button" onClick={() => removeLine(index)}>
                Remove line
              </button>
            )}
          </div>

          {catalogProducts.length > 0 && (
            <div className="admin-form-row">
              <label>
                Catalog product
                <span className="admin-form-optional"> (optional — leave as Custom item for manual work)</span>
                <select value={line.productId ?? ""} onChange={(e) => applyCatalogProduct(index, e.target.value)}>
                  <option value="">Custom item (no catalog product)</option>
                  {catalogProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="admin-form-row admin-form-row-split">
            <label>
              Title
              <input
                type="text"
                value={line.productTitle}
                placeholder="Custom Packaging Design"
                onChange={(e) => updateLine(index, { productTitle: e.target.value })}
              />
            </label>
            <label>
              Type
              <select
                value={line.productType}
                onChange={(e) => updateLine(index, { productType: e.target.value as "physical" | "service" })}
              >
                <option value="service">Service</option>
                <option value="physical">Physical</option>
              </select>
            </label>
          </div>

          <div className="admin-form-row">
            <label>
              Description
              <span className="admin-form-optional"> (optional)</span>
              <textarea
                value={line.description}
                placeholder="Front/back pouch design, print-ready production files, 2 revision rounds, and final CMYK exports."
                onChange={(e) => updateLine(index, { description: e.target.value })}
              />
            </label>
          </div>

          <div className="admin-form-row admin-form-row-split">
            <label>
              Quantity
              <input
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })}
              />
            </label>
            <label>
              Unit price
              <span className="admin-form-help">Dollars — converted to cents on save.</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.unitPriceDollars}
                placeholder="0.00"
                onChange={(e) => updateLine(index, { unitPriceDollars: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addLine}>
        + Add line item
      </button>
      <p className="admin-form-section-help">
        Preview subtotal:{" "}
        {(previewSubtotalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} — the server
        recalculates this authoritatively on save.
      </p>
    </div>
  );
}
