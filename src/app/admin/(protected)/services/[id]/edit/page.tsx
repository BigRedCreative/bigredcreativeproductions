import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceEntityForAdmin } from "@/server/queries/services";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import { saveServiceDraftAction } from "@/server/mutate-service";
import ServiceForm from "@/components/admin/ServiceForm";

type EditServicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;
  const [service, mediaAssets] = await Promise.all([getServiceEntityForAdmin(id), getActiveImageAssetsForPicker()]);

  if (!service) {
    notFound();
  }

  const boundAction = saveServiceDraftAction.bind(null, id);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href={`/admin/services/${id}`}>← {service.draft.title}</Link>
      </p>
      <h1 className="admin-page-heading">Edit draft</h1>
      <p className="admin-form-section-help">
        {service.published
          ? "Editing this draft never changes the live public page — publish it separately when you're ready."
          : "This service has never been published — nothing here is public yet."}
      </p>
      <ServiceForm action={boundAction} initialService={service.draft} mediaAssets={mediaAssets} submitLabel="Save draft" />
    </div>
  );
}
