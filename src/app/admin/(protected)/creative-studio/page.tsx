import { getActiveMediaAssetsForPicker } from "@/server/queries/media";
import { listPortfolioForAdmin } from "@/server/queries/portfolio";
import { listServicesForAdmin } from "@/server/queries/services";
import CreativeStudioView from "@/components/admin/CreativeStudioView";

// Phase 20C-1 — /admin/creative-studio. This page makes ZERO AI provider
// calls: every fetch below is a plain database read (the same class of
// query every other admin page already runs), exactly like /admin/brain's
// own "the page itself makes zero AI provider calls" guarantee. The only
// thing on this page that can ever call a provider is CreativeStudioView's
// own "Generate Image" form submission.
export default async function AdminCreativeStudioPage() {
  const [referenceAssets, portfolio, services] = await Promise.all([
    getActiveMediaAssetsForPicker(["image"]),
    listPortfolioForAdmin(),
    listServicesForAdmin(),
  ]);

  const pickerAssets = referenceAssets.map((asset) => ({ id: asset.id, url: asset.url, alt: asset.alt, filename: asset.filename }));

  return (
    <CreativeStudioView
      referenceAssets={pickerAssets}
      mediaOptions={pickerAssets}
      portfolioOptions={portfolio
        .filter((row) => row.draft || row.published)
        .map((row) => ({ id: row.id, label: (row.published ?? row.draft)!.title }))}
      serviceOptions={services
        .filter((row) => row.draft || row.published)
        .map((row) => ({ id: row.id, label: (row.published ?? row.draft)!.title }))}
    />
  );
}
