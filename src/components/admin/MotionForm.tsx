"use client";

import { useActionState, useState } from "react";
import { saveMotionDraftAction } from "@/server/mutate-motion";
import { MOTION_INTENSITIES, MOTION_PRESETS, HERO_ENTRANCE_OPTIONS } from "@/data/motion";
import type { MotionSettings, MotionIntensity, MotionPreset, HeroEntrance } from "@/data/motion";

// Admin-facing labels live here, not in src/data/motion.ts — same
// established precedent as PortfolioForm.tsx's local CLASS_NAME_OPTIONS:
// the shared data module owns the enum VALUES, the admin form owns how
// they're DISPLAYED.
const INTENSITY_LABELS: Record<MotionIntensity, string> = {
  subtle: "Subtle",
  standard: "Standard",
  bold: "Bold",
};

const HERO_ENTRANCE_LABELS: Record<HeroEntrance, string> = {
  none: "None",
  cinematic_reveal: "Cinematic Reveal",
};

const PRESET_LABELS: Record<MotionPreset, string> = {
  none: "None",
  fade: "Fade",
  fade_up: "Fade Up",
  fade_down: "Fade Down",
  slide_left: "Slide Left",
  slide_right: "Slide Right",
  scale_in: "Scale In",
  reveal: "Reveal",
};

type MotionFormProps = {
  initialValues: MotionSettings;
};

// Every <select> here is controlled (value + onChange), per the standing
// Phase 13 rule — never defaultValue-only. No raw CSS/duration/easing/
// transform is ever a field in this form; every control is a closed
// enum <select> or a plain boolean checkbox.
export default function MotionForm({ initialValues }: MotionFormProps) {
  const [state, formAction, isPending] = useActionState(saveMotionDraftAction, null);
  const [values, setValues] = useState<MotionSettings>(initialValues);

  function setField<K extends keyof MotionSettings>(key: K, value: MotionSettings[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

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
          <h2>Global</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Motion intensity
            <select name="intensity" value={values.intensity} onChange={(e) => setField("intensity", e.target.value as MotionIntensity)}>
              {MOTION_INTENSITIES.map((option) => (
                <option key={option} value={option}>
                  {INTENSITY_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Homepage Hero</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Entrance
            <select name="heroEntrance" value={values.heroEntrance} onChange={(e) => setField("heroEntrance", e.target.value as HeroEntrance)}>
              {HERO_ENTRANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {HERO_ENTRANCE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Services</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Preset
            <select name="servicesPreset" value={values.servicesPreset} onChange={(e) => setField("servicesPreset", e.target.value as MotionPreset)}>
              {MOTION_PRESETS.map((option) => (
                <option key={option} value={option}>
                  {PRESET_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="admin-form-checkbox-row">
          <input
            type="checkbox"
            name="servicesStagger"
            checked={values.servicesStagger}
            onChange={(e) => setField("servicesStagger", e.target.checked)}
          />
          Stagger rows
        </label>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Statement</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Reveal
            <select name="statementPreset" value={values.statementPreset} onChange={(e) => setField("statementPreset", e.target.value as MotionPreset)}>
              {MOTION_PRESETS.map((option) => (
                <option key={option} value={option}>
                  {PRESET_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Portfolio</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Cards
            <select name="portfolioPreset" value={values.portfolioPreset} onChange={(e) => setField("portfolioPreset", e.target.value as MotionPreset)}>
              {MOTION_PRESETS.map((option) => (
                <option key={option} value={option}>
                  {PRESET_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="admin-form-checkbox-row">
          <input
            type="checkbox"
            name="portfolioStagger"
            checked={values.portfolioStagger}
            onChange={(e) => setField("portfolioStagger", e.target.checked)}
          />
          Stagger cards
        </label>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Studio</h2>
        </legend>
        <div className="admin-form-row">
          <label>
            Reveal
            <select name="studioPreset" value={values.studioPreset} onChange={(e) => setField("studioPreset", e.target.value as MotionPreset)}>
              {MOTION_PRESETS.map((option) => (
                <option key={option} value={option}>
                  {PRESET_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-form-section">
        <legend>
          <h2>Process</h2>
        </legend>
        <div className="admin-form-row admin-form-row-split">
          <label>
            Steps
            <select name="processPreset" value={values.processPreset} onChange={(e) => setField("processPreset", e.target.value as MotionPreset)}>
              {MOTION_PRESETS.map((option) => (
                <option key={option} value={option}>
                  {PRESET_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="admin-form-checkbox-row">
          <input
            type="checkbox"
            name="processStagger"
            checked={values.processStagger}
            onChange={(e) => setField("processStagger", e.target.checked)}
          />
          Stagger steps
        </label>
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="admin-signout-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </form>
  );
}
