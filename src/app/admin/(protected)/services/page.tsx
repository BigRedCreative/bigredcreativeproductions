import Link from "next/link";
import { listServicesForAdmin } from "@/server/queries/services";
import StatusBadge from "@/components/admin/StatusBadge";
import ServiceArchiveToggle from "@/components/admin/ServiceArchiveToggle";
import ServiceMoveButtons from "@/components/admin/ServiceMoveButtons";

// Flat, unpaginated — 7 services today, no filter/search UI needed at
// this scale (matches the same reasoning already used for the Media
// Library picker's flat recent-first list). Shows every entity regardless
// of status (published/draft-only/archived) since the admin needs
// visibility into all of them, not just what's currently public.
export default async function AdminServicesPage() {
  const rows = await listServicesForAdmin();

  return (
    <div>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Services</h1>
        <Link href="/admin/services/new" className="admin-signout-button">
          New Service
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="admin-empty-state">No services yet. Create the first one to get started.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Published slug</th>
                <th>Draft slug</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Updated</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/services/${row.id}`} className="admin-table-row-link">
                      {row.draft?.title ?? row.published?.title ?? "(untitled)"}
                    </Link>
                  </td>
                  <td>{row.published ? row.published.slug : "—"}</td>
                  <td>{row.draft ? row.draft.slug : "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{(row.published ?? row.draft)?.featured ? "Yes" : "—"}</td>
                  <td>{row.updatedAt.toLocaleDateString("en-US")}</td>
                  <td>
                    <ServiceMoveButtons id={row.id} isFirst={index === 0} isLast={index === rows.length - 1} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/admin/services/${row.id}/edit`} className="admin-secondary-button">
                        Edit
                      </Link>
                      <Link href={`/admin/services/${row.id}/preview`} className="admin-secondary-button">
                        Preview
                      </Link>
                      <ServiceArchiveToggle id={row.id} status={row.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
