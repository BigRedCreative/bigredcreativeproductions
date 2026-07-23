import Link from "next/link";
import type { Product } from "@/data/products";
import { getServiceBySlug, serviceHref } from "@/data/services";

type ProductDetailsProps = {
  product: Product;
};

export default function ProductDetails({ product }: ProductDetailsProps) {
  const relatedService = product.relatedServiceSlug ? getServiceBySlug(product.relatedServiceSlug) : undefined;

  return (
    <section className="studio section">
      <div className="studio-copy">
        <h2>Product overview</h2>
        <p>{product.fullDescription}</p>
      </div>
      <dl className="project-meta">
        <div>
          <dt>Category</dt>
          <dd>{product.category}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{product.productType === "physical" ? "Physical product" : "Service offering"}</dd>
        </div>
        {relatedService && (
          <div>
            <dt>Related service</dt>
            <dd>
              <Link href={serviceHref(relatedService.slug)}>{relatedService.title}</Link>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
