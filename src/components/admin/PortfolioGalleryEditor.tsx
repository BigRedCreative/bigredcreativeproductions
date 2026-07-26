"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProjectImage } from "@/data/projects";
import type { PickerMediaAsset } from "./ProductMediaEditor";

// Phase 19B — the gallery picker (unlike the hero picker, which stays
// image-only) now receives BOTH image and video assets, so each picker
// item needs to carry its own type. A local intersection type rather
// than widening the shared PickerMediaAsset — only this file's picker
// needs to distinguish image from video.
//
// `posterUrl` (added after a real acceptance-test bug report) is a
// server-resolved convenience field, NOT part of PickerMediaAsset itself
// — a video tile with no visible thumbnail sat in the same grid as its
// own poster image (a separate, fully-thumbnailed tile), and a real user
// clicked the poster's picture-looking tile believing it WAS the video.
// Showing the video's own poster here (mirroring the exact
// poster-thumbnail-plus-badge pattern /admin/media's own grid already
// uses) makes the two tiles visually distinguishable instead of relying
// on the bare "Video" text label alone.
export type PortfolioGalleryPickerAsset = PickerMediaAsset & { type: "image" | "video"; posterUrl?: string };

function emptyImage(): ProjectImage {
  return { src: "", alt: "" };
}

// Repeatable gallery editor — direct mirror of ServiceGalleryEditor.tsx,
// with two additions: a lightBackground checkbox per item (image-only —
// ProjectImage's lightBackground concept has no video equivalent, and
// ProjectGallery.tsx never reads it for a video item), and, as of Phase
// 19B, the ability to select a video from the Media Library. No caption
// field — ProjectImage has none, and this phase doesn't invent one.
export default function PortfolioGalleryEditor({
  name,
  initialImages,
  mediaAssets,
}: {
  name: string;
  initialImages: ProjectImage[];
  mediaAssets: PortfolioGalleryPickerAsset[];
}) {
  const [images, setImages] = useState<ProjectImage[]>(initialImages);
  const [pickerOpenFor, setPickerOpenFor] = useState<number | "new" | null>(null);

  function updateImage(index: number, patch: Partial<ProjectImage>) {
    setImages((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addImage() {
    setImages((prev) => [...prev, emptyImage()]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Selecting a video sets type: "video" explicitly. Selecting an image
  // deliberately does NOT set type: "image" — preserves the exact
  // existing shape a Media-Library-selected image already had before
  // Phase 19B (no `type` field at all), matching "preserve existing
  // image behavior" literally rather than introducing a cosmetic diff.
  function selectFromLibrary(asset: PortfolioGalleryPickerAsset) {
    const patch: Partial<ProjectImage> =
      asset.type === "video"
        ? { src: asset.url, mediaAssetId: asset.id, type: "video" as const }
        : { src: asset.url, mediaAssetId: asset.id, type: undefined };

    if (pickerOpenFor === "new") {
      setImages((prev) => [...prev, { ...emptyImage(), alt: asset.alt, ...patch }]);
    } else if (typeof pickerOpenFor === "number") {
      updateImage(pickerOpenFor, { ...patch, alt: images[pickerOpenFor]?.alt || asset.alt });
    }
    setPickerOpenFor(null);
  }

  function renderPicker() {
    if (pickerOpenFor === null) return null;
    return (
      <div className="admin-media-picker">
        {mediaAssets.length === 0 ? (
          <p className="admin-empty-state">No media in your library yet. Upload one under Media first.</p>
        ) : (
          <div className="admin-media-picker-grid">
            {mediaAssets.map((asset) => (
              <button
                type="button"
                key={asset.id}
                className="admin-media-picker-item"
                onClick={() => selectFromLibrary(asset)}
                title={asset.filename}
              >
                <span className="admin-media-picker-thumb">
                  {asset.type === "video" ? (
                    asset.posterUrl ? (
                      <>
                        <Image src={asset.posterUrl} alt={asset.alt} fill sizes="120px" />
                        <span className="admin-media-card-video-badge">Video</span>
                      </>
                    ) : (
                      <span className="admin-media-card-video-label">Video (no poster set)</span>
                    )
                  ) : (
                    <Image src={asset.url} alt={asset.alt} fill sizes="120px" />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="admin-secondary-button" onClick={() => setPickerOpenFor(null)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="admin-form-row">
      <input type="hidden" name={name} value={JSON.stringify(images.filter((image) => image.src.trim() !== ""))} />
      <p className="admin-form-label-standalone">Gallery</p>
      <p className="admin-form-section-help">
        Optional supporting images or videos shown below the hero image, in this order. Videos must be chosen from
        the Media Library.
      </p>

      {images.map((image, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>
              {image.type === "video" ? "Video" : "Image"} {index + 1}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="admin-secondary-button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="admin-secondary-button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="Move down">
                ↓
              </button>
              <button type="button" className="admin-remove-button" onClick={() => removeImage(index)}>
                Remove
              </button>
            </div>
          </div>
          {image.src && image.mediaAssetId && image.type !== "video" && (
            <div className="admin-media-editor-preview">
              <Image src={image.src} alt={image.alt} fill sizes="80px" />
              <span className="admin-form-help">From your Media Library.</span>
            </div>
          )}
          {image.type === "video" && (
            <p className="admin-form-help">Video from your Media Library — poster (if any) and playback controls appear on the public page.</p>
          )}
          <div className="admin-form-row admin-form-row-split">
            <label>
              Alt text
              <input type="text" value={image.alt} onChange={(e) => updateImage(index, { alt: e.target.value })} />
            </label>
            {image.type !== "video" && (
              <label>
                Path
                <span className="admin-form-optional"> (filled in automatically when chosen from the library)</span>
                <input
                  type="text"
                  value={image.src}
                  placeholder="/images/projects/[slug]/gallery-1.jpg"
                  onChange={(e) => updateImage(index, { src: e.target.value, mediaAssetId: undefined, type: undefined })}
                />
              </label>
            )}
          </div>
          {image.type !== "video" && (
            <label className="admin-form-checkbox-row">
              <input
                type="checkbox"
                checked={image.lightBackground ?? false}
                onChange={(e) => updateImage(index, { lightBackground: e.target.checked })}
              />
              Light background — for images that read poorly on the default black gallery background
            </label>
          )}
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => setPickerOpenFor(pickerOpenFor === index ? null : index)}
          >
            {pickerOpenFor === index ? "Close library" : "Choose from Media Library"}
          </button>
          {pickerOpenFor === index && renderPicker()}
        </div>
      ))}

      <div className="admin-form-row-split">
        <button type="button" className="admin-add-button" onClick={addImage}>
          + Add image (manual path)
        </button>
        <button
          type="button"
          className="admin-add-button"
          onClick={() => setPickerOpenFor(pickerOpenFor === "new" ? null : "new")}
        >
          {pickerOpenFor === "new" ? "Close library" : "+ Add from Media Library"}
        </button>
      </div>
      {pickerOpenFor === "new" && renderPicker()}
    </div>
  );
}
