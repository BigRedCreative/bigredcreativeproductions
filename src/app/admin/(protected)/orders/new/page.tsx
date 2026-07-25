import Link from "next/link";
import { getCustomerById, searchCustomers } from "@/server/queries/customers";
import { getPublishedProducts } from "@/server/queries/catalog";
import OrderForm from "@/components/admin/OrderForm";

type NewOrderPageProps = {
  searchParams: Promise<{ customerId?: string; customerQuery?: string }>;
};

// Two-step, JS-free flow: pick a customer (either preselected via
// ?customerId= — linked from a customer or lead page — or found through
// an inline native-GET search), then fill in line items. No client JS is
// needed for the customer-pick step; each result is a plain link that
// reloads this page with ?customerId= set.
export default async function AdminNewOrderPage({ searchParams }: NewOrderPageProps) {
  const { customerId, customerQuery } = await searchParams;

  const customer = customerId ? await getCustomerById(customerId) : null;
  const searchResults = !customer && customerQuery ? await searchCustomers(customerQuery) : [];
  const catalogProducts = await getPublishedProducts();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/orders">← Orders</Link>
      </p>
      <h1 className="admin-page-heading">New Order</h1>

      {!customer ? (
        <div className="admin-detail-block">
          <h2>Choose a customer</h2>
          <form method="GET" className="admin-filter-bar">
            <input
              type="search"
              name="customerQuery"
              placeholder="Search name, email, company…"
              defaultValue={customerQuery ?? ""}
              className="admin-filter-input"
              aria-label="Search customers"
            />
            <button type="submit" className="admin-signout-button">
              Search
            </button>
          </form>

          {customerQuery &&
            (searchResults.length === 0 ? (
              <p className="admin-empty-state">
                No matching customers found. <Link href="/admin/customers/new">Create a new customer</Link> first.
              </p>
            ) : (
              searchResults.map((result) => (
                <div className="admin-line-item" key={result.id}>
                  <p className="admin-line-item-title">{result.name}</p>
                  <p className="admin-line-item-meta">
                    {result.email}
                    {result.company ? ` · ${result.company}` : ""}
                  </p>
                  <Link href={`/admin/orders/new?customerId=${result.id}`} className="admin-secondary-button">
                    Select this customer
                  </Link>
                </div>
              ))
            ))}
        </div>
      ) : (
        <>
          <p className="admin-breadcrumb">
            <Link href="/admin/orders/new">← Choose a different customer</Link>
          </p>
          <OrderForm
            customerId={customer.id}
            customerLabel={`${customer.firstName} ${customer.lastName} — ${customer.email}`}
            catalogProducts={catalogProducts.map((product) => ({ id: product.id, slug: product.slug, title: product.title }))}
          />
        </>
      )}
    </div>
  );
}
