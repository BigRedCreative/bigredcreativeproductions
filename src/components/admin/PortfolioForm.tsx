"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/data/products";
import { PROJECT_CATEGORIES } from "@/data/projects";
import type { Project, ProjectCategory } from "@/data/projects";
import type { PortfolioFormState } from "@/server/mutate-portfolio";
import StringListEditor from "./StringListEditor";
import ResultsEditor from "./ResultsEditor";
import CreditsEditor from "./CreditsEditor";
import PortfolioHeroField from "./PortfolioHeroField";
import PortfolioGalleryEditor from "./PortfolioGalleryEditor";
import PortfolioExternalLinkField from "./PortfolioExternalLinkField";
import type { PickerMediaAsset } from "./ProductMediaEditor";

type PortfolioFormProps = {
  action: (prevState: PortfolioFormState, formData: FormData) => Promise<PortfolioFormState>;
  initialProject?: Project;
  mediaAssets: PickerMediaAsset[];
  submitLabel: string;
};

// Card style — a constrained enum, never free text. These three classes
// are the complete, exhaustive set defined in globals.css; a typo'd value
// would silently break styling with nothing to catch it, so this is a
// controlled <select> over exactly these three options, per the Phase 13
// "every <select> must be controlled" rule and the explicit Portfolio
// Admin approval.
const CLASS_NAME_OPTIONS: { value: string; label: string }[] = [
  { value: "project-red", label: "Red" },
  { value: "project-dark", label: "Dark" },
  { value: "project-cream", label: "Cream" },
];

export default function PortfolioForm({ action, initialProject, mediaAssets, submitLabel }: PortfolioFormProps) {
  const [state, formAction, isPending] = useActionState<PortfolioFormState, FormData>(action, null);

  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [slug, setSlug] = useState(initialProject?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProject));
  const [category, setCategory] = useState<ProjectCategory>(initialProject?.category ?? PROJECT_CATEGORIES[0]);
  const [className, setClassName] = useState(initialProject?.className ?? CLASS_NAME_OPTIONS[0].value);

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
            <span className="admin-form-optional"> — used where space is tight (prev/next navigation)</span>
            <input type="text" name="shortTitle" defaultValue={initialProject?.shortTitle ?? ""} />
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Slug
            <span className="admin-form-optional"> — the public URL: /work/[slug]</span>
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
            Category
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value as ProjectCategory)}>
              {PROJECT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Card style
            <span className="admin-form-optional"> — the homepage card&apos;s background/accent color</span>
            <select name="className" value={className} onChange={(e) => setClassName(e.target.value)}>
              {CLASS_NAME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Stamp
            <span className="admin-form-optional"> — the rotated badge, e.g. &quot;FRESH DROP&quot;</span>
            <input type="text" name="stamp" defaultValue={initialProject?.stamp ?? ""} required />
          </label>
        </div>
        <label className="admin-form-checkbox-row">
          <input type="checkbox" name="featured" defaultChecked={initialProject?.featured ?? false} />
          Featured on homepage (only takes effect once this draft is published)
        </label>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Project story</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Summary
            <textarea name="summary" defaultValue={initialProject?.summary ?? ""} rows={3} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Full description
            <textarea name="fullDescription" defaultValue={initialProject?.fullDescription ?? ""} rows={6} required />
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Client
            <span className="admin-form-optional"> — leave blank unless confirmed, never invented</span>
            <input type="text" name="client" defaultValue={initialProject?.client ?? ""} />
          </label>
          <label>
            Year
            <span className="admin-form-optional"> — leave blank unless confirmed</span>
            <input type="text" name="year" defaultValue={initialProject?.year ?? ""} />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Services performed</h2>
        </legend>
        <p className="admin-form-section-help">
          Free-form descriptive tags shown on the project page — not linked to the Services catalog.
        </p>
        <StringListEditor
          name="servicesJson"
          label="Service"
          initialItems={initialProject?.services ?? []}
          placeholder="e.g. Brand identity development"
        />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Media</h2>
        </legend>
        <PortfolioHeroField name="heroImageJson" initialImage={initialProject?.heroImage} mediaAssets={mediaAssets} />
        <PortfolioGalleryEditor name="galleryJson" initialImages={initialProject?.gallery ?? []} mediaAssets={mediaAssets} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Results &amp; credits</h2>
        </legend>
        <ResultsEditor name="resultsJson" initialResults={initialProject?.results ?? []} />
        <CreditsEditor name="creditsJson" initialCredits={initialProject?.credits ?? []} />
        <PortfolioExternalLinkField name="externalLinkJson" initialLink={initialProject?.externalLink} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>SEO</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Page title
            <input type="text" name="seoTitle" defaultValue={initialProject?.seo.title ?? ""} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Meta description
            <textarea name="seoDescription" defaultValue={initialProject?.seo.description ?? ""} rows={2} required />
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
