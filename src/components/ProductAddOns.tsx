import type { Product } from "@/data/products";
import { formatMoney } from "@/data/money";

type ProductAddOnsProps = {
  product: Product;
};

export default function ProductAddOns({ product }: ProductAddOnsProps) {
  return (
    <section className="section">
      <span className="kicker">Add-ons</span>
      <div className="principles">
        {product.addOns?.map((addOn) => (
          <span key={addOn.slug}>
            {addOn.label}
            {addOn.price !== undefined ? ` — ${formatMoney(addOn.price)}` : ""}
          </span>
        ))}
      </div>
    </section>
  );
}
