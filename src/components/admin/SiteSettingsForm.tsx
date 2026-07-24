"use client";

import { useActionState } from "react";
import { updateSiteSettingsAction } from "@/server/mutate-website-content";
import type { SiteSettingsContent } from "@/server/queries/site-content";
import SocialLinksEditor from "./SocialLinksEditor";

type SiteSettingsFormProps = {
  section: "general" | "seo";
  initialSettings: SiteSettingsContent;
};

// One shared form for both the General/Branding and SEO admin pages —
// both edit the same underlying site_settings row, so each page shows
// only its own fields visibly and carries the OTHER section's current
// values forward as hidden inputs. This avoids a partial-update codepath:
// every submission always sends the complete settings shape, exactly like
// ProductForm always submits a complete candidate even though it's shown
// in fieldset sections.
export default function SiteSettingsForm({ section, initialSettings }: SiteSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSiteSettingsAction, null);

  return (
    <form action={formAction} className="admin-form">
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <p>Please fix the following:</p>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state && "success" in state && state.success && (
        <p className="admin-inline-success">Saved.</p>
      )}

      {section === "general" ? (
        <>
          <fieldset className="admin-form-section">
            <legend>
              <h2>Business identity</h2>
            </legend>
            <div className="admin-form-row">
              <label>
                Site name
                <input type="text" name="siteName" defaultValue={initialSettings.siteName} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Legal name
                <input type="text" name="legalName" defaultValue={initialSettings.legalName} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Tagline
                <span className="admin-form-help">Shown in the site footer.</span>
                <input type="text" name="tagline" defaultValue={initialSettings.tagline} required />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>
              <h2>Contact</h2>
            </legend>
            <div className="admin-form-row admin-form-row-split">
              <label>
                Contact email
                <input type="email" name="contactEmail" defaultValue={initialSettings.contactEmail} required />
              </label>
              <label>
                Phone
                <span className="admin-form-optional"> (optional — not shown on the site yet)</span>
                <input type="text" name="contactPhone" defaultValue={initialSettings.contactPhone ?? ""} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Location / service area
                <input type="text" name="location" defaultValue={initialSettings.location} required />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>
              <h2>Logos</h2>
            </legend>
            <p className="admin-form-section-help">
              Local file paths only — place the file under public/brand/ first, then reference it here.
            </p>
            <div className="admin-form-row admin-form-row-split">
              <label>
                Primary logo path
                <input type="text" name="logoHorizontalSrc" defaultValue={initialSettings.logoHorizontalSrc} required />
              </label>
              <label>
                Alternate (light) logo path
                <input type="text" name="logoWhiteSrc" defaultValue={initialSettings.logoWhiteSrc} required />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>
              <h2>Social links</h2>
            </legend>
            <p className="admin-form-section-help">
              Not shown on the site yet — kept ready for when social icons are added.
            </p>
            <SocialLinksEditor initialLinks={initialSettings.socialLinks} />
          </fieldset>

          {/* Carry forward the SEO section's current values unchanged. */}
          <input type="hidden" name="metaTitle" value={initialSettings.metaTitle} />
          <input type="hidden" name="metaDescription" value={initialSettings.metaDescription} />
          <input type="hidden" name="ogDescription" value={initialSettings.ogDescription} />
          <input type="hidden" name="ogImageSrc" value={initialSettings.ogImageSrc ?? ""} />
          <input type="hidden" name="canonicalUrl" value={initialSettings.canonicalUrl} />
        </>
      ) : (
        <>
          <fieldset className="admin-form-section">
            <legend>
              <h2>Search &amp; sharing</h2>
            </legend>
            <div className="admin-form-row">
              <label>
                Default page title
                <input type="text" name="metaTitle" defaultValue={initialSettings.metaTitle} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Default page description
                <textarea name="metaDescription" defaultValue={initialSettings.metaDescription} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Social sharing description
                <span className="admin-form-help">Shown when the site is shared on social platforms.</span>
                <textarea name="ogDescription" defaultValue={initialSettings.ogDescription} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Social sharing image path
                <span className="admin-form-optional"> (optional — reserved, not shown publicly yet)</span>
                <input type="text" name="ogImageSrc" defaultValue={initialSettings.ogImageSrc ?? ""} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Canonical site URL
                <span className="admin-form-help">The site&apos;s primary https:// address.</span>
                <input type="text" name="canonicalUrl" defaultValue={initialSettings.canonicalUrl} required />
              </label>
            </div>
          </fieldset>

          {/* Carry forward the General/Branding section's current values unchanged. */}
          <input type="hidden" name="siteName" value={initialSettings.siteName} />
          <input type="hidden" name="legalName" value={initialSettings.legalName} />
          <input type="hidden" name="tagline" value={initialSettings.tagline} />
          <input type="hidden" name="contactEmail" value={initialSettings.contactEmail} />
          <input type="hidden" name="contactPhone" value={initialSettings.contactPhone ?? ""} />
          <input type="hidden" name="location" value={initialSettings.location} />
          <input type="hidden" name="logoHorizontalSrc" value={initialSettings.logoHorizontalSrc} />
          <input type="hidden" name="logoWhiteSrc" value={initialSettings.logoWhiteSrc} />
          <input type="hidden" name="socialLinksJson" value={JSON.stringify(initialSettings.socialLinks)} />
        </>
      )}

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
