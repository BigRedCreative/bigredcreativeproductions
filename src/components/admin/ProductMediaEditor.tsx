"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Media, MediaType } from "@/data/media";

export type PickerMediaAsset = {
  id: string;
  url: string;
  alt: string;
  filename: string;
  width: number | null;
  height: number | null;
};

function emptyMedia(): Media {
  return { type: "image", src: "", alt: "" };
}

// Phase 13 gave this a plain manual-path text input; Phase 15 adds
// "Choose from Media Library" alongside it — both stay available, since
// existing manually-typed entries (including this product's own real
// hero.png) must keep working exactly as before. Selecting from the
// library sets BOTH `src` (frozen at selection time, so this entry is
// never blank even before the catalog read layer's live resolution runs)
// and `mediaAssetId` (what makes that live resolution possible later —
// see src/server/queries/catalog.ts).
export default function ProductMediaEditor({
  initialMedia,
  slug,
  mediaAssets,
}: {
  initialMedia: Media[];
  slug: string;
  mediaAssets: PickerMediaAsset[];
}) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [pickerOpenFor, setPickerOpenFor] = useState<number | "new" | null>(null);

  function updateMedia(index: number, patch: Partial<Media>) {
    setMedia((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addMedia() {
    setMedia((prev) => [...prev, emptyMedia()]);
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function selectFromLibrary(asset: PickerMediaAsset) {
    if (pickerOpenFor === "new") {
      setMedia((prev) => [
        ...prev,
        { type: "image", src: asset.url, alt: asset.alt, mediaAssetId: asset.id },
      ]);
    } else if (typeof pickerOpenFor === "number") {
      updateMedia(pickerOpenFor, {
        src: asset.url,
        mediaAssetId: asset.id,
        alt: media[pickerOpenFor]?.alt || asset.alt,
      });
    }
    setPickerOpenFor(null);
  }

  function renderPicker() {
    if (pickerOpenFor === null) return null;
    return (
      <div className="admin-media-picker">
        {mediaAssets.length === 0 ? (
          <p className="admin-empty-state">
            No media in your library yet. <Link href="/admin/media">Upload one</Link> first.
          </p>
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
    <div>
      <input type="hidden" name="mediaJson" value={JSON.stringify(media)} />
      <p className="admin-form-section-help">
        Choose an image from your Media Library, or enter the path to a file already placed under{" "}
        <code>{`public/images/products/${slug || "[slug]"}/`}</code>. The first item is the primary/hero image. A
        draft may have no media; a published product needs at least one.
      </p>
      {media.map((item, index) => (
        <div className="admin-repeatable-item" key={index}>
          <div className="admin-repeatable-item-header">
            <span>Media {index + 1}</span>
            <button type="button" className="admin-remove-button" onClick={() => removeMedia(index)}>
              Remove
            </button>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Type
              <select
                value={item.type}
                onChange={(e) => updateMedia(index, { type: e.target.value as MediaType })}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label>
              Alt text
              <input type="text" value={item.alt} onChange={(e) => updateMedia(index, { alt: e.target.value })} />
            </label>
          </div>
          {item.src && item.mediaAssetId && (
            <div className="admin-media-editor-preview">
              <Image src={item.src} alt={item.alt} fill sizes="80px" />
              <span className="admin-form-help">From your Media Library.</span>
            </div>
          )}
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Path
              <span className="admin-form-optional"> (filled in automatically when chosen from the library)</span>
              <input
                type="text"
                value={item.src}
                placeholder={`/images/products/${slug || "[slug]"}/hero.jpg`}
                onChange={(e) => updateMedia(index, { src: e.target.value, mediaAssetId: undefined })}
              />
            </label>
          </div>
          <button
            type="button"
            className="admin-secondary-button admin-repeatable-subrow"
            onClick={() => setPickerOpenFor(pickerOpenFor === index ? null : index)}
          >
            {pickerOpenFor === index ? "Close library" : "Choose from Media Library"}
          </button>
          {pickerOpenFor === index && renderPicker()}
          {item.type === "video" && (
            <div className="admin-form-row admin-repeatable-subrow">
              <label>
                Poster path
                <span className="admin-form-optional"> (required for video — no player exists yet, only the poster image renders)</span>
                <input
                  type="text"
                  value={item.poster ?? ""}
                  placeholder={`/images/products/${slug || "[slug]"}/poster.jpg`}
                  onChange={(e) => updateMedia(index, { poster: e.target.value || undefined })}
                />
              </label>
            </div>
          )}
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Caption
              <span className="admin-form-optional"> (optional, distinct from alt text)</span>
              <input
                type="text"
                value={item.caption ?? ""}
                onChange={(e) => updateMedia(index, { caption: e.target.value || undefined })}
              />
            </label>
          </div>
        </div>
      ))}
      <div className="admin-form-row-split">
        <button type="button" className="admin-add-button" onClick={addMedia}>
          + Add media (manual path)
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
