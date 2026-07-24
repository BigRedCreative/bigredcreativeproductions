import Link from "next/link";
import { listProducts } from "@/server/queries/catalog";
import { formatPricingSummary } from "@/data/money";
import ProductsFilterBar from "@/components/admin/ProductsFilterBar";
import AdminPagination from "@/components/admin/AdminPagination";
import StatusBadge from "@/components/admin/StatusBadge";

type ProductsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; category?: string; q?: string }>;
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const { page: pageParam, status, category, q } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const { rows, totalCount, pageCount } = await listProducts({ page, status, category, search: q });

  return (
    <div>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Products</h1>
        <Link href="/admin/products/new" className="admin-signout-button">
          New Product
        </Link>
      </div>
      <ProductsFilterBar status={status} category={category} search={q} />

      {rows.length === 0 ? (
        <p className="admin-empty-state">
          {totalCount === 0 && !status && !category && !q
            ? "No products yet. Create the first one to get started."
            : "No products match this search/filter."}
        </p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Pricing</th>
                  <th>Featured</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/products/${row.id}`} className="admin-table-row-link">
                        {row.title}
                      </Link>
                    </td>
                    <td>{row.slug}</td>
                    <td>{row.category}</td>
                    <td>{row.productType === "physical" ? "Product" : "Service"}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{formatPricingSummary(row.pricing)}</td>
                    <td>{row.featured ? "Yes" : "—"}</td>
                    <td>{row.updatedAt.toLocaleDateString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={page}
            pageCount={pageCount}
            baseHref="/admin/products"
            baseParams={{ status, category, q }}
          />
        </>
      )}
    </div>
  );
}
