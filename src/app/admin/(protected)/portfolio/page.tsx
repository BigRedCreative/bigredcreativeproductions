import Link from "next/link";
import { listPortfolioForAdmin } from "@/server/queries/portfolio";
import StatusBadge from "@/components/admin/StatusBadge";
import PortfolioArchiveToggle from "@/components/admin/PortfolioArchiveToggle";
import PortfolioMoveButtons from "@/components/admin/PortfolioMoveButtons";

// Flat, unpaginated — 4 projects today, mirrors AdminServicesPage's exact
// reasoning. Shows every entity regardless of status.
export default async function AdminPortfolioPage() {
  const rows = await listPortfolioForAdmin();

  return (
    <div>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Portfolio</h1>
        <Link href="/admin/portfolio/new" className="admin-signout-button">
          New Project
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="admin-empty-state">No portfolio projects yet. Create the first one to get started.</p>
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
                    <Link href={`/admin/portfolio/${row.id}`} className="admin-table-row-link">
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
                    <PortfolioMoveButtons id={row.id} isFirst={index === 0} isLast={index === rows.length - 1} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/admin/portfolio/${row.id}/edit`} className="admin-secondary-button">
                        Edit
                      </Link>
                      <Link href={`/admin/portfolio/${row.id}/preview`} className="admin-secondary-button">
                        Preview
                      </Link>
                      <PortfolioArchiveToggle id={row.id} status={row.status} />
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
