"use client";

import { useState } from "react";
import Image from "next/image";
import type { PickerMediaAsset } from "./ProductMediaEditor";

// A single-slot "Choose Logo -> Media Library -> Select" picker — same
// toggle-panel/grid pattern ProductMediaEditor.tsx already established for
// product media, sized down to one selection instead of a repeatable
// array. Selecting a thumbnail sets the mediaAssetId; nothing here ever
// requires typing a path. Clearing returns to the existing site_settings
// path fallback (shown as a small on-brand reference image below the
// picker, read-only).
export default function LogoPickerField({
  name,
  label,
  mediaAssets,
  initialMediaAssetId,
  fallbackSrc,
  fallbackLabel,
}: {
  name: string;
  label: string;
  mediaAssets: PickerMediaAsset[];
  initialMediaAssetId: string | null;
  fallbackSrc: string;
  fallbackLabel: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialMediaAssetId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedAsset = selectedId ? mediaAssets.find((asset) => asset.id === selectedId) : undefined;

  return (
    <div className="admin-form-row">
      <input type="hidden" name={name} value={selectedId ?? ""} />
      <p className="admin-form-label-standalone">{label}</p>

      {selectedAsset ? (
        <div className="admin-media-editor-preview">
          <Image src={selectedAsset.url} alt={selectedAsset.alt} fill sizes="80px" />
          <span className="admin-form-help">From your Media Library.</span>
        </div>
      ) : (
        <div className="admin-media-editor-preview">
          <Image src={fallbackSrc} alt={fallbackLabel} fill sizes="80px" unoptimized />
          <span className="admin-form-help">{fallbackLabel} (current fallback — no Media Library selection yet)</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button type="button" className="admin-secondary-button" onClick={() => setPickerOpen((open) => !open)}>
          {pickerOpen ? "Close library" : "Choose from Media Library"}
        </button>
        {selectedAsset && (
          <button type="button" className="admin-remove-button" onClick={() => setSelectedId(null)}>
            Use fallback instead
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="admin-media-picker">
          {mediaAssets.length === 0 ? (
            <p className="admin-empty-state">
              No media in your library yet. Upload one under Media first.
            </p>
          ) : (
            <div className="admin-media-picker-grid">
              {mediaAssets.map((asset) => (
                <button
                  type="button"
                  key={asset.id}
                  className="admin-media-picker-item"
                  onClick={() => {
                    setSelectedId(asset.id);
                    setPickerOpen(false);
                  }}
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
