"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProjectImage } from "@/data/projects";
import type { PickerMediaAsset } from "./ProductMediaEditor";

function emptyImage(): ProjectImage {
  return { src: "", alt: "" };
}

// Repeatable gallery editor — direct mirror of ServiceGalleryEditor.tsx,
// with one addition: a lightBackground checkbox per item, since
// ProjectImage (unlike ServiceImage) supports it and ProjectGallery.tsx
// actually renders it (dark background is the default; toggle only for
// images that read poorly on black, e.g. a dark-outlined logo on
// transparent). No caption field — ProjectImage has none.
export default function PortfolioGalleryEditor({
  name,
  initialImages,
  mediaAssets,
}: {
  name: string;
  initialImages: ProjectImage[];
  mediaAssets: PickerMediaAsset[];
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

  function selectFromLibrary(asset: PickerMediaAsset) {
    if (pickerOpenFor === "new") {
      setImages((prev) => [...prev, { src: asset.url, alt: asset.alt, mediaAssetId: asset.id }]);
    } else if (typeof pickerOpenFor === "number") {
      updateImage(pickerOpenFor, { src: asset.url, mediaAssetId: asset.id, alt: images[pickerOpenFor]?.alt || asset.alt });
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
                  <Image src={asset.url} alt={asset.alt} fill sizes="120px" />
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
      <p className="admin-form-section-help">Optional supporting images shown below the hero image, in this order.</p>

      {images.map((image, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Image {index + 1}</span>
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
          {image.src && image.mediaAssetId && (
            <div className="admin-media-editor-preview">
              <Image src={image.src} alt={image.alt} fill sizes="80px" />
              <span className="admin-form-help">From your Media Library.</span>
            </div>
          )}
          <div className="admin-form-row admin-form-row-split">
            <label>
              Alt text
              <input type="text" value={image.alt} onChange={(e) => updateImage(index, { alt: e.target.value })} />
            </label>
            <label>
              Path
              <span className="admin-form-optional"> (filled in automatically when chosen from the library)</span>
              <input
                type="text"
                value={image.src}
                placeholder="/images/projects/[slug]/gallery-1.jpg"
                onChange={(e) => updateImage(index, { src: e.target.value, mediaAssetId: undefined })}
              />
            </label>
          </div>
          <label className="admin-form-checkbox-row">
            <input
              type="checkbox"
              checked={image.lightBackground ?? false}
              onChange={(e) => updateImage(index, { lightBackground: e.target.checked })}
            />
            Light background — for images that read poorly on the default black gallery background
          </label>
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
