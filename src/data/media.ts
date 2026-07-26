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

// Phase 19A — plain data, deliberately NOT in
// server/validate-video-upload.ts (which is server-only) since the client
// upload form (VideoUploadForm.tsx) needs these for its file-picker
// `accept` hint and a friendly pre-upload size check. Mirrors exactly how
// LEAD_STATUSES was pulled out of the server-only leads query module in
// Phase 18A for the same reason. The real, authoritative enforcement of
// both values still happens server-side — see
// src/server/validate-video-upload.ts and
// src/app/api/media/video-upload-token/route.ts — this is only ever a
// client-side UX hint, never trusted as the real check.
export const ALLOWED_VIDEO_CONTENT_TYPES = ["video/mp4", "video/webm"] as const;

// 100 MB — see CLAUDE.md "Video Media Library" for the full reasoning
// (a realistic 60-90s promo/event-recap clip at a reasonable bitrate).
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
