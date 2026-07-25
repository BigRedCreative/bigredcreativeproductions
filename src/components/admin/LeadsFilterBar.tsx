import { LEAD_STATUSES } from "@/data/leads";

// Mirrors OrdersFilterBar.tsx's exact native-GET-form pattern — no client
// JS, submitting navigates to /admin/leads?status=&archived=&q=, which is
// exactly the bookmarkable URL the list page already reads from.
export default function LeadsFilterBar({
  status,
  archived,
  search,
}: {
  status?: string;
  archived?: string;
  search?: string;
}) {
  return (
    <form className="admin-filter-bar" method="GET">
      <input
        type="search"
        name="q"
        placeholder="Search name, email, company…"
        defaultValue={search ?? ""}
        className="admin-filter-input"
        aria-label="Search leads"
      />
      <select name="status" defaultValue={status ?? ""} className="admin-filter-select" aria-label="Filter by status">
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <select
        name="archived"
        defaultValue={archived ?? ""}
        className="admin-filter-select"
        aria-label="Filter by archived state"
      >
        <option value="">All leads</option>
        <option value="exclude">Not archived</option>
        <option value="only">Archived only</option>
      </select>
      <button type="submit" className="admin-signout-button">
        Filter
      </button>
    </form>
  );
}
