import Link from "next/link";
import { getSiteSettings } from "@/server/queries/site-content";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";

export default async function AdminWebsiteSeoPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/website">← Website</Link>
      </p>
      <h1 className="admin-page-heading">SEO &amp; Sharing</h1>
      <SiteSettingsForm section="seo" initialSettings={settings} />
    </div>
  );
}
