import Image from "next/image";
import type { Media } from "@/data/media";

type ProductMediaProps = {
  media: Media[];
};

export default function ProductMedia({ media }: ProductMediaProps) {
  return (
    <section className="section">
      <span className="kicker">Gallery</span>
      <div className="project-gallery-grid">
        {media.map((item) => (
          <div className="project-gallery-item" key={item.src}>
            <Image
              src={item.type === "video" ? (item.poster ?? item.src) : item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 900px) 100vw, 33vw"
            />
            {item.type === "video" && <span className="media-video-badge">Video</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
