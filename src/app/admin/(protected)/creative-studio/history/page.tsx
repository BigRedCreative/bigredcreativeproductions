import Link from "next/link";
import Image from "next/image";
import { listGenerationJobsForAdmin } from "@/server/queries/creative-studio";
import { formatMicrosAsUsd } from "@/server/creative-studio/cost";
import AdminPagination from "@/components/admin/AdminPagination";
import StatusBadge from "@/components/admin/StatusBadge";
import type { GenerationJobListRow } from "@/server/queries/creative-studio";

// Phase 20C-2 — Generation History. Plain, server-rendered, paginated,
// newest-first — mirrors /admin/media's exact list pattern. A read-only
// page: no Server Action, no form, no provider call of any kind — just
// listGenerationJobsForAdmin(), a plain SELECT against data that already
// exists on ai_generation_jobs (see CLAUDE.md's Phase 20C-2 architecture
// report — no migration was needed for this feature).

type HistoryPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function deriveState(row: GenerationJobListRow): "saved" | "discarded" | "unsaved" | "failed" {
  if (row.status === "failed") return "failed";
  if (row.discardedAt) return "discarded";
  if (row.outputMediaAssetId) return "saved";
  return "unsaved";
}

export default async function CreativeStudioHistoryPage({ searchParams }: HistoryPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const { rows, totalCount, pageCount } = await listGenerationJobsForAdmin(page);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/creative-studio">← Creative Studio</Link>
      </p>
      <h1 className="admin-page-heading">Generation History</h1>
      <p className="admin-form-section-help">
        {totalCount} generation{totalCount === 1 ? "" : "s"} total.
      </p>

      {rows.length === 0 ? (
        <p className="admin-empty-state">No generations yet — start one from Creative Studio.</p>
      ) : (
        rows.map((row) => {
          const state = deriveState(row);
          return (
            <div className="admin-line-item" key={row.id}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                {row.outputUrl ? (
                  <div className="admin-media-picker-thumb" style={{ width: 80, height: 80, flexShrink: 0 }}>
                    <Image src={row.outputUrl} alt="" fill sizes="80px" />
                  </div>
                ) : (
                  <div className="admin-empty-state" style={{ width: 80, height: 80, flexShrink: 0 }}>
                    No image
                  </div>
                )}
                <div>
                  <p className="admin-line-item-title">
                    {row.taskPreset.replace(/_/g, " ")} <StatusBadge status={state} />
                  </p>
                  <p className="admin-line-item-meta">
                    {row.provider}/{row.model} · {row.requestedSize} · {row.requestedQuality} ·{" "}
                    {row.createdAt.toLocaleString("en-US")}
                  </p>
                  <p className="admin-line-item-meta">
                    {row.actualCostMicros !== null ? formatMicrosAsUsd(row.actualCostMicros) : "—"}
                  </p>
                  <p className="admin-line-item-meta">
                    <Link href={`/admin/creative-studio/${row.id}`}>Reopen</Link>
                    {row.outputMediaAssetId && (
                      <>
                        {" · "}
                        <Link href={`/admin/media/${row.outputMediaAssetId}`}>View in Media Library</Link>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}

      <AdminPagination page={page} pageCount={pageCount} baseHref="/admin/creative-studio/history" baseParams={{}} />
    </div>
  );
}
