import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";
import { productHref } from "@/data/products";
import { formatPricingSummary } from "@/data/money";
import Badge from "./Badge";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const [firstWord, ...restWords] = product.title.split(" ");
  const primaryMedia = product.media[0];

  return (
    <article className="product-card">
      <Link
        href={productHref(product.slug)}
        className="product-card-link"
        aria-label={`View ${product.title}`}
      />
      <div className="product-card-topline">
        <span className="product-card-category">{product.category}</span>
        {product.featured && <Badge className="project-stamp">Featured</Badge>}
      </div>
      <div className="product-card-media">
        {primaryMedia ? (
          <>
            <Image
              src={primaryMedia.type === "video" ? (primaryMedia.poster ?? primaryMedia.src) : primaryMedia.src}
              alt={primaryMedia.alt}
              fill
              sizes="(max-width: 900px) 100vw, 33vw"
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
      <div className="product-card-info">
        <div>
          <p className="product-card-type">{product.productType === "physical" ? "Product" : "Service"}</p>
          <h3>{product.title}</h3>
        </div>
        <p className="product-card-price">{formatPricingSummary(product.pricing)}</p>
      </div>
    </article>
  );
}
