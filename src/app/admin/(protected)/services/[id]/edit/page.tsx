import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceEntityForAdmin } from "@/server/queries/services";
import { getActiveImageAssetsForPicker, getActiveMediaAssetsForPicker, getMediaAssetsByIds } from "@/server/queries/media";
import { saveServiceDraftAction } from "@/server/mutate-service";
import ServiceForm from "@/components/admin/ServiceForm";
import type { ServiceGalleryPickerAsset } from "@/components/admin/ServiceGalleryEditor";

type EditServicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;
  // Hero stays image-only; gallery accepts image + video, per Phase 19C.
  const [service, mediaAssets, rawGalleryAssets] = await Promise.all([
    getServiceEntityForAdmin(id),
    getActiveImageAssetsForPicker(),
    getActiveMediaAssetsForPicker(["image", "video"]),
  ]);

  if (!service) {
    notFound();
  }

  // Resolve each video's own poster image so the picker can show a real
  // thumbnail instead of a bare "Video" text label.
  const posterIds = [...new Set(rawGalleryAssets.filter((a) => a.type === "video" && a.posterMediaAssetId).map((a) => a.posterMediaAssetId!))];
  const posterAssets = posterIds.length > 0 ? await getMediaAssetsByIds(posterIds) : new Map();
  const galleryMediaAssets: ServiceGalleryPickerAsset[] = rawGalleryAssets.map((a) => ({
    id: a.id,
    url: a.url,
    alt: a.alt,
    filename: a.filename,
    width: a.width,
    height: a.height,
    type: a.type,
    posterUrl: a.type === "video" && a.posterMediaAssetId ? posterAssets.get(a.posterMediaAssetId)?.url : undefined,
  }));

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
      <ServiceForm
        action={boundAction}
        initialService={service.draft}
        mediaAssets={mediaAssets}
        galleryMediaAssets={galleryMediaAssets}
        submitLabel="Save draft"
      />
    </div>
  );
}
