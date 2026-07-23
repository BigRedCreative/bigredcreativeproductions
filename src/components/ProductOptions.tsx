import type { Product } from "@/data/products";
import { formatMoney } from "@/data/money";

type ProductOptionsProps = {
  product: Product;
};

export default function ProductOptions({ product }: ProductOptionsProps) {
  return (
    <section className="section">
      <span className="kicker">Options</span>
      <div className="product-options">
        {product.options?.map((option) => (
          <div className="product-option" key={option.key}>
            <p className="product-option-label">
              {option.label}
              {option.required && <span className="product-option-required"> (required)</span>}
            </p>
            <div className="tags">
              {option.values.map((value) => (
                <span key={value.value}>
                  {value.label}
                  {value.priceDelta !== undefined && value.priceDelta !== 0
                    ? ` (${value.priceDelta > 0 ? "+" : ""}${formatMoney(value.priceDelta)})`
                    : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
