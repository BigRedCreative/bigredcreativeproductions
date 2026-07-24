import Link from "next/link";
import { getHeroContentRowForAdmin } from "@/server/queries/site-content";
import HeroContentForm from "@/components/admin/HeroContentForm";
import PublishHeroButton from "@/components/admin/PublishHeroButton";

export default async function AdminWebsiteHomepagePage() {
  const [draftRow, publishedRow] = await Promise.all([
    getHeroContentRowForAdmin("draft"),
    getHeroContentRowForAdmin("published"),
  ]);

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
