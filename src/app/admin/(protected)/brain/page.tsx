import Link from "next/link";
import { buildDashboardContext } from "@/server/brain/context-builder";
import { getRecentBrainActivity, getMonthlyCostMicrosSoFar, resolveEntityLabels } from "@/server/queries/brain";
import { formatMicrosAsUsd } from "@/server/brain/cost";
import { MONTHLY_COST_WARNING_THRESHOLD_MICROS } from "@/data/brain";
import type { BrainRelatedEntityType } from "@/data/brain";
import AskBrainForm from "@/components/admin/AskBrainForm";
import StatusBadge from "@/components/admin/StatusBadge";

// Phase 20A/20B - /admin/brain. The page itself makes ZERO AI provider calls:
// "What needs my attention today?" is generated entirely from
// buildDashboardContext() (plain database reads, the same class of query
// every other admin page already runs), at no AI cost. The ONLY thing on
// this page that can ever call a provider is submitting AskBrainForm - see
// that component's own comment.

function formatUsage(usage: { inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; actualCostMicros?: number } | null): string {
  if (!usage) return "n/a";
  const cost = usage.actualCostMicros !== undefined ? `~${formatMicrosAsUsd(usage.actualCostMicros)}` : "n/a";
  const cached = usage.cachedInputTokens ? ` (${usage.cachedInputTokens} cached)` : "";
  return `${usage.inputTokens ?? "?"} in${cached} / ${usage.outputTokens ?? "?"} out - ${cost}`;
}

const ENTITY_TYPE_LABELS: Record<BrainRelatedEntityType, string> = {
  lead: "Lead",
  customer: "Customer",
  order: "Order",
  portfolio_project: "Portfolio",
  service: "Service",
  media_asset: "Media",
};

const SOURCE_LABELS: Record<string, string> = {
  brain_dashboard: "Dashboard",
  customer_detail: "Customer detail",
  order_detail: "Order detail",
  portfolio_detail: "Portfolio detail",
  service_detail: "Service detail",
  media_detail: "Media detail",
};

export default async function AdminBrainPage() {
  const [context, recentActivity, monthlyCostMicros] = await Promise.all([
    buildDashboardContext(),
    getRecentBrainActivity(),
    getMonthlyCostMicrosSoFar(),
  ]);
  const monthlyWarningReached = monthlyCostMicros >= MONTHLY_COST_WARNING_THRESHOLD_MICROS;

  // Resolve entity labels at READ TIME only — never persisted onto
  // brain_requests. Distinct (type, id) pairs found across the recent
  // rows, batched into one query per type.
  const entityRefs = recentActivity
    .filter((row): row is typeof row & { relatedEntityType: string; relatedEntityId: string } => !!row.relatedEntityType && !!row.relatedEntityId)
    .map((row) => ({ type: row.relatedEntityType as BrainRelatedEntityType, id: row.relatedEntityId }));
  const labelMap = await resolveEntityLabels(entityRefs);

  return (
    <div>
      <h1 className="admin-page-heading">Big Red Brain</h1>

      <div className="admin-detail-block">
        <h2>What needs my attention today?</h2>
        <p className="admin-form-section-help">Generated locally from your business data - no AI provider call.</p>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Leads needing follow-up</span>
          <span>{context.leadsNeedingFollowUpCount}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Unpaid orders</span>
          <span>{context.orderPaymentCounts.unpaid}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Deposit paid, not yet in full</span>
          <span>{context.orderPaymentCounts.depositPaid}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Active projects</span>
          <span>{context.activeProjectCount}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Awaiting client</span>
          <span>{context.awaitingClientCount}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Services missing gallery media</span>
          <span>{context.servicesMissingGalleryCount}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Portfolio projects with thin SEO</span>
          <span>{context.portfolioThinSeoCount}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Unused Media Library assets</span>
          <span>{context.orphanedMediaAssetCount}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Motion</span>
          <span>
            {context.motion.intensity} intensity, {context.motion.heroEntrance} hero entrance
          </span>
        </div>
      </div>

      <AskBrainForm />

      <div className="admin-detail-block">
        <h2>Recent Brain Activity</h2>
        <div className="admin-detail-row">
          <span className="admin-detail-label">Spend this month</span>
          <span>
            {formatMicrosAsUsd(monthlyCostMicros)} (warning at {formatMicrosAsUsd(MONTHLY_COST_WARNING_THRESHOLD_MICROS)})
            {monthlyWarningReached && " - threshold reached"}
          </span>
        </div>
        {recentActivity.length === 0 ? (
          <p className="admin-empty-state">No Big Red Brain requests yet.</p>
        ) : (
          recentActivity.map((row) => {
            const entityRef =
              row.relatedEntityType && row.relatedEntityId
                ? labelMap.get(`${row.relatedEntityType}:${row.relatedEntityId}`)
                : null;
            const entityTypeLabel = row.relatedEntityType ? ENTITY_TYPE_LABELS[row.relatedEntityType as BrainRelatedEntityType] : null;

            return (
              <div className="admin-line-item" key={row.id}>
                <p className="admin-line-item-title">
                  {row.requestType} <StatusBadge status={row.status} />
                </p>
                <p className="admin-line-item-meta">
                  {row.createdAt.toLocaleString("en-US")} - {SOURCE_LABELS[row.requestSource] ?? row.requestSource} -{" "}
                  {row.provider}/{row.model} - {formatUsage(row.usageMetadata)}
                </p>
                {entityTypeLabel && (
                  <p className="admin-line-item-meta">
                    {entityTypeLabel}:{" "}
                    {entityRef ? <Link href={entityRef.href}>{entityRef.label}</Link> : "record no longer available"}
                  </p>
                )}
                {row.status === "completed" && row.responseSummary && <p>{row.responseSummary}</p>}
                {row.status === "failed" && row.errorCategory && <p className="admin-form-help">Failed: {row.errorCategory}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
