"use client";

import { useMemo, useState } from "react";
import type { Product, ProductCategory } from "@/data/products";
import { storeIntro } from "@/data/store";
import ProductCard from "./ui/ProductCard";

type StoreGridProps = {
  products: Product[];
};

const ALL_FILTER = "All" as const;
type FilterValue = ProductCategory | typeof ALL_FILTER;

export default function StoreGrid({ products }: StoreGridProps) {
  const categories = useMemo(() => {
    const unique: ProductCategory[] = [];
    for (const product of products) {
      if (!unique.includes(product.category)) {
        unique.push(product.category);
      }
    }
    return unique;
  }, [products]);

  const [selected, setSelected] = useState<FilterValue>(ALL_FILTER);

  const filteredProducts =
    selected === ALL_FILTER ? products : products.filter((product) => product.category === selected);

  return (
    <>
      {categories.length > 1 && (
        <div className="portfolio-filters" role="group" aria-label="Filter products by category">
          <button
            type="button"
            className="portfolio-filter"
            aria-pressed={selected === ALL_FILTER}
            onClick={() => setSelected(ALL_FILTER)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="portfolio-filter"
              aria-pressed={selected === category}
              onClick={() => setSelected(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      <div className="product-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <div className="store-empty">
            <p className="store-empty-heading">{storeIntro.emptyStateHeading}</p>
            <p>{storeIntro.emptyStateMessage}</p>
          </div>
        )}
      </div>
    </>
  );
}
