import type { Product } from "@/data/products";
import { formatPricingSummary, getPurchaseModeLabel } from "@/data/money";

type ProductPricingProps = {
  product: Product;
};

export default function ProductPricing({ product }: ProductPricingProps) {
  const { pricing } = product;

  return (
    <section className="section">
      <span className="kicker">Pricing</span>
      <div className="project-results-grid">
        <div className="project-result">
          <b>{formatPricingSummary(pricing)}</b>
          <span>{getPurchaseModeLabel(pricing.mode)}</span>
        </div>
      </div>
      {pricing.pricingNote && <p className="product-pricing-note">{pricing.pricingNote}</p>}
    </section>
  );
}
