import { ORDER_STATUSES } from "@/data/orders";

// A plain native GET <form> — submitting it navigates to
// /admin/orders?status=&q=, which is exactly the bookmarkable URL the
// page already reads from. No client JS, no router.push(), matching the
// same "native form, no client JS" pattern already used by
// CheckoutCustomerForm. Deliberately omits a `page` field so every filter
// change resets to page 1.
export default function OrdersFilterBar({ status, search }: { status?: string; search?: string }) {
  return (
    <form className="admin-filter-bar" method="GET">
      <input
        type="search"
        name="q"
        placeholder="Search order #, customer, email…"
        defaultValue={search ?? ""}
        className="admin-filter-input"
        aria-label="Search orders"
      />
      <select name="status" defaultValue={status ?? ""} className="admin-filter-select" aria-label="Filter by status">
        <option value="">All statuses</option>
        {ORDER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value.replace("-", " ")}
          </option>
        ))}
      </select>
      <button type="submit" className="admin-signout-button">
        Filter
      </button>
    </form>
  );
}
