import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/server/queries/customers";
import { formatMoney } from "@/data/money";
import StatusBadge from "@/components/admin/StatusBadge";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/customers">← Customers</Link>
      </p>
      <h1 className="admin-page-heading">
        {customer.firstName} {customer.lastName}
      </h1>

      <div className="admin-detail-grid">
        <div className="admin-detail-block">
          <h2>Order history</h2>
          {customer.orders.length === 0 ? (
            <p className="admin-empty-state">No orders yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Subtotal</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className="admin-table-row-link">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>{formatMoney(order.subtotal)}</td>
                      <td>{order.createdAt.toLocaleDateString("en-US")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-detail-block">
          <h2>Customer</h2>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Email</span>
            <span>{customer.email}</span>
          </div>
          {customer.phone && (
            <div className="admin-detail-row">
              <span className="admin-detail-label">Phone</span>
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.company && (
            <div className="admin-detail-row">
              <span className="admin-detail-label">Company</span>
              <span>{customer.company}</span>
            </div>
          )}
          <div className="admin-detail-row">
            <span className="admin-detail-label">Customer since</span>
            <span>{customer.createdAt.toLocaleDateString("en-US")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
