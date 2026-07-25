import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/server/queries/orders";
import { getPublishedProducts } from "@/server/queries/catalog";
import OrderLinesEditForm from "@/components/admin/OrderLinesEditForm";

type EditOrderPageProps = {
  params: Promise<{ id: string }>;
};

// Only reachable/functional for a "draft" order — line items and pricing
// are frozen historical snapshots once an order leaves draft, per the
// approved architecture. updateOrderLinesAction independently re-checks
// this server-side too, so this page-level gate isn't the only thing
// preventing it.
export default async function AdminEditOrderPage({ params }: EditOrderPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  if (order.status !== "draft") {
    return (
      <div>
        <p className="admin-breadcrumb">
          <Link href={`/admin/orders/${id}`}>← {order.orderNumber}</Link>
        </p>
        <h1 className="admin-page-heading">Edit Order</h1>
        <p className="admin-form-section-help">
          This order&apos;s line items and pricing are a frozen historical snapshot — editing is only available while
          an order is a draft. If something needs correcting, cancel this order and create a new one instead.
        </p>
      </div>
    );
  }

  const catalogProducts = await getPublishedProducts();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href={`/admin/orders/${id}`}>← {order.orderNumber}</Link>
      </p>
      <h1 className="admin-page-heading">Edit Order — {order.orderNumber}</h1>
      <OrderLinesEditForm
        orderId={order.id}
        initialLines={order.lines.map((line) => ({
          productId: line.productId ?? null,
          productSlug: line.productSlug ?? null,
          productTitle: line.productTitle,
          description: line.description,
          productType: line.productType,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }))}
        catalogProducts={catalogProducts.map((product) => ({ id: product.id, slug: product.slug, title: product.title }))}
      />
    </div>
  );
}
