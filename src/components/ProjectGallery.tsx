import Image from "next/image";
import type { ProjectImage } from "@/data/projects";
import VideoMedia from "./VideoMedia";

type ProjectGalleryProps = {
  images: ProjectImage[];
};

export default function ProjectGallery({ images }: ProjectGalleryProps) {
  return (
    <section className="section">
      <span className="kicker">Gallery</span>
      <div className="project-gallery-grid">
        {images.map((image) => (
          <div
            // lightBackground is an image-only presentation concept — a
            // video item never reads it (its container background stays
            // the default letterboxing black, matching VideoMedia's own
            // .project-gallery-item video CSS).
            className={`project-gallery-item${image.type !== "video" && image.lightBackground ? " project-gallery-item--light" : ""}`}
            key={image.src}
          >
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
