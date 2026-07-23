import Link from "next/link";
import { listOrders } from "@/server/queries/orders";
import { formatMoney } from "@/data/money";
import OrdersFilterBar from "@/components/admin/OrdersFilterBar";
import AdminPagination from "@/components/admin/AdminPagination";
import StatusBadge from "@/components/admin/StatusBadge";

type OrdersPageProps = {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { page: pageParam, status, q } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const { rows, totalCount, pageCount } = await listOrders({ page, status, search: q });

  return (
    <div>
      <h1 className="admin-page-heading">Orders</h1>
      <OrdersFilterBar status={status} search={q} />

      {rows.length === 0 ? (
        <p className="admin-empty-state">
          {totalCount === 0 && !status && !q
            ? "No orders yet."
            : "No orders match this search/filter."}
        </p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Subtotal</th>
                  <th>Deposit</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/orders/${row.id}`} className="admin-table-row-link">
                        {row.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {row.customerName}
                      <br />
                      {row.customerEmail}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      {formatMoney(row.subtotal)}
                      {row.hasEstimatedPricing && <div className="admin-estimate-flag">Estimated</div>}
                    </td>
                    <td>{row.depositDue > 0 ? formatMoney(row.depositDue) : "—"}</td>
                    <td>{row.createdAt.toLocaleDateString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} pageCount={pageCount} baseHref="/admin/orders" baseParams={{ status, q }} />
        </>
      )}
    </div>
  );
}
