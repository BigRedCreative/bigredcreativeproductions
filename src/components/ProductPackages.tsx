import type { Product } from "@/data/products";
import { formatMoney } from "@/data/money";

type ProductPackagesProps = {
  product: Product;
};

export default function ProductPackages({ product }: ProductPackagesProps) {
  return (
    <section className="process section">
      <span className="kicker">Packages</span>
      <div className="process-grid product-packages-grid">
        {product.packages?.map((pkg) => {
          const price =
            pkg.price !== undefined
              ? formatMoney(pkg.price)
              : pkg.startingPrice !== undefined
                ? `Starting at ${formatMoney(pkg.startingPrice)}`
                : "Inquire";

          return (
            <article key={pkg.slug}>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
