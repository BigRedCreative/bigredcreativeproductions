import Link from "next/link";
import { getHeroContentRowForAdmin } from "@/server/queries/site-content";
import { getActiveImageAssetsForPicker, getActiveMediaAssetsForPicker, getMediaAssetsByIds, getMediaAssetById } from "@/server/queries/media";
import HeroContentForm from "@/components/admin/HeroContentForm";
import type { HeroVideoPickerAsset } from "@/components/admin/HeroMediaField";
import PublishHeroButton from "@/components/admin/PublishHeroButton";

export default async function AdminWebsiteHomepagePage() {
  const [draftRow, publishedRow, imageAssets, rawVideoAssets] = await Promise.all([
    getHeroContentRowForAdmin("draft"),
    getHeroContentRowForAdmin("published"),
    getActiveImageAssetsForPicker(),
    getActiveMediaAssetsForPicker(["video"]),
  ]);

  // Resolve each video's own poster image so the picker can show a real
  // thumbnail instead of a bare "Video" text label — same fix already
  // proven for Portfolio/Service gallery pickers.
  const posterIds = [...new Set(rawVideoAssets.filter((a) => a.posterMediaAssetId).map((a) => a.posterMediaAssetId!))];
  const posterAssets = posterIds.length > 0 ? await getMediaAssetsByIds(posterIds) : new Map();
  const videoAssets: HeroVideoPickerAsset[] = rawVideoAssets.map((a) => ({
    id: a.id,
    url: a.url,
    alt: a.alt,
    filename: a.filename,
    width: a.width,
    height: a.height,
    posterUrl: a.posterMediaAssetId ? posterAssets.get(a.posterMediaAssetId)?.url : undefined,
  }));

  // Resolve the draft's currently-selected hero asset's real type
  // regardless of active/archived status, so the form shows the truth
  // even if a previously-selected asset was since archived (only NEW
  // saves reject an archived selection — see mutate-website-content.ts).
  let initialMediaType: "image" | "video" | null = null;
  if (draftRow?.heroMediaAssetId) {
    const currentAsset = await getMediaAssetById(draftRow.heroMediaAssetId);
    initialMediaType = currentAsset?.type === "video" ? "video" : currentAsset?.type === "image" ? "image" : null;
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/website">← Website</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Homepage</h1>
        <Link href="/admin/website/homepage/preview" className="admin-secondary-button">
          Preview draft
        </Link>
      </div>

      {publishedRow && (
        <div className="admin-detail-block">
          <h2>Currently live</h2>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Headline</span>
            <span>
              {publishedRow.headlineLead} {publishedRow.headlineAccent}
            </span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Button</span>
            <span>
              {publishedRow.ctaLabel} → {publishedRow.ctaHref}
            </span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Hero media</span>
            <span>
              {publishedRow.heroMediaAssetId ? "Media Library selection" : publishedRow.heroImageSrc ? `Manual image (${publishedRow.heroImageSrc})` : "None"}
            </span>
          </div>
        </div>
      )}

      {draftRow && (
        <HeroContentForm
          initialDraft={{
            badgePrimary: draftRow.badgePrimary,
            badgeSecondary: draftRow.badgeSecondary,
            eyebrow: draftRow.eyebrow,
            headlineLead: draftRow.headlineLead,
            headlineAccent: draftRow.headlineAccent,
            tagline: draftRow.tagline,
            supportingCopy: draftRow.supportingCopy,
            ctaLabel: draftRow.ctaLabel,
            ctaHref: draftRow.ctaHref,
          }}
          initialMediaAssetId={draftRow.heroMediaAssetId}
          initialMediaType={initialMediaType}
          initialImageSrc={draftRow.heroImageSrc}
          initialImageAlt={draftRow.heroImageAlt}
          imageAssets={imageAssets}
          videoAssets={videoAssets}
        />
      )}

      <div className="admin-form-section">
        <h2>Publish</h2>
        <p className="admin-form-note">
          Publishing makes the saved draft above live on the homepage immediately. Save your draft and preview it
          first.
        </p>
        <PublishHeroButton />
      </div>
    </div>
  );
}
