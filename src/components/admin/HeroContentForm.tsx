"use client";

import { useActionState } from "react";
import { saveHeroDraftAction } from "@/server/mutate-website-content";

type HeroContentFormValue = {
  badgePrimary: string;
  badgeSecondary: string;
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  tagline: string;
  supportingCopy: string;
  ctaLabel: string;
  ctaHref: string;
};

// Edits the DRAFT row only — saving here never touches the public site.
// Publishing (a separate action, see PublishHeroButton) is what copies
// this content to the live homepage.
export default function HeroContentForm({ initialDraft }: { initialDraft: HeroContentFormValue }) {
  const [state, formAction, isPending] = useActionState(saveHeroDraftAction, null);

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
      {state && "success" in state && state.success && <p className="admin-inline-success">Draft saved.</p>}

      <fieldset className="admin-form-section">
        <legend>
          <h2>Badges</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Badge 1
            <input type="text" name="badgePrimary" defaultValue={initialDraft.badgePrimary} required />
          </label>
          <label>
            Badge 2
            <input type="text" name="badgeSecondary" defaultValue={initialDraft.badgeSecondary} required />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Headline</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Eyebrow
            <input type="text" name="eyebrow" defaultValue={initialDraft.eyebrow} required />
          </label>
        </div>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Headline
            <input type="text" name="headlineLead" defaultValue={initialDraft.headlineLead} required />
          </label>
          <label>
            Headline (highlighted part)
            <input type="text" name="headlineAccent" defaultValue={initialDraft.headlineAccent} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Tagline
            <input type="text" name="tagline" defaultValue={initialDraft.tagline} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Supporting text
            <textarea name="supportingCopy" defaultValue={initialDraft.supportingCopy} required />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Button</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Button text
            <input type="text" name="ctaLabel" defaultValue={initialDraft.ctaLabel} required />
          </label>
          <label>
            Button link
            <input type="text" name="ctaHref" defaultValue={initialDraft.ctaHref} required />
          </label>
        </div>
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
