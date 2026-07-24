// Reusable media model shared by the future catalog (products, packages,
// add-ons). Deliberately separate from ProjectImage/ServiceImage — those
// stay exactly as they are on their existing, content-approved systems.
// This type is the one new catalog code should use going forward.

export const MEDIA_TYPES = ["image", "video"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export type Media = {
  type: MediaType;
  src: string;
  // Required for every media item, image or video — describes what it shows.
  alt: string;
  // Required for video (enforced by validateProducts) — no player exists
  // yet, so a video with no poster has nothing to render anywhere.
  poster?: string;
  // Optional user-facing caption, distinct from `alt` (which is for
  // accessibility, not display).
  caption?: string;
  // Phase 15 — optional link to a Media Library asset (media_assets.id).
  // When present, src/server/queries/catalog.ts re-resolves `src` from the
  // live media_assets row before this reaches a page, so replacing that
  // asset's underlying file later updates every product referencing it
  // with no per-product edit. `src` is still always populated (frozen at
  // the moment the asset was chosen) so this type never breaks for a
  // legacy entry that has no mediaAssetId at all — both shapes coexist
  // indefinitely, see CLAUDE.md "Media Library".
  mediaAssetId?: string;
};
