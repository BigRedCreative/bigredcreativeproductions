"use client";

import { useActionState, useState } from "react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  PURCHASE_MODES,
  slugify,
} from "@/data/products";
import type { Product } from "@/data/products";
import type { ProductFormState } from "@/server/mutate-product";
import ProductOptionsEditor from "./ProductOptionsEditor";
import ProductPackagesEditor from "./ProductPackagesEditor";
import ProductAddOnsEditor from "./ProductAddOnsEditor";
import ProductMediaEditor from "./ProductMediaEditor";

type ProductFormProps = {
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initialProduct?: Product;
  services: Array<{ slug: string; title: string }>;
  submitLabel: string;
};

function dollarsValue(cents: number | undefined): string {
  return cents !== undefined ? String(cents / 100) : "";
}

export default function ProductForm({ action, initialProduct, services, submitLabel }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState<ProductFormState, FormData>(action, null);

  const [title, setTitle] = useState(initialProduct?.title ?? "");
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct));
  const [purchaseMode, setPurchaseMode] = useState<Product["pricing"]["mode"]>(
    initialProduct?.pricing.mode ?? "inquiry",
  );
  // Every <select> in this form is a CONTROLLED component (value + onChange
  // + useState), never defaultValue-only. This is a deliberate fix, not
  // stylistic: React's <select> reconciliation can re-apply defaultValue on
  // a re-render triggered by unrelated state elsewhere in this component
  // (e.g. typing in the controlled Title field), silently reverting a
  // user's just-made selection before the form is ever submitted. This was
  // confirmed to be the root cause of status/productType edits silently
  // failing to persist — see CLAUDE.md "Product admin + database-backed
  // catalog" for the full investigation writeup. purchaseMode already used
  // this pattern correctly, which is exactly why it was never affected.
  const [category, setCategory] = useState<Product["category"]>(initialProduct?.category ?? PRODUCT_CATEGORIES[0]);
  const [productType, setProductType] = useState<Product["productType"]>(
    initialProduct?.productType ?? PRODUCT_TYPES[0],
  );
  const [relatedServiceSlug, setRelatedServiceSlug] = useState(initialProduct?.relatedServiceSlug ?? "");
  const [status, setStatus] = useState<Product["status"]>(initialProduct?.status ?? "draft");

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  return (
    <form action={formAction} className="admin-form">
      {state?.errors && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <p>Please fix the following:</p>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="admin-form-section">
        <legend>
          <h2>Basic information</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Title
            <input type="text" name="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Short title
            <span className="admin-form-optional"> — used where space is tight (cards, nav)</span>
            <input type="text" name="shortTitle" defaultValue={initialProduct?.shortTitle} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Slug
            <span className="admin-form-help">Auto-fills from the title until you edit it directly. Public URL: /store/{slug || "…"}</span>
            <input
              type="text"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
            />
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Category
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Product["category"])}
              required
            >
              {PRODUCT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product type
            <select
              name="productType"
              value={productType}
              onChange={(e) => setProductType(e.target.value as Product["productType"])}
              required
            >
              <option value="physical">Physical product</option>
              <option value="service">Service</option>
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Summary
            <span className="admin-form-help">One sentence — shown on cards and as the page intro.</span>
            <textarea name="summary" defaultValue={initialProduct?.summary} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Full description
            <textarea name="fullDescription" defaultValue={initialProduct?.fullDescription} required />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Commerce</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Purchase mode
            <select
              name="purchaseMode"
              value={purchaseMode}
              onChange={(e) => setPurchaseMode(e.target.value as Product["pricing"]["mode"])}
            >
              {PURCHASE_MODES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(purchaseMode === "fixed-price" || purchaseMode === "full-payment") && (
          <div className="admin-form-row">
            <label>
              Price
              <span className="admin-form-help">$25.00 — required once this product is published.</span>
              <input type="number" step="0.01" name="basePrice" defaultValue={dollarsValue(initialProduct?.pricing.basePrice)} />
            </label>
          </div>
        )}

        {purchaseMode === "starting-price" && (
          <div className="admin-form-row">
            <label>
              Starting price
              <span className="admin-form-help">$25.00 — required once this product is published (or set a package price below).</span>
              <input
                type="number"
                step="0.01"
                name="startingPrice"
                defaultValue={dollarsValue(initialProduct?.pricing.startingPrice)}
              />
            </label>
          </div>
        )}

        {purchaseMode === "deposit" && (
          <div className="admin-form-row admin-form-row-split">
            <label>
              Base or starting price
              <input type="number" step="0.01" name="basePrice" defaultValue={dollarsValue(initialProduct?.pricing.basePrice)} />
            </label>
            <label>
              Deposit amount
              <span className="admin-form-help">Required once published.</span>
              <input
                type="number"
                step="0.01"
                name="depositAmount"
                defaultValue={dollarsValue(initialProduct?.pricing.depositAmount)}
              />
            </label>
          </div>
        )}

        {purchaseMode === "inquiry" && (
          <p className="admin-form-section-help">Inquiry-only products never require a direct price.</p>
        )}

        <div className="admin-form-row">
          <label>
            Pricing note
            <span className="admin-form-optional"> (optional)</span>
            <input type="text" name="pricingNote" defaultValue={initialProduct?.pricing.pricingNote} />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Options</h2>
        </legend>
        <p className="admin-form-section-help">Generic configurable choices — size, finish, quantity tier, whatever applies. Leave empty if this product has none.</p>
        <ProductOptionsEditor initialOptions={initialProduct?.options ?? []} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Packages</h2>
        </legend>
        <p className="admin-form-section-help">Optional tiered offerings (e.g. Basic/Standard/Premium). Leave empty if this product has none.</p>
        <ProductPackagesEditor initialPackages={initialProduct?.packages ?? []} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Add-ons</h2>
        </legend>
        <p className="admin-form-section-help">Optional extras. Leave empty if this product has none.</p>
        <ProductAddOnsEditor initialAddOns={initialProduct?.addOns ?? []} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Store presentation</h2>
        </legend>
        <label className="admin-form-checkbox-row">
          <input type="checkbox" name="featured" defaultChecked={initialProduct?.featured ?? false} />
          Featured — eligible for homepage/teaser placement
        </label>
        <div className="admin-form-row admin-repeatable-subrow">
          <label>
            CTA label
            <input type="text" name="ctaLabel" defaultValue={initialProduct?.ctaLabel} placeholder="Order this product" required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Related service
            <span className="admin-form-optional"> (optional — links back to an informational service page)</span>
            <select name="relatedServiceSlug" value={relatedServiceSlug} onChange={(e) => setRelatedServiceSlug(e.target.value)}>
              <option value="">None</option>
              {services.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            SEO title
            <input type="text" name="seoTitle" defaultValue={initialProduct?.seo.title} required />
          </label>
          <label>
            SEO description
            <input type="text" name="seoDescription" defaultValue={initialProduct?.seo.description} required />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Media</h2>
        </legend>
        <ProductMediaEditor initialMedia={initialProduct?.media ?? []} slug={slug} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Publishing</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Status
            <select name="status" value={status} onChange={(e) => setStatus(e.target.value as Product["status"])} required>
              {PRODUCT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="admin-form-section-help">
          Draft products are visible only here in admin. Published products appear on the public store. Archived
          products are hidden publicly but stay viewable here — there is no delete action.
        </p>
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
