import Link from "next/link";
import { getMotionSettingsRowForAdmin } from "@/server/queries/motion";
import MotionForm from "@/components/admin/MotionForm";
import PublishMotionButton from "@/components/admin/PublishMotionButton";

export default async function AdminMotionPage() {
  const [draftRow, publishedRow] = await Promise.all([
    getMotionSettingsRowForAdmin("draft"),
    getMotionSettingsRowForAdmin("published"),
  ]);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/website">← Website</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Motion</h1>
        <Link href="/admin/website/motion/preview" className="admin-secondary-button">
          Preview draft
        </Link>
      </div>
      <p className="admin-form-section-help">
        Controls the entrance animation each homepage section uses as a visitor scrolls to it. Every animation runs
        once, respects visitors who prefer reduced motion, and never exposes raw CSS — just a small set of named
        presets.
      </p>

      {publishedRow && (
        <div className="admin-detail-block">
          <h2>Currently live</h2>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Motion intensity</span>
            <span>{publishedRow.intensity}</span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Hero entrance</span>
            <span>{publishedRow.heroEntrance}</span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Services</span>
            <span>
              {publishedRow.servicesPreset}
              {publishedRow.servicesStagger ? " (staggered)" : ""}
            </span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Portfolio</span>
            <span>
              {publishedRow.portfolioPreset}
              {publishedRow.portfolioStagger ? " (staggered)" : ""}
            </span>
          </div>
        </div>
      )}

      {draftRow && (
        <MotionForm
          initialValues={{
            intensity: draftRow.intensity,
            heroEntrance: draftRow.heroEntrance,
            servicesPreset: draftRow.servicesPreset,
            servicesStagger: draftRow.servicesStagger,
            statementPreset: draftRow.statementPreset,
            portfolioPreset: draftRow.portfolioPreset,
            portfolioStagger: draftRow.portfolioStagger,
            studioPreset: draftRow.studioPreset,
            processPreset: draftRow.processPreset,
            processStagger: draftRow.processStagger,
          }}
        />
      )}

      <div className="admin-form-section">
        <h2>Publish</h2>
        <p className="admin-form-note">
          Publishing makes the saved draft above live on the public homepage immediately. Save your draft and preview
          it first.
        </p>
        <PublishMotionButton />
      </div>
    </div>
  );
}
