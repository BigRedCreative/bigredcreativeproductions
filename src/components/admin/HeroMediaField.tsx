"use client";

import { useState } from "react";
import Image from "next/image";
import type { PickerMediaAsset } from "./ProductMediaEditor";

// Phase 19D-2 — the video-only picker's asset shape. No `type` field is
// needed (unlike PortfolioGalleryPickerAsset/ServiceGalleryPickerAsset)
// since this whole picker is already video-only — the mixed image+video
// picker pattern from Portfolio/Services doesn't apply here, since Hero's
// Image and Video pickers are deliberately separate, single-type lists.
export type HeroVideoPickerAsset = PickerMediaAsset & { posterUrl?: string };

type HeroMediaMode = "none" | "image" | "video";

type HeroMediaFieldProps = {
  initialMediaAssetId: string | null;
  // Resolved server-side (the real asset's type) — tells the form which
  // mode to start in when a Media Library asset is already selected.
  // Never trusted as the security boundary (the server independently
  // re-verifies the real type on every save) — purely a UI starting
  // point.
  initialMediaType: "image" | "video" | null;
  initialImageSrc: string | null;
  initialImageAlt: string | null;
  imageAssets: PickerMediaAsset[];
  videoAssets: HeroVideoPickerAsset[];
};

function deriveInitialMode(mediaAssetId: string | null, mediaType: "image" | "video" | null, imageSrc: string | null): HeroMediaMode {
  if (mediaAssetId && mediaType) return mediaType;
  if (imageSrc) return "image";
  return "none";
}

// Renders three plain hidden fields (heroMediaAssetId/heroImageSrc/
// heroImageAlt) — not a JSON blob, matching every other flat field on
// this form (badgePrimary, eyebrow, etc.) rather than the JSON-array
// pattern Portfolio/Service repeatable editors use. The SERVER is the
// real authority on mutual exclusivity (normalizeHeroMediaFields() in
// mutate-website-content.ts) — this component keeps its own local state
// honest on every mode/selection change as the first line of defense,
// not the only one.
export default function HeroMediaField({
  initialMediaAssetId,
  initialMediaType,
  initialImageSrc,
  initialImageAlt,
  imageAssets,
  videoAssets,
}: HeroMediaFieldProps) {
  const [mode, setMode] = useState<HeroMediaMode>(() => deriveInitialMode(initialMediaAssetId, initialMediaType, initialImageSrc));
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(initialMediaAssetId);
  const [imageSrc, setImageSrc] = useState(initialImageSrc ?? "");
  const [imageAlt, setImageAlt] = useState(initialImageAlt ?? "");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);

  const selectedImageAsset = mode === "image" && mediaAssetId ? imageAssets.find((a) => a.id === mediaAssetId) : undefined;
  const selectedVideoAsset = mode === "video" && mediaAssetId ? videoAssets.find((a) => a.id === mediaAssetId) : undefined;

  // Switching modes always clears the OTHER mode's stale state — the
  // client-side half of "switching modes must never leave hidden stale
  // state that unexpectedly becomes active when another field is later
  // cleared." The server enforces this too regardless (defense in depth,
  // not reliance).
  function handleModeChange(next: HeroMediaMode) {
    setMode(next);
    setMediaAssetId(null);
    setImageSrc("");
    if (next === "none") setImageAlt("");
  }

  function selectImage(asset: PickerMediaAsset) {
    setMediaAssetId(asset.id);
    setImageSrc("");
    if (!imageAlt) setImageAlt(asset.alt);
    setImagePickerOpen(false);
  }

  function selectVideo(asset: HeroVideoPickerAsset) {
    setMediaAssetId(asset.id);
    setImageSrc("");
    if (!imageAlt) setImageAlt(asset.alt);
    setVideoPickerOpen(false);
  }

  return (
    <div className="admin-form-row">
      <input type="hidden" name="heroMediaAssetId" value={mode === "none" ? "" : (mediaAssetId ?? "")} />
      <input type="hidden" name="heroImageSrc" value={mode === "image" && !mediaAssetId ? imageSrc : ""} />
      <input type="hidden" name="heroImageAlt" value={mode === "none" ? "" : imageAlt} />

      <p className="admin-form-label-standalone">Hero Media</p>
      <p className="admin-form-section-help">
        Optional image or video shown alongside the hero typography — the headline stays the visual priority. Leave
        as &quot;None&quot; to keep today&apos;s typography-only hero.
      </p>
      <label>
        Hero Media
        <select value={mode} onChange={(e) => handleModeChange(e.target.value as HeroMediaMode)}>
          <option value="none">None</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
      </label>

      {mode === "none" && <p className="admin-empty-state">No hero media — the hero stays typography-only.</p>}

      {mode === "image" && (
        <div className="admin-repeatable-item">
          {mediaAssetId && selectedImageAsset && (
            <div className="admin-media-editor-preview">
              <Image src={selectedImageAsset.url} alt={imageAlt} fill sizes="80px" />
              <span className="admin-form-help">From your Media Library.</span>
            </div>
          )}
          <div className="admin-form-row admin-form-row-split">
            <label>
              Alt text
              <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
            </label>
            {!mediaAssetId && (
              <label>
                Path (manual fallback)
                <span className="admin-form-optional"> — filled in automatically when chosen from the library</span>
                <input
                  type="text"
                  value={imageSrc}
                  onChange={(e) => setImageSrc(e.target.value)}
                  placeholder="/images/hero/hero.jpg"
                />
              </label>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="admin-secondary-button" onClick={() => setImagePickerOpen((v) => !v)}>
              {imagePickerOpen ? "Close library" : mediaAssetId ? "Choose a different image" : "Choose from Media Library"}
            </button>
            {mediaAssetId && (
              <button type="button" className="admin-remove-button" onClick={() => setMediaAssetId(null)}>
                Use manual path instead
              </button>
            )}
          </div>
          {imagePickerOpen && (
            <div className="admin-media-picker">
              {imageAssets.length === 0 ? (
                <p className="admin-empty-state">No images in your library yet. Upload one under Media first.</p>
              ) : (
                <div className="admin-media-picker-grid">
                  {imageAssets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      className="admin-media-picker-item"
                      onClick={() => selectImage(asset)}
                      title={asset.filename}
                    >
                      <span className="admin-media-picker-thumb">
                        <Image src={asset.url} alt={asset.alt} fill sizes="120px" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="admin-secondary-button" onClick={() => setImagePickerOpen(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "video" && (
        <div className="admin-repeatable-item">
          <p className="admin-form-help">
            {mediaAssetId && selectedVideoAsset ? `Video selected: ${selectedVideoAsset.filename}` : "No video selected yet."}
          </p>
          <div className="admin-form-row">
            <label>
              Accessibility label
              <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
            </label>
          </div>
          <button type="button" className="admin-secondary-button" onClick={() => setVideoPickerOpen((v) => !v)}>
            {videoPickerOpen ? "Close library" : "Choose from Media Library"}
          </button>
          {videoPickerOpen && (
            <div className="admin-media-picker">
              {videoAssets.length === 0 ? (
                <p className="admin-empty-state">No videos in your library yet. Upload one under Media first.</p>
              ) : (
                <div className="admin-media-picker-grid">
                  {videoAssets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      className="admin-media-picker-item"
                      onClick={() => selectVideo(asset)}
                      title={asset.filename}
                    >
                      <span className="admin-media-picker-thumb">
                        {asset.posterUrl ? (
                          <>
                            <Image src={asset.posterUrl} alt={asset.alt} fill sizes="120px" />
                            <span className="admin-media-card-video-badge">Video</span>
                          </>
                        ) : (
                          <span className="admin-media-card-video-label">Video (no poster set)</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="admin-secondary-button" onClick={() => setVideoPickerOpen(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
