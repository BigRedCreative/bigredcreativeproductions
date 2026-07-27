import Link from "next/link";
import { getActiveMediaAssetsForPicker } from "@/server/queries/media";
import { listPortfolioForAdmin } from "@/server/queries/portfolio";
import { listServicesForAdmin } from "@/server/queries/services";
import { countImageGenerationsToday, getTodayImageCostMicrosSoFar, getMonthlyImageCostMicrosSoFar } from "@/server/queries/creative-studio";
import { formatMicrosAsUsd } from "@/server/creative-studio/cost";
import { DAILY_IMAGE_GENERATION_CAP, MONTHLY_IMAGE_COST_WARNING_THRESHOLD_MICROS } from "@/data/creative-studio";
import CreativeStudioView from "@/components/admin/CreativeStudioView";

// Phase 20C-1/20C-2 — /admin/creative-studio. This page makes ZERO AI
// provider calls: every fetch below is a plain database read (the same
// class of query every other admin page already runs), exactly like
// /admin/brain's own "the page itself makes zero AI provider calls"
// guarantee. The only thing on this page that can ever call a provider is
// CreativeStudioView's own "Generate Image" form submission. The cost
// dashboard block added this phase is a pure read of existing
// ai_generation_jobs data — no new provider calls, no new writes.
export default async function AdminCreativeStudioPage() {
  const [referenceAssets, portfolio, services, generationsToday, spendTodayMicros, spendMonthMicros] = await Promise.all([
    getActiveMediaAssetsForPicker(["image"]),
    listPortfolioForAdmin(),
    listServicesForAdmin(),
    countImageGenerationsToday(),
    getTodayImageCostMicrosSoFar(),
    getMonthlyImageCostMicrosSoFar(),
  ]);

  const pickerAssets = referenceAssets.map((asset) => ({ id: asset.id, url: asset.url, alt: asset.alt, filename: asset.filename }));
  const monthlyWarningReached = spendMonthMicros >= MONTHLY_IMAGE_COST_WARNING_THRESHOLD_MICROS;

  return (
    <div>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Big Red Creative Studio</h1>
        <Link href="/admin/creative-studio/history" className="admin-secondary-button">
          Generation History
        </Link>
      </div>

      <div className="admin-detail-block">
        <h2>Usage &amp; cost</h2>
        <p className="admin-form-section-help">Read directly from your generation history — no provider call.</p>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Generations today</span>
          <span>
            {generationsToday} / {DAILY_IMAGE_GENERATION_CAP}
          </span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Spend today</span>
          <span>{formatMicrosAsUsd(spendTodayMicros)}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Spend this month</span>
          <span>
            {formatMicrosAsUsd(spendMonthMicros)} (warning at {formatMicrosAsUsd(MONTHLY_IMAGE_COST_WARNING_THRESHOLD_MICROS)})
            {monthlyWarningReached && " — threshold reached"}
          </span>
        </div>
      </div>

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
    </div>
  );
}
