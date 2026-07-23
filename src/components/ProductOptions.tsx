import type { Product } from "@/data/products";
import { formatMoney } from "@/data/money";

type ProductOptionsProps = {
  product: Product;
  // When provided, options render as interactive radio controls instead of
  // read-only chips — used by ProductPurchasePanel for cart-eligible
  // products. Omitted entirely for informational-only rendering.
  selectedValues?: Record<string, string>;
  onSelectValue?: (optionKey: string, value: string) => void;
};

export default function ProductOptions({ product, selectedValues, onSelectValue }: ProductOptionsProps) {
  const interactive = Boolean(onSelectValue);

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
            {interactive ? (
              <fieldset className="product-config-fieldset">
                <legend className="visually-hidden">{option.label}</legend>
                {option.values.map((value) => (
                  <label key={value.value} className="product-config-radio">
                    <input
                      type="radio"
                      name={`option-${option.key}`}
                      value={value.value}
                      checked={selectedValues?.[option.key] === value.value}
                      onChange={() => onSelectValue?.(option.key, value.value)}
                    />
                    <span>
                      {value.label}
                      {value.priceDelta ? ` (${value.priceDelta > 0 ? "+" : ""}${formatMoney(value.priceDelta)})` : ""}
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
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
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
