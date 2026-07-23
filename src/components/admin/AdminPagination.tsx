import Link from "next/link";

// Server-rendered, URL-driven pagination — no client JS. `baseParams` are
// the current filter/search params (minus `page`) so Prev/Next preserve
// them, matching the approved "/admin/orders?page=2&status=submitted&q=john"
// bookmarkable-URL pattern.
export default function AdminPagination({
  page,
  pageCount,
  baseHref,
  baseParams,
}: {
  page: number;
  pageCount: number;
  baseHref: string;
  baseParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `${baseHref}?${params.toString()}`;
  }

  return (
    <div className="admin-pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)}>Prev</Link>
      ) : (
        <span className="admin-pagination-status">Prev</span>
      )}
      <span className="admin-pagination-status">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)}>Next</Link>
      ) : (
        <span className="admin-pagination-status">Next</span>
      )}
    </div>
  );
}
