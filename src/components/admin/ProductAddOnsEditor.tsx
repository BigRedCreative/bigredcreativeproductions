"use client";

import { useState } from "react";
import type { AddOnChargeType, ProductAddOn } from "@/data/products";

function emptyAddOn(): ProductAddOn {
  return { slug: "", label: "", chargeType: "per-line" };
}

// chargeType is required on every add-on — never silently defaulted past
// this UI — because it changes cart/order math (see cart-pricing.ts):
// "per-unit" multiplies by quantity, "per-line" charges once regardless.
export default function ProductAddOnsEditor({ initialAddOns }: { initialAddOns: ProductAddOn[] }) {
  const [addOns, setAddOns] = useState<ProductAddOn[]>(initialAddOns);

  function updateAddOn(index: number, patch: Partial<ProductAddOn>) {
    setAddOns((prev) => prev.map((addOn, i) => (i === index ? { ...addOn, ...patch } : addOn)));
  }

  function addAddOn() {
    setAddOns((prev) => [...prev, emptyAddOn()]);
  }

  function removeAddOn(index: number) {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input type="hidden" name="addOnsJson" value={JSON.stringify(addOns)} />
      {addOns.map((addOn, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Add-on {index + 1}</span>
            <button type="button" className="admin-remove-button" onClick={() => removeAddOn(index)}>
              Remove add-on
            </button>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Slug
              <input
                type="text"
                value={addOn.slug}
                placeholder="extra-revision"
                onChange={(e) => updateAddOn(index, { slug: e.target.value })}
              />
            </label>
            <label>
              Label
              <input
                type="text"
                value={addOn.label}
                placeholder="Extra revision round"
                onChange={(e) => updateAddOn(index, { label: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Description
              <span className="admin-form-optional"> (optional)</span>
              <input
                type="text"
                value={addOn.description ?? ""}
                onChange={(e) => updateAddOn(index, { description: e.target.value || undefined })}
              />
            </label>
          </div>
          <div className="admin-form-row admin-form-row-split admin-repeatable-subrow">
            <label>
              Price
              <span className="admin-form-optional"> (optional)</span>
              <input
                type="number"
                step="0.01"
                value={addOn.price !== undefined ? addOn.price / 100 : ""}
                placeholder="0.00"
                onChange={(e) =>
                  updateAddOn(index, { price: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100) })
                }
              />
            </label>
            <div>
              <span className="admin-form-help">Charge type</span>
              <label className="admin-form-checkbox-row">
                <input
                  type="radio"
                  name={`chargeType-${index}`}
                  checked={addOn.chargeType === "per-unit"}
                  onChange={() => updateAddOn(index, { chargeType: "per-unit" as AddOnChargeType })}
                />
                Per unit — charged once for every quantity ordered
              </label>
              <label className="admin-form-checkbox-row">
                <input
                  type="radio"
                  name={`chargeType-${index}`}
                  checked={addOn.chargeType === "per-line"}
                  onChange={() => updateAddOn(index, { chargeType: "per-line" as AddOnChargeType })}
                />
                Per line — charged once for the configured cart line, regardless of quantity
              </label>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addAddOn}>
        + Add add-on
      </button>
    </div>
  );
}
