import Link from "next/link";
import { getHeroContentRowForAdmin } from "@/server/queries/site-content";
import { getActiveImageAssetsForPicker, getActiveMediaAssetsForPicker, getMediaAssetsByIds, getMediaAssetById } from "@/server/queries/media";
import HeroContentForm from "@/components/admin/HeroContentForm";
import type { HeroVideoPickerAsset } from "@/components/admin/HeroMediaField";
import PublishHeroButton from "@/components/admin/PublishHeroButton";

// Phase 20C-2 — an optional `?preselectMediaAssetId=` query param, used
// only as a Creative Studio "Use in Homepage Hero" navigation hint. This
// is READ-ONLY and re-verified fresh on every page load: the id must
// resolve to a real, ACTIVE, image-or-video asset, or it's silently
// ignored and the page falls back to the real draft row's own saved
// selection exactly as it always has. This never writes anything by
// itself — it only changes which value HeroContentForm/HeroMediaField
// start pre-filled with; the owner still has to go through the existing
// Save Draft -> Preview -> Publish flow themselves for anything to
// actually change.
type HomepagePageProps = {
  searchParams: Promise<{ preselectMediaAssetId?: string }>;
};

export default async function AdminWebsiteHomepagePage({ searchParams }: HomepagePageProps) {
  const { preselectMediaAssetId } = await searchParams;

  const [draftRow, publishedRow, imageAssets, rawVideoAssets] = await Promise.all([
    getHeroContentRowForAdmin("draft"),
    getHeroContentRowForAdmin("published"),
    getActiveImageAssetsForPicker(),
    getActiveMediaAssetsForPicker(["video"]),
  ]);

  // Independently re-fetch and verify the hint — exists, active, a
  // compatible type (image or video) — before ever trusting it as a
  // preselection. An invalid/malformed/archived/wrong-type id simply
  // results in no preselection at all, never an error.
  let preselect: { mediaAssetId: string; type: "image" | "video"; alt: string } | null = null;
  if (preselectMediaAssetId) {
    const candidate = await getMediaAssetById(preselectMediaAssetId);
    if (candidate && candidate.status === "active" && (candidate.type === "image" || candidate.type === "video")) {
      preselect = { mediaAssetId: candidate.id, type: candidate.type, alt: candidate.alt };
    }
  }

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

  // A verified preselect hint overrides the draft's own current selection
  // as the form's STARTING point only — nothing is written until the
  // owner explicitly saves the draft themselves.
  const initialMediaAssetId = preselect ? preselect.mediaAssetId : (draftRow?.heroMediaAssetId ?? null);
  if (preselect) initialMediaType = preselect.type;

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

      {preselect && (
        <p className="admin-form-errors" role="status">
          Pre-selected from Creative Studio: an existing Media Library asset has been filled in below as your
          starting point. Nothing has been saved yet — review it and Save Draft yourself if you want to keep it.
        </p>
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
          initialMediaAssetId={initialMediaAssetId}
          initialMediaType={initialMediaType}
          initialImageSrc={preselect ? null : draftRow.heroImageSrc}
          initialImageAlt={preselect ? preselect.alt : draftRow.heroImageAlt}
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
