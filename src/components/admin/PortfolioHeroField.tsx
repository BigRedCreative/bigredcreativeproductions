"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProjectImage } from "@/data/projects";
import type { PickerMediaAsset } from "./ProductMediaEditor";

// Single-slot hero image editor — direct mirror of ServiceHeroField.tsx,
// for ProjectImage's shape instead of ServiceImage's. lightBackground is
// intentionally NOT exposed here — it's a gallery-only presentation
// field (ProjectGallery.tsx is the only component that reads it;
// ProjectHero.tsx does not).
export default function PortfolioHeroField({
  name,
  initialImage,
  mediaAssets,
}: {
  name: string;
  initialImage: ProjectImage | undefined;
  mediaAssets: PickerMediaAsset[];
}) {
  const [image, setImage] = useState<ProjectImage>(initialImage ?? { src: "", alt: "" });
  const [pickerOpen, setPickerOpen] = useState(false);

  function selectFromLibrary(asset: PickerMediaAsset) {
    setImage({ src: asset.url, alt: image.alt || asset.alt, mediaAssetId: asset.id });
    setPickerOpen(false);
  }

  function clear() {
    setImage({ src: "", alt: "" });
  }

  return (
    <div className="admin-form-row">
      <input type="hidden" name={name} value={JSON.stringify(image)} />
      <p className="admin-form-label-standalone">Hero image</p>
      <p className="admin-form-section-help">
        Shown at the top of the project page. Leave blank to use the site&apos;s typographic fallback treatment.
      </p>

      {image.src && image.mediaAssetId && (
        <div className="admin-media-editor-preview">
          <Image src={image.src} alt={image.alt} fill sizes="80px" />
          <span className="admin-form-help">From your Media Library.</span>
        </div>
      )}

      <div className="admin-form-row admin-form-row-split">
        <label>
          Alt text
          <input type="text" value={image.alt} onChange={(e) => setImage({ ...image, alt: e.target.value })} />
        </label>
        <label>
          Path
          <span className="admin-form-optional"> (filled in automatically when chosen from the library)</span>
          <input
            type="text"
            value={image.src}
            placeholder="/images/projects/[slug]/hero.jpg"
            onChange={(e) => setImage({ src: e.target.value, alt: image.alt, mediaAssetId: undefined })}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="admin-secondary-button" onClick={() => setPickerOpen((open) => !open)}>
          {pickerOpen ? "Close library" : "Choose from Media Library"}
        </button>
        {image.src && (
          <button type="button" className="admin-remove-button" onClick={clear}>
            Remove hero image
          </button>
        )}
      </div>

      {pickerOpen && (
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
          <button type="button" className="admin-secondary-button" onClick={() => setPickerOpen(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
