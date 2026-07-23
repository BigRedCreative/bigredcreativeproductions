import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/server/queries/orders";
import { formatMoney } from "@/data/money";
import StatusBadge from "@/components/admin/StatusBadge";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

// Renders exclusively from the frozen order/order_line snapshots returned
// by getOrderById() — no live Product lookup anywhere on this page, per
// the approved architecture. Status is displayed, not editable (Phase 12
// is read-only — see CLAUDE.md).
export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/orders">← Orders</Link>
      </p>
      <h1 className="admin-page-heading">
        {order.orderNumber} <StatusBadge status={order.status} />
      </h1>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Line items</h2>
            {order.lines.map((line) => (
              <div className="admin-line-item" key={line.id}>
                <p className="admin-line-item-title">
                  {line.productTitle} × {line.quantity}
                </p>
                <p className="admin-line-item-meta">
                  {line.productType} · {line.purchaseMode.replace("-", " ")}
                </p>
                {line.selectedPackage && (
                  <p className="admin-line-item-meta">Package: {line.selectedPackage.label}</p>
                )}
                {line.selectedOptions.length > 0 && (
                  <p className="admin-line-item-meta">
                    {line.selectedOptions.map((option) => `${option.optionLabel}: ${option.valueLabel}`).join(", ")}
                  </p>
                )}
                {line.selectedAddOns.length > 0 && (
                  <p className="admin-line-item-meta">
                    Add-ons: {line.selectedAddOns.map((addOn) => addOn.label).join(", ")}
                  </p>
                )}
                <p className="admin-line-item-meta">
                  Unit price: {formatMoney(line.unitPrice)} · Line subtotal: {formatMoney(line.lineSubtotal)}
                  {line.depositAmount != null && <> · Deposit: {formatMoney(line.depositAmount)}</>}
                </p>
                {line.intakeRequired != null && (
                  <p className="admin-line-item-meta">
                    Intake: {line.intakeStatus ?? "not-started"}
                    {line.intakeFormSlug ? ` (${line.intakeFormSlug})` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="admin-detail-block">
              <h2>Notes</h2>
              <p>{order.notes}</p>
            </div>
          )}
        </div>

        <div>
          <div className="admin-detail-block">
            <h2>Order</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Order ID</span>
              <span>{order.id}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Created</span>
              <span>{order.createdAt.toLocaleString("en-US")}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Updated</span>
              <span>{order.updatedAt.toLocaleString("en-US")}</span>
            </div>
          </div>

          <div className="admin-detail-block">
            <h2>Pricing summary</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">
                {order.pricingSummary.hasEstimatedPricing ? "Estimated subtotal" : "Subtotal"}
              </span>
              <span>{formatMoney(order.pricingSummary.subtotal)}</span>
            </div>
            {order.pricingSummary.depositDue > 0 && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Deposit due</span>
                <span>{formatMoney(order.pricingSummary.depositDue)}</span>
              </div>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Customer</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Name</span>
              <span>
                <Link href={`/admin/customers/${order.customer.id}`}>
                  {order.customer.firstName} {order.customer.lastName}
                </Link>
              </span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Email</span>
              <span>{order.customer.email}</span>
            </div>
            {order.customer.phone && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Phone</span>
                <span>{order.customer.phone}</span>
              </div>
            )}
            {order.customer.company && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Company</span>
                <span>{order.customer.company}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
