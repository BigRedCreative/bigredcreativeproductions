import type { Product } from "@/data/products";
import { formatMoney } from "@/data/money";

type ProductPackagesProps = {
  product: Product;
  // When provided, packages render as a selectable radio group instead of
  // read-only cards — used by ProductPurchasePanel for cart-eligible
  // products. Omitted entirely for informational-only rendering.
  selectedPackageSlug?: string;
  onSelectPackage?: (packageSlug: string) => void;
};

export default function ProductPackages({ product, selectedPackageSlug, onSelectPackage }: ProductPackagesProps) {
  const interactive = Boolean(onSelectPackage);
  const Wrapper = interactive ? "fieldset" : "div";

  return (
    <section className="process section">
      <span className="kicker">Packages</span>
      <Wrapper className="process-grid product-packages-grid">
        {interactive && <legend className="visually-hidden">Select a package</legend>}
        {product.packages?.map((pkg) => {
          const price =
            pkg.price !== undefined
              ? formatMoney(pkg.price)
              : pkg.startingPrice !== undefined
                ? `Starting at ${formatMoney(pkg.startingPrice)}`
                : "Inquire";

          const content = (
            <>
              <b>Package</b>
              <h3>{pkg.label}</h3>
              <p className="product-package-price">{price}</p>
              <p>{pkg.description}</p>
              {pkg.deliverables && pkg.deliverables.length > 0 && (
                <ul className="product-package-deliverables">
                  {pkg.deliverables.map((deliverable) => (
                    <li key={deliverable}>{deliverable}</li>
                  ))}
                </ul>
              )}
              {pkg.turnaround && <p className="product-package-turnaround">{pkg.turnaround}</p>}
            </>
          );

          if (interactive) {
            return (
              <article
                key={pkg.slug}
                className={selectedPackageSlug === pkg.slug ? "product-package-option--selected" : undefined}
              >
                <label className="product-package-option">
                  <input
                    type="radio"
                    name="package"
                    value={pkg.slug}
                    checked={selectedPackageSlug === pkg.slug}
                    onChange={() => onSelectPackage?.(pkg.slug)}
                  />
                  {content}
                </label>
              </article>
            );
          }

          return <article key={pkg.slug}>{content}</article>;
        })}
      </Wrapper>
    </section>
  );
}
