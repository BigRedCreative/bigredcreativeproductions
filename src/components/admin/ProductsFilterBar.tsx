import { PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@/data/products";

// Same native GET <form> pattern as OrdersFilterBar/CustomersFilterBar —
// no client JS, submitting navigates to
// /admin/products?status=&category=&q=, which is exactly the URL the
// page already reads from.
export default function ProductsFilterBar({
  status,
  category,
  search,
}: {
  status?: string;
  category?: string;
  search?: string;
}) {
  return (
    <form className="admin-filter-bar" method="GET">
      <input
        type="search"
        name="q"
        placeholder="Search title, slug…"
        defaultValue={search ?? ""}
        className="admin-filter-input"
        aria-label="Search products"
      />
      <select name="status" defaultValue={status ?? ""} className="admin-filter-select" aria-label="Filter by status">
        <option value="">All statuses</option>
        {PRODUCT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <select
        name="category"
        defaultValue={category ?? ""}
        className="admin-filter-select"
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {PRODUCT_CATEGORIES.map((value) => (
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
