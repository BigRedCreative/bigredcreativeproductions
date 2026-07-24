import Link from "next/link";
import { getNavigationItemsForAdmin } from "@/server/queries/site-content";
import NavigationForm from "@/components/admin/NavigationForm";

export default async function AdminWebsiteNavigationPage() {
  const rows = await getNavigationItemsForAdmin();
  const primaryItems = rows
    .filter((row) => row.placement === "primary")
    .map((row) => ({ label: row.label, href: row.href, enabled: row.enabled }));
  const headerCtaRow = rows.find((row) => row.placement === "header_cta");

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/website">← Website</Link>
      </p>
      <h1 className="admin-page-heading">Navigation</h1>
      <NavigationForm
        initialPrimaryItems={primaryItems}
        initialHeaderCta={{ label: headerCtaRow?.label ?? "", href: headerCtaRow?.href ?? "" }}
      />
    </div>
  );
}
