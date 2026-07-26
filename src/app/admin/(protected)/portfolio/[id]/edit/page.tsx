import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioEntityForAdmin } from "@/server/queries/portfolio";
import { getActiveImageAssetsForPicker, getActiveMediaAssetsForPicker, getMediaAssetsByIds } from "@/server/queries/media";
import { savePortfolioDraftAction } from "@/server/mutate-portfolio";
import PortfolioForm from "@/components/admin/PortfolioForm";
import type { PortfolioGalleryPickerAsset } from "@/components/admin/PortfolioGalleryEditor";

type EditPortfolioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPortfolioPage({ params }: EditPortfolioPageProps) {
  const { id } = await params;
  // Hero stays image-only; gallery accepts image + video, per Phase 19B.
  const [project, mediaAssets, rawGalleryAssets] = await Promise.all([
    getPortfolioEntityForAdmin(id),
    getActiveImageAssetsForPicker(),
    getActiveMediaAssetsForPicker(["image", "video"]),
  ]);

  if (!project) {
    notFound();
  }

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

  const boundAction = savePortfolioDraftAction.bind(null, id);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href={`/admin/portfolio/${id}`}>← {project.draft.title}</Link>
      </p>
      <h1 className="admin-page-heading">Edit draft</h1>
      <p className="admin-form-section-help">
        {project.published
          ? "Editing this draft never changes the live public page — publish it separately when you're ready."
          : "This project has never been published — nothing here is public yet."}
      </p>
      <PortfolioForm
        action={boundAction}
        initialProject={project.draft}
        mediaAssets={mediaAssets}
        galleryMediaAssets={galleryMediaAssets}
        submitLabel="Save draft"
      />
    </div>
  );
}
