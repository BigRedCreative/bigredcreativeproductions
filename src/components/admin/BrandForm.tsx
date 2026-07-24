"use client";

import { useActionState, useMemo, useState } from "react";
import { saveBrandDraftAction } from "@/server/mutate-brand";
import { contrastRatio, WCAG_AA_MINIMUM_CONTRAST } from "@/data/contrast";
import ColorField from "./ColorField";
import LogoPickerField from "./LogoPickerField";
import type { PickerMediaAsset } from "./ProductMediaEditor";

type BrandFormValues = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  buttonBackground: string;
  buttonText: string;
  buttonHoverBackground: string;
};

type BrandFormProps = {
  initialValues: BrandFormValues;
  initialLogoHorizontalMediaAssetId: string | null;
  initialLogoWhiteMediaAssetId: string | null;
  mediaAssets: PickerMediaAsset[];
  fallbackLogoHorizontalSrc: string;
  fallbackLogoWhiteSrc: string;
};

function ContrastWarning({ label, ratio }: { label: string; ratio: number | null }) {
  if (ratio === null || ratio >= WCAG_AA_MINIMUM_CONTRAST) return null;
  return (
    <p className="admin-contrast-warning">
      Low contrast: {label} is {ratio.toFixed(1)}:1 — WCAG AA recommends at least {WCAG_AA_MINIMUM_CONTRAST}:1. This
      won&apos;t stop you from saving or publishing.
    </p>
  );
}

export default function BrandForm({
  initialValues,
  initialLogoHorizontalMediaAssetId,
  initialLogoWhiteMediaAssetId,
  mediaAssets,
  fallbackLogoHorizontalSrc,
  fallbackLogoWhiteSrc,
}: BrandFormProps) {
  const [state, formAction, isPending] = useActionState(saveBrandDraftAction, null);
  const [values, setValues] = useState<BrandFormValues>(initialValues);

  function setField<K extends keyof BrandFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const textContrast = useMemo(
    () => contrastRatio(values.textColor, values.backgroundColor),
    [values.textColor, values.backgroundColor],
  );
  const mutedContrast = useMemo(
    () => contrastRatio(values.mutedTextColor, values.backgroundColor),
    [values.mutedTextColor, values.backgroundColor],
  );
  const buttonContrast = useMemo(
    () => contrastRatio(values.buttonText, values.buttonBackground),
    [values.buttonText, values.buttonBackground],
  );

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
          <h2>Colors</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <ColorField
            name="primaryColor"
            label="Primary brand color"
            value={values.primaryColor}
            onChange={(v) => setField("primaryColor", v)}
          />
          <ColorField
            name="accentColor"
            label="Accent color"
            value={values.accentColor}
            onChange={(v) => setField("accentColor", v)}
          />
        </div>
        <div className="admin-form-row admin-form-row-split">
          <ColorField
            name="backgroundColor"
            label="Background color"
            value={values.backgroundColor}
            onChange={(v) => setField("backgroundColor", v)}
          />
          <ColorField
            name="surfaceColor"
            label="Surface color"
            value={values.surfaceColor}
            onChange={(v) => setField("surfaceColor", v)}
          />
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Text</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <ColorField
            name="textColor"
            label="Text color"
            value={values.textColor}
            onChange={(v) => setField("textColor", v)}
          />
          <ColorField
            name="mutedTextColor"
            label="Muted text color"
            value={values.mutedTextColor}
            onChange={(v) => setField("mutedTextColor", v)}
          />
        </div>
        <ContrastWarning label="text on background" ratio={textContrast} />
        <ContrastWarning label="muted text on background" ratio={mutedContrast} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Borders</h2>
        </legend>
        <p className="admin-form-section-help">
          Also used by shadows and a few dark section backgrounds (footer, ticker, header button) that share this
          same color today.
        </p>
        <div className="admin-form-row">
          <ColorField
            name="borderColor"
            label="Border color"
            value={values.borderColor}
            onChange={(v) => setField("borderColor", v)}
          />
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Buttons</h2>
        </legend>
        <p className="admin-form-section-help">
          Applies to the site&apos;s primary action buttons (contact form, cart checkout, order submit). The round
          homepage button and header button keep their own distinct look.
        </p>
        <div className="admin-form-row admin-form-row-split">
          <ColorField
            name="buttonBackground"
            label="Button background"
            value={values.buttonBackground}
            onChange={(v) => setField("buttonBackground", v)}
          />
          <ColorField
            name="buttonText"
            label="Button text"
            value={values.buttonText}
            onChange={(v) => setField("buttonText", v)}
          />
        </div>
        <div className="admin-form-row">
          <ColorField
            name="buttonHoverBackground"
            label="Button hover background"
            value={values.buttonHoverBackground}
            onChange={(v) => setField("buttonHoverBackground", v)}
          />
        </div>
        <ContrastWarning label="button text on button background" ratio={buttonContrast} />
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Logos</h2>
        </legend>
        <p className="admin-form-section-help">
          Optional — choose from your Media Library, or leave unset to keep using the current logo files.
        </p>
        <LogoPickerField
          name="logoHorizontalMediaAssetId"
          label="Horizontal logo"
          mediaAssets={mediaAssets}
          initialMediaAssetId={initialLogoHorizontalMediaAssetId}
          fallbackSrc={fallbackLogoHorizontalSrc}
          fallbackLabel="Current horizontal logo"
        />
        <LogoPickerField
          name="logoWhiteMediaAssetId"
          label="Light / white logo"
          mediaAssets={mediaAssets}
          initialMediaAssetId={initialLogoWhiteMediaAssetId}
          fallbackSrc={fallbackLogoWhiteSrc}
          fallbackLabel="Current light logo"
        />
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </form>
  );
}
