"use client";

import { useState } from "react";
import type { Media, MediaType } from "@/data/media";

function emptyMedia(): Media {
  return { type: "image", src: "", alt: "" };
}

// Phase 13 boundary: media REFERENCES only, no upload. `src`/`poster` are
// plain paths to files the admin has already placed under
// public/images/products/[slug]/ — exactly the same manual-placement
// workflow the portfolio/services systems already use, just entered
// through a form instead of hand-edited TypeScript. A real Media Library
// (upload UI) is a later, separate phase.
export default function ProductMediaEditor({ initialMedia, slug }: { initialMedia: Media[]; slug: string }) {
  const [media, setMedia] = useState<Media[]>(initialMedia);

  function updateMedia(index: number, patch: Partial<Media>) {
    setMedia((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addMedia() {
    setMedia((prev) => [...prev, emptyMedia()]);
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input type="hidden" name="mediaJson" value={JSON.stringify(media)} />
      <p className="admin-form-section-help">
        Enter the path to a file already placed under{" "}
        <code>{`public/images/products/${slug || "[slug]"}/`}</code>. There is no upload here yet — place the file
        first, then reference its path. The first item is the primary/hero image. A draft may have no media; a
        published product needs at least one.
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
              <select value={item.type} onChange={(e) => updateMedia(index, { type: e.target.value as MediaType })}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label>
              Alt text
              <input type="text" value={item.alt} onChange={(e) => updateMedia(index, { alt: e.target.value })} />
            </label>
          </div>
          <div className="admin-form-row admin-repeatable-subrow">
            <label>
              Path
              <input
                type="text"
                value={item.src}
                placeholder={`/images/products/${slug || "[slug]"}/hero.jpg`}
                onChange={(e) => updateMedia(index, { src: e.target.value })}
              />
            </label>
          </div>
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
      <button type="button" className="admin-add-button" onClick={addMedia}>
        + Add media
      </button>
    </div>
  );
}
