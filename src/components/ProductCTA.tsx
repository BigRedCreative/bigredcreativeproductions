import { sectionAnchors } from "@/config/sections";
import type { Product } from "@/data/products";
import Button from "./ui/Button";

type ProductCTAProps = {
  product: Product;
};

export default function ProductCTA({ product }: ProductCTAProps) {
  return (
    <section className="service-cta">
      <h2>Ready to start?</h2>
      <p>Tell us about your project and where you need creative support.</p>
      <Button href={`/#${sectionAnchors.contact}`} className="round-button" ariaLabel={product.ctaLabel}>
        <span>{product.ctaLabel}</span>
        <b>↘</b>
      </Button>
    </section>
  );
}
