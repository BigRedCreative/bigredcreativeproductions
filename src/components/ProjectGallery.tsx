import Image from "next/image";
import type { ProjectImage } from "@/data/projects";

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
            className={`project-gallery-item${image.lightBackground ? " project-gallery-item--light" : ""}`}
            key={image.src}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 900px) 100vw, 33vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
