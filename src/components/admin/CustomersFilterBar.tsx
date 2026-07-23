export default function CustomersFilterBar({ search }: { search?: string }) {
  return (
    <form className="admin-filter-bar" method="GET">
      <input
        type="search"
        name="q"
        placeholder="Search name, email, company…"
        defaultValue={search ?? ""}
        className="admin-filter-input"
        aria-label="Search customers"
      />
      <button type="submit" className="admin-signout-button">
        Search
      </button>
    </form>
  );
}
