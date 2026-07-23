import Image from "next/image";
import type { Product } from "@/data/products";
import { formatPricingSummary } from "@/data/money";

type ProductHeroProps = {
  product: Product;
};

export default function ProductHero({ product }: ProductHeroProps) {
  const [firstWord, ...restWords] = product.title.split(" ");
  const primaryMedia = product.media[0];

  return (
    <section className="project-hero">
      <div>
        <span className="kicker">{product.category}</span>
        <h1>{product.title}</h1>
        <p className="project-hero-summary">{product.summary}</p>
        <p className="product-hero-price">{formatPricingSummary(product.pricing)}</p>
      </div>
      <div className="project-hero-media project-dark">
        {primaryMedia ? (
          <>
            <Image
              src={primaryMedia.type === "video" ? (primaryMedia.poster ?? primaryMedia.src) : primaryMedia.src}
              alt={primaryMedia.alt}
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            {primaryMedia.type === "video" && <span className="media-video-badge">Video</span>}
          </>
        ) : (
          <div className="project-art">
            <span>{firstWord}</span>
            <b>{restWords.join(" ")}</b>
          </div>
        )}
      </div>
    </section>
  );
}
