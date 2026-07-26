"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  buildCreativeBriefAction,
  generateImageAction,
  saveToMediaLibraryAction,
  discardGenerationAction,
} from "@/server/mutate-creative-studio";
import type {
  BuildBriefState,
  GenerateImageState,
  SaveToMediaState,
  DiscardState,
} from "@/server/mutate-creative-studio";
import {
  CREATIVE_TASK_PRESETS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_QUALITIES,
  CREATIVE_CONTEXT_SOURCE_TYPES,
  MAX_REFERENCE_MEDIA_ASSETS,
} from "@/data/creative-studio";

// Phase 20C-1 — the complete owner-facing Creative Studio flow: Idea ->
// Build Creative Brief (GATE 1) -> Review/edit -> Generate Image (GATE 2)
// -> Preview -> Save to Media Library / Discard. This is the ONLY client
// component in Creative Studio, mirroring the "one route, several in-page
// states, managed by a client component" pattern already established by
// CheckoutView.tsx — including CheckoutView's OWN pattern of calling a
// Server Action directly from a plain async event handler and setting
// local state from its awaited result, rather than useActionState +
// useEffect (which reacting-to-external-state-via-setState-in-an-effect
// is exactly what this codebase's lint rules flag as a footgun). Nothing
// on this page calls an AI provider merely by rendering — the page itself
// (page.tsx) makes zero provider calls, and neither does mounting this
// component; only calling handleBuildBrief (a free, provider-call-free
// validation action) or handleGenerateImage ever reaches a Server Action,
// and only the latter can ever reach an image provider.

type PickerAsset = { id: string; url: string; alt: string; filename: string };
type LabeledOption = { id: string; label: string };

type CreativeStudioViewProps = {
  referenceAssets: PickerAsset[];
  portfolioOptions: LabeledOption[];
  serviceOptions: LabeledOption[];
  mediaOptions: PickerAsset[];
};

type FieldsState = {
  taskPreset: string;
  objective: string;
  subject: string;
  brandDirection: string;
  visualStyle: string;
  composition: string;
  textToRender: string;
  requiredElements: string;
  avoidElements: string;
  aspectRatio: string;
  additionalDirection: string;
  quality: string;
  contextSourceType: string;
  contextSourceId: string;
  referenceMediaAssetIds: string[];
};

const INITIAL_FIELDS: FieldsState = {
  taskPreset: CREATIVE_TASK_PRESETS[0],
  objective: "",
  subject: "",
  brandDirection: "",
  visualStyle: "",
  composition: "",
  textToRender: "",
  requiredElements: "",
  avoidElements: "",
  aspectRatio: IMAGE_ASPECT_RATIOS[0],
  additionalDirection: "",
  quality: IMAGE_GENERATION_QUALITIES[0],
  contextSourceType: "",
  contextSourceId: "",
  referenceMediaAssetIds: [],
};

function formatMicrosAsUsd(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`;
}

function buildFormData(fields: FieldsState): FormData {
  const formData = new FormData();
  formData.set("taskPreset", fields.taskPreset);
  formData.set("objective", fields.objective);
  formData.set("subject", fields.subject);
  formData.set("brandDirection", fields.brandDirection);
  formData.set("visualStyle", fields.visualStyle);
  formData.set("composition", fields.composition);
  formData.set("textToRender", fields.textToRender);
  formData.set("requiredElements", fields.requiredElements);
  formData.set("avoidElements", fields.avoidElements);
  formData.set("aspectRatio", fields.aspectRatio);
  formData.set("additionalDirection", fields.additionalDirection);
  formData.set("quality", fields.quality);
  formData.set("contextSourceType", fields.contextSourceType);
  formData.set("contextSourceId", fields.contextSourceId);
  for (const id of fields.referenceMediaAssetIds) {
    formData.append("referenceMediaAssetIds", id);
  }
  return formData;
}

export default function CreativeStudioView({ referenceAssets, portfolioOptions, serviceOptions, mediaOptions }: CreativeStudioViewProps) {
  const [step, setStep] = useState<"idea" | "review" | "preview">("idea");
  const [fields, setFields] = useState<FieldsState>(INITIAL_FIELDS);

  const [buildState, setBuildState] = useState<BuildBriefState>(null);
  const [buildPending, setBuildPending] = useState(false);
  const [generateState, setGenerateState] = useState<GenerateImageState>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [saveState, setSaveState] = useState<SaveToMediaState>(null);
  const [savePending, setSavePending] = useState(false);
  const [discardState, setDiscardState] = useState<DiscardState>(null);
  const [discardPending, setDiscardPending] = useState(false);

  async function handleBuildBrief(e: React.FormEvent) {
    e.preventDefault();
    setBuildPending(true);
    const result = await buildCreativeBriefAction(null, buildFormData(fields));
    setBuildPending(false);
    setBuildState(result);
    if (result && "success" in result) {
      const { brief, quality } = result;
      setFields((prev) => ({
        ...prev,
        taskPreset: brief.taskPreset,
        objective: brief.objective,
        subject: brief.subject,
        brandDirection: brief.brandDirection,
        visualStyle: brief.visualStyle,
        composition: brief.composition,
        textToRender: brief.textToRender ?? "",
        requiredElements: brief.requiredElements.join("\n"),
        avoidElements: brief.avoidElements.join("\n"),
        aspectRatio: brief.aspectRatio,
        additionalDirection: brief.additionalDirection ?? "",
        quality,
        referenceMediaAssetIds: brief.referenceMediaAssetIds,
      }));
      setStep("review");
    }
  }

  async function handleGenerateImage(e: React.FormEvent) {
    e.preventDefault();
    setGeneratePending(true);
    const result = await generateImageAction(null, buildFormData(fields));
    setGeneratePending(false);
    setGenerateState(result);
    if (result && "success" in result) {
      setSaveState(null);
      setDiscardState(null);
      setStep("preview");
    }
  }

  async function handleSave() {
    if (!generateState || !("success" in generateState)) return;
    setSavePending(true);
    const result = await saveToMediaLibraryAction(generateState.jobId, null, new FormData());
    setSavePending(false);
    setSaveState(result);
  }

  async function handleDiscard() {
    if (!generateState || !("success" in generateState)) return;
    setDiscardPending(true);
    const result = await discardGenerationAction(generateState.jobId, null, new FormData());
    setDiscardPending(false);
    setDiscardState(result);
  }

  function toggleReferenceAsset(id: string) {
    setFields((prev) => {
      const already = prev.referenceMediaAssetIds.includes(id);
      if (already) {
        return { ...prev, referenceMediaAssetIds: prev.referenceMediaAssetIds.filter((existing) => existing !== id) };
      }
      if (prev.referenceMediaAssetIds.length >= MAX_REFERENCE_MEDIA_ASSETS) return prev;
      return { ...prev, referenceMediaAssetIds: [...prev.referenceMediaAssetIds, id] };
    });
  }

  function startOver() {
    setFields(INITIAL_FIELDS);
    setBuildState(null);
    setGenerateState(null);
    setSaveState(null);
    setDiscardState(null);
    setStep("idea");
  }

  const contextOptions =
    fields.contextSourceType === "portfolio"
      ? portfolioOptions
      : fields.contextSourceType === "service"
        ? serviceOptions
        : fields.contextSourceType === "media_asset"
          ? mediaOptions.map((a) => ({ id: a.id, label: a.filename }))
          : [];

  return (
    <div>
      <h1 className="admin-page-heading">Big Red Creative Studio</h1>
      <p className="admin-form-section-help">
        Structure an idea, review the brief, then explicitly generate an image. Nothing is sent to an AI image
        provider until you click &quot;Generate Image&quot; on the reviewed brief — building a brief never calls an
        image provider.
      </p>

      {step === "idea" && (
        <form onSubmit={handleBuildBrief} className="admin-form">
          <div className="admin-form-section">
            <h2>1. Choose what to create</h2>
            <div className="admin-form-row">
              <label>
                Task type
                <select value={fields.taskPreset} onChange={(e) => setFields((p) => ({ ...p, taskPreset: e.target.value }))}>
                  {CREATIVE_TASK_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="admin-form-section">
            <h2>2. Source context (optional)</h2>
            <p className="admin-form-section-help">
              Pulls a small, safe summary from an existing, real business record — never customer/order/lead data.
            </p>
            <div className="admin-form-row">
              <label>
                Context source
                <select
                  value={fields.contextSourceType}
                  onChange={(e) => setFields((p) => ({ ...p, contextSourceType: e.target.value, contextSourceId: "" }))}
                >
                  <option value="">None</option>
                  {CREATIVE_CONTEXT_SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === "media_asset" ? "Media asset" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {fields.contextSourceType && fields.contextSourceType !== "brand" && (
              <div className="admin-form-row">
                <label>
                  Item
                  <select value={fields.contextSourceId} onChange={(e) => setFields((p) => ({ ...p, contextSourceId: e.target.value }))}>
                    <option value="">Choose one…</option>
                    {contextOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="admin-form-section">
            <h2>3. Reference images (optional, up to {MAX_REFERENCE_MEDIA_ASSETS})</h2>
            {referenceAssets.length === 0 ? (
              <p className="admin-empty-state">No active images in your Media Library yet.</p>
            ) : (
              <div className="admin-media-picker-grid">
                {referenceAssets.map((asset) => {
                  const selected = fields.referenceMediaAssetIds.includes(asset.id);
                  return (
                    <button
                      type="button"
                      key={asset.id}
                      className={selected ? "admin-media-picker-item admin-media-picker-item-selected" : "admin-media-picker-item"}
                      onClick={() => toggleReferenceAsset(asset.id)}
                      title={asset.filename}
                    >
                      <span className="admin-media-picker-thumb">
                        <Image src={asset.url} alt={asset.alt} fill sizes="120px" />
                      </span>
                      {selected && <span aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-form-section">
            <h2>4. Creative direction</h2>
            <div className="admin-form-row">
              <label>
                Objective
                <input type="text" value={fields.objective} onChange={(e) => setFields((p) => ({ ...p, objective: e.target.value }))} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Subject
                <textarea rows={2} value={fields.subject} onChange={(e) => setFields((p) => ({ ...p, subject: e.target.value }))} required />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Brand direction
                <input type="text" value={fields.brandDirection} onChange={(e) => setFields((p) => ({ ...p, brandDirection: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Visual style
                <input type="text" value={fields.visualStyle} onChange={(e) => setFields((p) => ({ ...p, visualStyle: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Composition
                <input type="text" value={fields.composition} onChange={(e) => setFields((p) => ({ ...p, composition: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Required elements (one per line)
                <textarea rows={3} value={fields.requiredElements} onChange={(e) => setFields((p) => ({ ...p, requiredElements: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Avoid (one per line)
                <textarea rows={3} value={fields.avoidElements} onChange={(e) => setFields((p) => ({ ...p, avoidElements: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Additional direction
                <textarea rows={2} value={fields.additionalDirection} onChange={(e) => setFields((p) => ({ ...p, additionalDirection: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Text to render (optional — rendered EXACTLY as typed; leave blank for no text)
                <input type="text" value={fields.textToRender} onChange={(e) => setFields((p) => ({ ...p, textToRender: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className="admin-form-section">
            <h2>5. Aspect ratio &amp; quality</h2>
            <div className="admin-form-row">
              <label>
                Aspect ratio
                <select value={fields.aspectRatio} onChange={(e) => setFields((p) => ({ ...p, aspectRatio: e.target.value }))}>
                  {IMAGE_ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Quality
                <select value={fields.quality} onChange={(e) => setFields((p) => ({ ...p, quality: e.target.value }))}>
                  {IMAGE_GENERATION_QUALITIES.map((quality) => (
                    <option key={quality} value={quality}>
                      {quality}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {buildState && "errors" in buildState && buildState.errors.length > 0 && (
            <div className="admin-form-errors" role="alert" aria-live="assertive">
              <ul>
                {buildState.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="admin-form-actions">
            <button type="submit" className="admin-signout-button" disabled={buildPending}>
              {buildPending ? "Building…" : "Build Creative Brief"}
            </button>
          </div>
        </form>
      )}

      {step === "review" && buildState && "success" in buildState && (
        <div>
          <div className="admin-detail-block">
            <h2>Reviewed brief</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Task</span>
              <span>{fields.taskPreset.replace(/_/g, " ")}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Objective</span>
              <span>{fields.objective}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Subject</span>
              <span>{fields.subject}</span>
            </div>
            {fields.textToRender && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Text to render</span>
                <span>&quot;{fields.textToRender}&quot;</span>
              </div>
            )}
            <div className="admin-detail-row">
              <span className="admin-detail-label">Aspect ratio / quality</span>
              <span>
                {fields.aspectRatio} / {fields.quality}
              </span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Estimated cost</span>
              <span>{formatMicrosAsUsd(buildState.estimatedCostMicros)}</span>
            </div>
            <p className="admin-form-section-help">
              You can still edit anything above — go back to make changes, or generate the image as reviewed.
            </p>
          </div>

          <form onSubmit={handleGenerateImage} className="admin-form">
            {generateState && "errors" in generateState && generateState.errors.length > 0 && (
              <div className="admin-form-errors" role="alert" aria-live="assertive">
                <ul>
                  {generateState.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="admin-form-actions">
              <button type="button" className="admin-secondary-button" onClick={() => setStep("idea")}>
                Back
              </button>
              <button type="submit" className="admin-signout-button" disabled={generatePending}>
                {generatePending ? "Generating…" : "Generate Image"}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "preview" && generateState && "success" in generateState && (
        <div className="admin-detail-block">
          <h2>Generated preview</h2>
          <div className="admin-media-preview">
            <Image src={generateState.previewUrl} alt="Generated preview" fill sizes="480px" />
          </div>
          <p className="admin-form-section-help">Estimated cost: {formatMicrosAsUsd(generateState.estimatedCostMicros)}</p>

          {saveState && "errors" in saveState && saveState.errors.length > 0 && (
            <div className="admin-form-errors" role="alert" aria-live="assertive">
              <ul>
                {saveState.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {saveState && "success" in saveState && (
            <p className="admin-inline-success">
              Saved to your Media Library — <Link href={`/admin/media/${saveState.mediaAssetId}`}>view asset</Link>.
            </p>
          )}
          {discardState && "success" in discardState && <p className="admin-inline-success">Discarded — this generation is no longer part of the active workflow.</p>}

          {!((saveState && "success" in saveState) || (discardState && "success" in discardState)) && (
            <div className="admin-form-actions">
              <button type="button" className="admin-secondary-button" onClick={() => setStep("review")}>
                Generate Another Variation
              </button>
              <button type="button" className="admin-remove-button" onClick={handleDiscard} disabled={discardPending}>
                {discardPending ? "Discarding…" : "Discard"}
              </button>
              <button type="button" className="admin-signout-button" onClick={handleSave} disabled={savePending}>
                {savePending ? "Saving…" : "Save to Media Library"}
              </button>
            </div>
          )}

          {((saveState && "success" in saveState) || (discardState && "success" in discardState)) && (
            <div className="admin-form-actions">
              <button type="button" className="admin-secondary-button" onClick={startOver}>
                Start a new creation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
