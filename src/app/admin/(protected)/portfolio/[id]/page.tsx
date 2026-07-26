import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioEntityForAdmin } from "@/server/queries/portfolio";
import StatusBadge from "@/components/admin/StatusBadge";
import PublishPortfolioButton from "@/components/admin/PublishPortfolioButton";
import PortfolioArchiveToggle from "@/components/admin/PortfolioArchiveToggle";
import AskBrainForm from "@/components/admin/AskBrainForm";
import type { Preset } from "@/components/admin/AskBrainForm";

const PORTFOLIO_BRAIN_PRESETS: Preset[] = [
  { requestType: "analyze_portfolio", label: "Critique this project", question: "Critique this project." },
  { requestType: "analyze_portfolio", label: "How can I improve this case study?", question: "How can I improve this case study?" },
  { requestType: "analyze_portfolio", label: "What should I highlight?", question: "What should I highlight about this project?" },
  { requestType: "recommend_seo", label: "Suggest better SEO", question: "Suggest a better SEO title and description for this project." },
  { requestType: "recommend_caption", label: "Suggest promotional copy", question: "Suggest promotional copy for this project." },
];

type PortfolioDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = await params;
  const project = await getPortfolioEntityForAdmin(id);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/portfolio">← Portfolio</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">
          {project.draft.title} <StatusBadge status={project.entity.status} />
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/portfolio/${id}/edit`} className="admin-secondary-button">
            Edit draft
          </Link>
          <Link href={`/admin/portfolio/${id}/preview`} className="admin-secondary-button">
            Preview draft
          </Link>
        </div>
      </div>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Currently live</h2>
            {project.published ? (
              <>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Title</span>
                  <span>{project.published.title}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Slug</span>
                  <span>{project.published.slug}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Summary</span>
                  <span>{project.published.summary}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Featured</span>
                  <span>{project.published.featured ? "Yes" : "No"}</span>
                </div>
                {project.entity.status === "published" && (
                  <p className="admin-form-section-help">
                    Live at <Link href={`/work/${project.published.slug}`}>/work/{project.published.slug}</Link>
                  </p>
                )}
              </>
            ) : (
              <p className="admin-empty-state">Never published — nothing is public yet.</p>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Private draft</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Title</span>
              <span>{project.draft.title}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Slug</span>
              <span>{project.draft.slug}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Summary</span>
              <span>{project.draft.summary}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Featured</span>
              <span>{project.draft.featured ? "Yes" : "No"}</span>
            </div>
            <p className="admin-form-section-help">
              Only visible to you, via <Link href={`/admin/portfolio/${id}/preview`}>the authenticated preview</Link> —
              never public until published.
            </p>
          </div>
        </div>

        <div>
          <div className="admin-detail-block">
            <h2>Publish</h2>
            <p className="admin-form-note">
              Copies the complete private draft above onto the live, public version. Save your edits first — publishing
              publishes the last-saved draft, not unsaved form edits.
            </p>
            <PublishPortfolioButton id={id} />
          </div>

          <div className="admin-detail-block">
            <h2>Status</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Entity status</span>
              <span>
                <StatusBadge status={project.entity.status} />
              </span>
            </div>
            <p className="admin-form-section-help">
              Archiving removes this project from the public site without touching its draft or published content —
              unarchiving brings back exactly what was there before.
            </p>
            <PortfolioArchiveToggle id={id} status={project.entity.status} />
          </div>

          <div className="admin-detail-block">
            <h2>Identity</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Created</span>
              <span>{project.entity.createdAt.toLocaleDateString("en-US")}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Updated</span>
              <span>{project.entity.updatedAt.toLocaleDateString("en-US")}</span>
            </div>
          </div>

          <AskBrainForm requestSource="portfolio_detail" relatedEntityType="portfolio_project" relatedEntityId={id} presets={PORTFOLIO_BRAIN_PRESETS} />
        </div>
      </div>
    </div>
  );
}
