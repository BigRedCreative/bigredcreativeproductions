"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import type { ProductConfiguration } from "@/data/cart";
import { buildCartItem, isConfigurationValid } from "@/data/cart";
import { formatMoney } from "@/data/money";
import { useCart } from "./CartProvider";
import ProductOptions from "./ProductOptions";
import ProductPackages from "./ProductPackages";
import ProductAddOns from "./ProductAddOns";
import CartQuantityControl from "./CartQuantityControl";

type ProductPurchasePanelProps = {
  product: Product;
};

export default function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const { addItem } = useCart();
  const [selectedPackageSlug, setSelectedPackageSlug] = useState<string | undefined>(undefined);
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({});
  const [selectedAddOnSlugs, setSelectedAddOnSlugs] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const configuration: ProductConfiguration = {
    selectedPackageSlug,
    selectedOptionValues,
    selectedAddOnSlugs,
    quantity,
  };

  const previewItem = useMemo(
    () => buildCartItem(product, configuration),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, selectedPackageSlug, selectedOptionValues, selectedAddOnSlugs, quantity],
  );

  const canAddToCart = isConfigurationValid(product, configuration) && previewItem !== undefined;
  const isEstimate = product.pricing.mode === "starting-price";

  function toggleAddOn(slug: string) {
    setSelectedAddOnSlugs((current) =>
      current.includes(slug) ? current.filter((existing) => existing !== slug) : [...current, slug],
    );
    setConfirmation(null);
  }

  function handleAddToCart() {
    const item = buildCartItem(product, configuration);
    if (!item) return;
    addItem(item);
    setConfirmation(`Added ${product.title} to cart.`);
  }

  return (
    <section className="section product-purchase-panel">
      <span className="kicker">Configure &amp; order</span>

      {product.packages && product.packages.length > 0 && (
        <ProductPackages
          product={product}
          selectedPackageSlug={selectedPackageSlug}
          onSelectPackage={(slug) => {
            setSelectedPackageSlug(slug);
            setConfirmation(null);
          }}
        />
      )}

      {product.options && product.options.length > 0 && (
        <ProductOptions
          product={product}
          selectedValues={selectedOptionValues}
          onSelectValue={(key, value) => {
            setSelectedOptionValues((current) => ({ ...current, [key]: value }));
            setConfirmation(null);
          }}
        />
      )}

      {product.addOns && product.addOns.length > 0 && (
        <ProductAddOns product={product} selectedAddOnSlugs={selectedAddOnSlugs} onToggleAddOn={toggleAddOn} />
      )}

      <div className="product-purchase-footer">
        <div className="product-config-quantity">
          <span>Quantity</span>
          <CartQuantityControl quantity={quantity} onChange={setQuantity} label={product.title} />
        </div>

        <div className="product-config-preview">
          <span>{isEstimate ? "Estimated price" : "Price"}</span>
          <b>{previewItem ? formatMoney(previewItem.unitPrice * quantity) : "—"}</b>
        </div>

        <button type="button" className="round-button" onClick={handleAddToCart} disabled={!canAddToCart}>
          <span>Add to Cart</span>
          <b>↘</b>
        </button>
      </div>

      <p aria-live="polite" className="product-purchase-confirmation">
        {confirmation}
      </p>
    </section>
  );
}
