"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/data/products";
import type { Service } from "@/data/services";
import type { ServiceFormState } from "@/server/mutate-service";
import StringListEditor from "./StringListEditor";
import ProcessStepsEditor from "./ProcessStepsEditor";
import ServiceHeroField from "./ServiceHeroField";
import ServiceGalleryEditor from "./ServiceGalleryEditor";
import type { PickerMediaAsset } from "./ProductMediaEditor";

type ServiceFormProps = {
  action: (prevState: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  initialService?: Service;
  mediaAssets: PickerMediaAsset[];
  submitLabel: string;
};

// No <select> elements in this form — Service has no category/status
// field admin-editable here (status is handled by the separate
// archive/unarchive toggle; there's no category enum on Service at all),
// so the Phase 13 "every <select> must be controlled" rule has nothing to
// apply to. Title/slug still follow the same auto-slug-until-touched
// pattern ProductForm established.
export default function ServiceForm({ action, initialService, mediaAssets, submitLabel }: ServiceFormProps) {
  const [state, formAction, isPending] = useActionState<ServiceFormState, FormData>(action, null);

  const [title, setTitle] = useState(initialService?.title ?? "");
  const [slug, setSlug] = useState(initialService?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialService));

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
          <h2>Basic info</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Title
            <input type="text" name="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required />
          </label>
          <label>
            Short title
            <span className="admin-form-optional"> — used where space is tight (prev/next-style navigation)</span>
            <input type="text" name="shortTitle" defaultValue={initialService?.shortTitle ?? ""} />
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Slug
            <span className="admin-form-optional"> — the public URL: /services/[slug]</span>
            <input
              type="text"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              required
            />
          </label>
          <label>
            Service number
            <span className="admin-form-optional"> — display label, e.g. &quot;01&quot;</span>
            <input type="text" name="serviceNumber" defaultValue={initialService?.serviceNumber ?? ""} required />
          </label>
        </div>
        <label className="admin-form-checkbox-row">
          <input type="checkbox" name="featured" defaultChecked={initialService?.featured ?? false} />
          Featured on homepage (only takes effect once this draft is published)
        </label>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Overview copy</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Summary
            <span className="admin-form-optional"> — shown on the homepage row and the page hero</span>
            <textarea name="summary" defaultValue={initialService?.summary ?? ""} rows={3} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Full description
            <span className="admin-form-optional"> — shown in the service page&apos;s overview section</span>
            <textarea name="fullDescription" defaultValue={initialService?.fullDescription ?? ""} rows={6} required />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Capabilities</h2>
        </legend>
        <p className="admin-form-section-help">The first three appear as tag chips on the homepage row and hero.</p>
        <StringListEditor
          name="capabilitiesJson"
          label="Capability"
          initialItems={initialService?.capabilities ?? []}
          placeholder="e.g. Logo Design"
        />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Deliverables</h2>
        </legend>
        <StringListEditor
          name="deliverablesJson"
          label="Deliverable"
          initialItems={initialService?.deliverables ?? []}
          placeholder="e.g. Logo design files"
        />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Process</h2>
        </legend>
        <ProcessStepsEditor name="processJson" initialSteps={initialService?.process ?? []} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Media</h2>
        </legend>
        <ServiceHeroField name="heroImageJson" initialImage={initialService?.heroImage} mediaAssets={mediaAssets} />
        <ServiceGalleryEditor
          name="galleryJson"
          initialImages={initialService?.gallery ?? []}
          mediaAssets={mediaAssets}
        />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>SEO</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Page title
            <input type="text" name="seoTitle" defaultValue={initialService?.seo.title ?? ""} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Meta description
            <textarea name="seoDescription" defaultValue={initialService?.seo.description ?? ""} rows={2} required />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Call to action</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Button label
            <input type="text" name="ctaLabel" defaultValue={initialService?.ctaLabel ?? ""} required />
          </label>
        </div>
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
