import Image from "next/image";
import type { ServiceImage } from "@/data/services";
import VideoMedia from "./VideoMedia";

type ServiceGalleryProps = {
  images: ServiceImage[];
};

// Phase 19C — the previously-missing public renderer for Service.gallery
// (a real, admin-editable field that had no public rendering path at
// all before this). Direct structural port of ProjectGallery.tsx,
// reusing the exact same .project-gallery-grid/.project-gallery-item CSS
// rather than duplicating near-identical service-specific classes —
// matching the "reuse the proven Portfolio architecture wherever
// possible" instruction. ServiceImage has no lightBackground concept, so
// unlike ProjectGallery there's no light/dark class branch here.
export default function ServiceGallery({ images }: ServiceGalleryProps) {
  return (
    <section className="section">
      <span className="kicker">Gallery</span>
      <div className="project-gallery-grid">
        {images.map((image) => (
          <div className="project-gallery-item" key={image.src}>
            {image.type === "video" ? (
              <VideoMedia src={image.src} alt={image.alt} posterSrc={image.posterSrc} />
            ) : (
              <Image src={image.src} alt={image.alt} fill sizes="(max-width: 900px) 100vw, 33vw" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
