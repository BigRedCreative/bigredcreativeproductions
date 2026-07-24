import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/server/queries/catalog";
import { formatMoney, formatPricingSummary } from "@/data/money";
import StatusBadge from "@/components/admin/StatusBadge";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/products">← Products</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">
          {product.title} <StatusBadge status={product.status} />
        </h1>
        <div className="admin-form-actions">
          <Link href={`/admin/products/${id}/preview`} className="admin-secondary-button">
            Preview
          </Link>
          <Link href={`/admin/products/${id}/edit`} className="admin-signout-button">
            Edit
          </Link>
        </div>
      </div>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Overview</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Summary</span>
              <span>{product.summary}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Full description</span>
              <span>{product.fullDescription}</span>
            </div>
          </div>

          {(product.options?.length ?? 0) > 0 && (
            <div className="admin-detail-block">
              <h2>Options</h2>
              {product.options!.map((option) => (
                <div className="admin-line-item" key={option.key}>
                  <p className="admin-line-item-title">
                    {option.label} {option.required && <span className="admin-estimate-flag">Required</span>}
                  </p>
                  <p className="admin-line-item-meta">
                    {option.values.map((value) => `${value.label}${value.priceDelta ? ` (${formatMoney(value.priceDelta)})` : ""}`).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {(product.packages?.length ?? 0) > 0 && (
            <div className="admin-detail-block">
              <h2>Packages</h2>
              {product.packages!.map((pkg) => (
                <div className="admin-line-item" key={pkg.slug}>
                  <p className="admin-line-item-title">{pkg.label}</p>
                  <p className="admin-line-item-meta">
                    {pkg.price !== undefined ? formatMoney(pkg.price) : pkg.startingPrice !== undefined ? `From ${formatMoney(pkg.startingPrice)}` : "No price set"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {(product.addOns?.length ?? 0) > 0 && (
            <div className="admin-detail-block">
              <h2>Add-ons</h2>
              {product.addOns!.map((addOn) => (
                <div className="admin-line-item" key={addOn.slug}>
                  <p className="admin-line-item-title">{addOn.label}</p>
                  <p className="admin-line-item-meta">
                    {addOn.price !== undefined ? formatMoney(addOn.price) : "No price set"} · {addOn.chargeType}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="admin-detail-block">
            <h2>Media ({product.media.length})</h2>
            {product.media.length === 0 ? (
              <p className="admin-empty-state">No media yet.</p>
            ) : (
              product.media.map((item, i) => (
                <div className="admin-line-item" key={i}>
                  <p className="admin-line-item-title">{item.type}</p>
                  <p className="admin-line-item-meta">{item.src}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="admin-detail-block">
            <h2>Identity</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">ID</span>
              <span>{product.id}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Slug</span>
              <span>{product.slug}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Category</span>
              <span>{product.category}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Type</span>
              <span>{product.productType === "physical" ? "Physical product" : "Service"}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Featured</span>
              <span>{product.featured ? "Yes" : "No"}</span>
            </div>
          </div>

          <div className="admin-detail-block">
            <h2>Pricing</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Mode</span>
              <span>{product.pricing.mode}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Summary</span>
              <span>{formatPricingSummary(product.pricing)}</span>
            </div>
          </div>

          <div className="admin-detail-block">
            <h2>Store presentation</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">CTA label</span>
              <span>{product.ctaLabel}</span>
            </div>
            {product.relatedServiceSlug && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Related service</span>
                <span>{product.relatedServiceSlug}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
