import { MEDIA_ASSET_STATUSES, MEDIA_ASSET_TYPES } from "@/db/schema";

// Same native GET <form> pattern as ProductsFilterBar/OrdersFilterBar — no
// client JS, submitting navigates to /admin/media?status=&type=&q=, which
// is exactly the URL the page already reads from.
export default function MediaFilterBar({
  status,
  type,
  search,
}: {
  status?: string;
  type?: string;
  search?: string;
}) {
  return (
    <form className="admin-filter-bar" method="GET">
      <input
        type="search"
        name="q"
        placeholder="Search filename, alt text…"
        defaultValue={search ?? ""}
        className="admin-filter-input"
        aria-label="Search media"
      />
      <select name="status" defaultValue={status ?? ""} className="admin-filter-select" aria-label="Filter by status">
        <option value="">All statuses</option>
        {MEDIA_ASSET_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <select name="type" defaultValue={type ?? ""} className="admin-filter-select" aria-label="Filter by type">
        <option value="">All types</option>
        {MEDIA_ASSET_TYPES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <button type="submit" className="admin-signout-button">
        Filter
      </button>
    </form>
  );
}
