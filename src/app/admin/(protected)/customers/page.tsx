import Link from "next/link";
import { listCustomers } from "@/server/queries/customers";
import CustomersFilterBar from "@/components/admin/CustomersFilterBar";
import AdminPagination from "@/components/admin/AdminPagination";

type CustomersPageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: CustomersPageProps) {
  const { page: pageParam, q } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const { rows, totalCount, pageCount } = await listCustomers({ page, search: q });

  return (
    <div>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Customers</h1>
        <Link href="/admin/customers/new" className="admin-secondary-button">
          New Customer
        </Link>
      </div>
      <CustomersFilterBar search={q} />

      {rows.length === 0 ? (
        <p className="admin-empty-state">
          {totalCount === 0 && !q ? "No customers yet." : "No customers match this search."}
        </p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Last order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/customers/${row.id}`} className="admin-table-row-link">
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.email}</td>
                    <td>{row.company ?? "—"}</td>
                    <td>{row.phone ?? "—"}</td>
                    <td>{row.orderCount}</td>
                    {/* Phase 21A hotfix: row.lastOrderAt is a raw SQL aggregate
                        string (see CustomerListRow's own comment), never a
                        Date — must be parsed before formatting. */}
                    <td>{row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString("en-US") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} pageCount={pageCount} baseHref="/admin/customers" baseParams={{ q }} />
        </>
      )}
    </div>
  );
}
