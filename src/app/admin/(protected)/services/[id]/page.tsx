import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceEntityForAdmin } from "@/server/queries/services";
import StatusBadge from "@/components/admin/StatusBadge";
import PublishServiceButton from "@/components/admin/PublishServiceButton";
import ServiceArchiveToggle from "@/components/admin/ServiceArchiveToggle";
import AskBrainForm from "@/components/admin/AskBrainForm";
import type { Preset } from "@/components/admin/AskBrainForm";

const SERVICE_BRAIN_PRESETS: Preset[] = [
  { requestType: "analyze_service", label: "Critique this service", question: "Critique this service." },
  { requestType: "analyze_service", label: "How can I position this better?", question: "How can I position this service better?" },
  { requestType: "analyze_service", label: "What content is missing?", question: "What content is missing from this service?" },
  { requestType: "recommend_caption", label: "Suggest marketing ideas", question: "Suggest marketing ideas for this service." },
  { requestType: "recommend_seo", label: "Suggest SEO improvements", question: "Suggest SEO improvements for this service." },
];

type ServiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params;
  const service = await getServiceEntityForAdmin(id);

  if (!service) {
    notFound();
  }

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/services">← Services</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">
          {service.draft.title} <StatusBadge status={service.entity.status} />
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/services/${id}/edit`} className="admin-secondary-button">
            Edit draft
          </Link>
          <Link href={`/admin/services/${id}/preview`} className="admin-secondary-button">
            Preview draft
          </Link>
        </div>
      </div>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Currently live</h2>
            {service.published ? (
              <>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Title</span>
                  <span>{service.published.title}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Slug</span>
                  <span>{service.published.slug}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Summary</span>
                  <span>{service.published.summary}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Featured</span>
                  <span>{service.published.featured ? "Yes" : "No"}</span>
                </div>
                {service.entity.status === "published" && (
                  <p className="admin-form-section-help">
                    Live at <Link href={`/services/${service.published.slug}`}>/services/{service.published.slug}</Link>
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
              <span>{service.draft.title}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Slug</span>
              <span>{service.draft.slug}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Summary</span>
              <span>{service.draft.summary}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Featured</span>
              <span>{service.draft.featured ? "Yes" : "No"}</span>
            </div>
            <p className="admin-form-section-help">
              Only visible to you, via <Link href={`/admin/services/${id}/preview`}>the authenticated preview</Link> —
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
            <PublishServiceButton id={id} />
          </div>

          <div className="admin-detail-block">
            <h2>Status</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Entity status</span>
              <span>
                <StatusBadge status={service.entity.status} />
              </span>
            </div>
            <p className="admin-form-section-help">
              Archiving removes this service from the public site without touching its draft or published content —
              unarchiving brings back exactly what was there before.
            </p>
            <ServiceArchiveToggle id={id} status={service.entity.status} />
          </div>

          <div className="admin-detail-block">
            <h2>Identity</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Created</span>
              <span>{service.entity.createdAt.toLocaleDateString("en-US")}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Updated</span>
              <span>{service.entity.updatedAt.toLocaleDateString("en-US")}</span>
            </div>
          </div>

          <AskBrainForm requestSource="service_detail" relatedEntityType="service" relatedEntityId={id} presets={SERVICE_BRAIN_PRESETS} />
        </div>
      </div>
    </div>
  );
}
