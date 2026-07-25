import Link from "next/link";
import { listLeadsForAdmin } from "@/server/queries/leads";
import LeadsFilterBar from "@/components/admin/LeadsFilterBar";
import AdminPagination from "@/components/admin/AdminPagination";
import StatusBadge from "@/components/admin/StatusBadge";

type LeadsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; archived?: string; q?: string }>;
};

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  const { page: pageParam, status, archived, q } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const { rows, totalCount, pageCount } = await listLeadsForAdmin({ page, status, archived: archived as "only" | "exclude" | undefined, search: q });

  return (
    <div>
      <h1 className="admin-page-heading">Leads</h1>
      <LeadsFilterBar status={status} archived={archived} search={q} />

      {rows.length === 0 ? (
        <p className="admin-empty-state">
          {totalCount === 0 && !status && !archived && !q ? "No leads yet." : "No leads match this search/filter."}
        </p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Requested service</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Archived</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/leads/${row.id}`} className="admin-table-row-link">
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.email}</td>
                    <td>{row.requestedService ?? "—"}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{row.createdAt.toLocaleDateString("en-US")}</td>
                    <td>{row.archivedAt ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} pageCount={pageCount} baseHref="/admin/leads" baseParams={{ status, archived, q }} />
        </>
      )}
    </div>
  );
}
