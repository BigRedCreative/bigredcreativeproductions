import Link from "next/link";
import { getActiveImageAssetsForPicker, getActiveMediaAssetsForPicker, getMediaAssetsByIds } from "@/server/queries/media";
import { createPortfolioAction } from "@/server/mutate-portfolio";
import PortfolioForm from "@/components/admin/PortfolioForm";
import type { PortfolioGalleryPickerAsset } from "@/components/admin/PortfolioGalleryEditor";

export default async function NewPortfolioPage() {
  // Hero stays image-only; gallery accepts image + video, per Phase 19B.
  const [mediaAssets, rawGalleryAssets] = await Promise.all([
    getActiveImageAssetsForPicker(),
    getActiveMediaAssetsForPicker(["image", "video"]),
  ]);

  // Resolve each video's own poster image so the picker can show a real
  // thumbnail instead of a bare "Video" text label — see
  // PortfolioGalleryEditor.tsx for why this matters (a real acceptance
  // test found the poster's own picker tile easy to mistake for the
  // video itself when the video tile had no visual thumbnail at all).
  const posterIds = [...new Set(rawGalleryAssets.filter((a) => a.type === "video" && a.posterMediaAssetId).map((a) => a.posterMediaAssetId!))];
  const posterAssets = posterIds.length > 0 ? await getMediaAssetsByIds(posterIds) : new Map();
  const galleryMediaAssets: PortfolioGalleryPickerAsset[] = rawGalleryAssets.map((a) => ({
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
        <Link href="/admin/portfolio">← Portfolio</Link>
      </p>
      <h1 className="admin-page-heading">New Project</h1>
      <p className="admin-form-section-help">
        Creates a private draft only — nothing becomes public until you publish it from the project&apos;s detail page.
      </p>
      <PortfolioForm
        action={createPortfolioAction}
        mediaAssets={mediaAssets}
        galleryMediaAssets={galleryMediaAssets}
        submitLabel="Create draft"
      />
    </div>
  );
}
