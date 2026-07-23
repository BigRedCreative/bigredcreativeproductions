import type { Product } from "@/data/products";
import { formatMoney } from "@/data/money";

type ProductAddOnsProps = {
  product: Product;
  // When provided, add-ons render as accessible checkboxes instead of a
  // read-only list — used by ProductPurchasePanel for cart-eligible
  // products. Omitted entirely for informational-only rendering.
  selectedAddOnSlugs?: string[];
  onToggleAddOn?: (addOnSlug: string) => void;
};

export default function ProductAddOns({ product, selectedAddOnSlugs, onToggleAddOn }: ProductAddOnsProps) {
  const interactive = Boolean(onToggleAddOn);

  return (
    <section className="section">
      <span className="kicker">Add-ons</span>
      <div className="principles">
        {product.addOns?.map((addOn) => {
          const priceLabel =
            addOn.price !== undefined
              ? ` — ${formatMoney(addOn.price)}${addOn.chargeType === "per-unit" ? " each" : ""}`
              : "";

          if (interactive) {
            return (
              <label className="principles-checkbox" key={addOn.slug}>
                <input
                  type="checkbox"
                  checked={selectedAddOnSlugs?.includes(addOn.slug) ?? false}
                  onChange={() => onToggleAddOn?.(addOn.slug)}
                />
                <span>
                  {addOn.label}
                  {priceLabel}
                </span>
              </label>
            );
          }

          return (
            <span key={addOn.slug}>
              {addOn.label}
              {priceLabel}
            </span>
          );
        })}
      </div>
    </section>
  );
}
