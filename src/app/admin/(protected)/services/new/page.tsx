import Link from "next/link";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import { createServiceAction } from "@/server/mutate-service";
import ServiceForm from "@/components/admin/ServiceForm";

export default async function NewServicePage() {
  const mediaAssets = await getActiveImageAssetsForPicker();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/services">← Services</Link>
      </p>
      <h1 className="admin-page-heading">New Service</h1>
      <p className="admin-form-section-help">
        Creates a private draft only — nothing becomes public until you publish it from the service&apos;s detail page.
      </p>
      <ServiceForm action={createServiceAction} mediaAssets={mediaAssets} submitLabel="Create draft" />
    </div>
  );
}
