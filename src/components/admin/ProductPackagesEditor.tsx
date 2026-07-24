"use client";

import { useState } from "react";
import type { ProductPackage } from "@/data/products";

function emptyPackage(): ProductPackage {
  return { slug: "", label: "", description: "" };
}

// Generic tiered-package editor (e.g. Basic/Standard/Premium) — no
// business pricing is ever pre-filled, every field starts blank.
export default function ProductPackagesEditor({ initialPackages }: { initialPackages: ProductPackage[] }) {
  const [packages, setPackages] = useState<ProductPackage[]>(initialPackages);

  function updatePackage(index: number, patch: Partial<ProductPackage>) {
    setPackages((prev) => prev.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)));
  }

  function addPackage() {
    setPackages((prev) => [...prev, emptyPackage()]);
  }

  function removePackage(index: number) {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input type="hidden" name="packagesJson" value={JSON.stringify(packages)} />
      {packages.map((pkg, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Package {index + 1}</span>
            <button type="button" className="admin-remove-button" onClick={() => removePackage(index)}>
              Remove package
            </button>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Slug
              <input
                type="text"
                value={pkg.slug}
                placeholder="standard"
                onChange={(e) => updatePackage(index, { slug: e.target.value })}
              />
            </label>
            <label>
              Label
              <input
                type="text"
                value={pkg.label}
                placeholder="Standard"
                onChange={(e) => updatePackage(index, { label: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Description
              <textarea value={pkg.description} onChange={(e) => updatePackage(index, { description: e.target.value })} />
            </label>
          </div>
          <div className="admin-form-row admin-form-row-split admin-repeatable-subrow">
            <label>
              Price
              <span className="admin-form-optional"> (optional — leave blank if this tier only has a starting price)</span>
              <input
                type="number"
                step="0.01"
                value={pkg.price !== undefined ? pkg.price / 100 : ""}
                placeholder="0.00"
                onChange={(e) =>
                  updatePackage(index, { price: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100) })
                }
              />
            </label>
            <label>
              Starting price
              <span className="admin-form-optional"> (optional)</span>
              <input
                type="number"
                step="0.01"
                value={pkg.startingPrice !== undefined ? pkg.startingPrice / 100 : ""}
                placeholder="0.00"
                onChange={(e) =>
                  updatePackage(index, {
                    startingPrice: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </label>
          </div>
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Turnaround
              <span className="admin-form-optional"> (optional)</span>
              <input
                type="text"
                value={pkg.turnaround ?? ""}
                placeholder="e.g. 5 business days"
                onChange={(e) => updatePackage(index, { turnaround: e.target.value || undefined })}
              />
            </label>
          </div>
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Deliverables
              <span className="admin-form-optional"> (optional — one per line)</span>
              <textarea
                value={(pkg.deliverables ?? []).join("\n")}
                onChange={(e) =>
                  updatePackage(index, {
                    deliverables: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addPackage}>
        + Add package
      </button>
    </div>
  );
}
