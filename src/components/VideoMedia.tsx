type VideoMediaProps = {
  src: string;
  alt: string;
  posterSrc?: string;
  className?: string;
};

// Reusable public video player — the first real consumer of Phase 19A's
// Media Library video foundation. Deliberately has no dependency on any
// admin code (imports nothing from src/components/admin or src/server) —
// a plain presentational component that only ever receives already-
// resolved, already-public data (a Blob CDN URL, an optional poster URL).
//
// Defaults, per Phase 19B approval: controls, playsInline, and
// preload="metadata" are always on; autoplay and muted/loop are never
// forced. `alt` becomes aria-label since <video> has no native alt
// attribute. No layout-shift risk: the caller is responsible for sizing
// via its own wrapping container (ProjectGallery.tsx reuses the exact
// same .project-gallery-item class images already use, so a video
// occupies an identical grid cell shape).
//
// Future per-video presentation controls (autoplay/muted/loop/object-fit/
// etc.) are intentionally NOT implemented here yet — see CLAUDE.md
// "Video Media Foundation" / Phase 19B for why the data model already
// supports adding them later as more optional props with no redesign.
export default function VideoMedia({ src, alt, posterSrc, className }: VideoMediaProps) {
  return (
    <video
      className={className}
      src={src}
      poster={posterSrc}
      controls
      playsInline
      preload="metadata"
      aria-label={alt}
    >
      Your browser doesn&apos;t support video playback.
    </video>
  );
}
