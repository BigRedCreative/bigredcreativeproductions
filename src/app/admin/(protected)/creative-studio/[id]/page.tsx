import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getGenerationJobById } from "@/server/queries/creative-studio";
import { getMediaAssetsByIds } from "@/server/queries/media";
import { formatMicrosAsUsd } from "@/server/creative-studio/cost";
import StatusBadge from "@/components/admin/StatusBadge";
import CreativeStudioReopenActions from "@/components/admin/CreativeStudioReopenActions";

// Phase 20C-2 — Reopen. A plain server component: independently re-fetches
// the job fresh (never trusts a stale id/state), and — critically — never
// imports anything from src/server/creative-studio/providers/ or
// generate-image.ts. There is no code path from this route to an
// ImageProvider; confirmed by this file's own import list, not just by
// intent (the automated regression suite asserts this statically too).
//
// Shows the full reviewed brief deliberately, not just a summary — this is
// the owner's own prior input, already sanitized once at write time, shown
// back to them on a single-record authenticated admin page, the same way
// every other admin detail page in this codebase (Order, Portfolio draft,
// Product edit) already shows its own full content. This is different in
// kind from audit_log's metadata, which stays minimal by a separate rule.

type ReopenPageProps = {
  params: Promise<{ id: string }>;
};

function deriveState(job: { status: string; discardedAt: Date | null; outputMediaAssetId: string | null }): "saved" | "discarded" | "unsaved" | "failed" {
  if (job.status === "failed") return "failed";
  if (job.discardedAt) return "discarded";
  if (job.outputMediaAssetId) return "saved";
  return "unsaved";
}

export default async function CreativeStudioReopenPage({ params }: ReopenPageProps) {
  const { id } = await params;
  const job = await getGenerationJobById(id);
  if (!job) {
    notFound();
  }

  const state = deriveState(job);
  const referenceAssets = job.referenceMediaAssetIds.length > 0 ? await getMediaAssetsByIds(job.referenceMediaAssetIds) : new Map();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/creative-studio/history">← Generation History</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">
          {job.taskPreset.replace(/_/g, " ")} <StatusBadge status={state} />
        </h1>
      </div>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Generated image</h2>
            {job.outputUrl ? (
              <div className="admin-media-preview">
                <Image src={job.outputUrl} alt="" fill sizes="480px" />
              </div>
            ) : (
              <p className="admin-empty-state">
                This generation did not complete successfully
                {job.errorCategory && ` (${job.errorCategory.replace(/_/g, " ")})`}.
              </p>
            )}
          </div>

          {state === "saved" && job.outputMediaAssetId && (
            <div className="admin-detail-block">
              <h2>Saved to Media Library</h2>
              <p>
                <Link href={`/admin/media/${job.outputMediaAssetId}`}>View asset</Link>
              </p>
              <h3>Use in…</h3>
              <p className="admin-form-section-help">
                None of these publish or change anything automatically — each opens the normal editor for you to
                finish manually.
              </p>
              <ul>
                <li>
                  <Link href={`/admin/website/homepage?preselectMediaAssetId=${job.outputMediaAssetId}`}>
                    Use in Homepage Hero
                  </Link>
                </li>
                <li>
                  <Link href="/admin/portfolio">Choose a Portfolio project…</Link>
                </li>
                <li>
                  <Link href="/admin/services">Choose a Service…</Link>
                </li>
                <li>
                  <Link href="/admin/products">Choose a Product…</Link>
                </li>
              </ul>
            </div>
          )}

          {(state === "unsaved" || state === "discarded") && (
            <div className="admin-detail-block">
              <CreativeStudioReopenActions jobId={job.id} defaultAlt={job.brief.objective} state={state} />
            </div>
          )}

          {job.referenceMediaAssetIds.length > 0 && (
            <div className="admin-detail-block">
              <h2>Reference images used</h2>
              <p className="admin-form-section-help">
                Shown for reference even if an asset has since been archived — archived assets can no longer be
                selected for a NEW generation, but stay visible here.
              </p>
              <div className="admin-media-picker-grid">
                {job.referenceMediaAssetIds.map((assetId) => {
                  const asset = referenceAssets.get(assetId);
                  if (!asset) {
                    return (
                      <div key={assetId} className="admin-empty-state">
                        No longer available
                      </div>
                    );
                  }
                  return (
                    <div key={assetId} className="admin-media-picker-thumb" style={{ position: "relative" }}>
                      <Image src={asset.url} alt={asset.alt} fill sizes="120px" />
                      {asset.status === "archived" && <span className="admin-form-help">Archived</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="admin-detail-block">
            <h2>Details</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Provider / model</span>
              <span>
                {job.provider} / {job.model}
              </span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Size / quality</span>
              <span>
                {job.requestedSize} / {job.requestedQuality}
              </span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Cost</span>
              <span>{job.usageMetadata?.actualCostMicros !== undefined ? formatMicrosAsUsd(job.usageMetadata.actualCostMicros) : "—"}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Generated</span>
              <span>{job.createdAt.toLocaleString("en-US")}</span>
            </div>
            {job.savedAt && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Saved</span>
                <span>{job.savedAt.toLocaleString("en-US")}</span>
              </div>
            )}
            {job.discardedAt && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Discarded</span>
                <span>{job.discardedAt.toLocaleString("en-US")}</span>
              </div>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Reviewed brief</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Objective</span>
              <span>{job.brief.objective}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Subject</span>
              <span>{job.brief.subject}</span>
            </div>
            {job.brief.brandDirection && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Brand direction</span>
                <span>{job.brief.brandDirection}</span>
              </div>
            )}
            {job.brief.visualStyle && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Visual style</span>
                <span>{job.brief.visualStyle}</span>
              </div>
            )}
            {job.brief.composition && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Composition</span>
                <span>{job.brief.composition}</span>
              </div>
            )}
            {job.brief.requiredElements.length > 0 && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Required elements</span>
                <span>{job.brief.requiredElements.join(", ")}</span>
              </div>
            )}
            {job.brief.avoidElements.length > 0 && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Avoid</span>
                <span>{job.brief.avoidElements.join(", ")}</span>
              </div>
            )}
            {job.brief.textToRender && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Text to render</span>
                <span>&quot;{job.brief.textToRender}&quot;</span>
              </div>
            )}
            {job.brief.additionalDirection && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Additional direction</span>
                <span>{job.brief.additionalDirection}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
