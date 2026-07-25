"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import type { PickerMediaAsset } from "./ProductMediaEditor";
import { setMediaAssetPosterAction } from "@/server/mutate-media";

// Single-slot poster picker for a video asset's detail page — mirrors
// LogoPickerField.tsx's exact toggle-panel/grid pattern, but as its own
// standalone form (bound directly to setMediaAssetPosterAction) rather
// than a hidden field inside a larger surrounding form, since a poster
// change is its own independent save action here. `imageAssets` is
// already filtered to ACTIVE images only by the caller
// (getActiveMediaAssetsForPicker(["image"])) — the server action
// re-verifies this fresh regardless, so a stale list can never actually
// set an invalid poster.
export default function MediaPosterField({
  videoId,
  currentPoster,
  imageAssets,
}: {
  videoId: string;
  currentPoster: PickerMediaAsset | null;
  imageAssets: PickerMediaAsset[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(currentPoster?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(setMediaAssetPosterAction.bind(null, videoId), null);

  const selectedAsset = selectedId
    ? (imageAssets.find((asset) => asset.id === selectedId) ?? (selectedId === currentPoster?.id ? currentPoster : undefined))
    : undefined;

  return (
    <form action={formAction}>
      <input type="hidden" name="posterMediaAssetId" value={selectedId ?? ""} />
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state && "success" in state && state.success && <p className="admin-inline-success">Poster saved.</p>}

      {selectedAsset ? (
        <div className="admin-media-editor-preview">
          <Image src={selectedAsset.url} alt={selectedAsset.alt} fill sizes="120px" />
        </div>
      ) : (
        <p className="admin-empty-state">No poster set — the video card shows a generic placeholder instead.</p>
      )}

      <div className="admin-form-row-split">
        <button type="button" className="admin-secondary-button" onClick={() => setPickerOpen((open) => !open)}>
          {pickerOpen ? "Close library" : "Choose poster from Media Library"}
        </button>
        {selectedAsset && (
          <button type="button" className="admin-remove-button" onClick={() => setSelectedId(null)}>
            Clear selection
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="admin-media-picker">
          {imageAssets.length === 0 ? (
            <p className="admin-empty-state">No active images in your library yet. Upload one under Media first.</p>
          ) : (
            <div className="admin-media-picker-grid">
              {imageAssets.map((asset) => (
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

      <div className="admin-form-actions">
        <button type="submit" className="admin-secondary-button" disabled={isPending}>
          {isPending ? "Saving…" : "Save poster"}
        </button>
      </div>
    </form>
  );
}
