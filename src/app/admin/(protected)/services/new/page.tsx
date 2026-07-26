import Link from "next/link";
import { getActiveImageAssetsForPicker, getActiveMediaAssetsForPicker, getMediaAssetsByIds } from "@/server/queries/media";
import { createServiceAction } from "@/server/mutate-service";
import ServiceForm from "@/components/admin/ServiceForm";
import type { ServiceGalleryPickerAsset } from "@/components/admin/ServiceGalleryEditor";

export default async function NewServicePage() {
  // Hero stays image-only; gallery accepts image + video, per Phase 19C.
  const [mediaAssets, rawGalleryAssets] = await Promise.all([
    getActiveImageAssetsForPicker(),
    getActiveMediaAssetsForPicker(["image", "video"]),
  ]);

  // Resolve each video's own poster image so the picker can show a real
  // thumbnail instead of a bare "Video" text label — see
  // ServiceGalleryEditor.tsx / Phase 19B's PortfolioGalleryEditor.tsx for
  // why this matters.
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

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/services">← Services</Link>
      </p>
      <h1 className="admin-page-heading">New Service</h1>
      <p className="admin-form-section-help">
        Creates a private draft only — nothing becomes public until you publish it from the service&apos;s detail page.
      </p>
      <ServiceForm
        action={createServiceAction}
        mediaAssets={mediaAssets}
        galleryMediaAssets={galleryMediaAssets}
        submitLabel="Create draft"
      />
    </div>
  );
}
