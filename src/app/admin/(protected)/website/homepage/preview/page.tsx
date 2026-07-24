import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { getHeroContentRowForAdmin } from "@/server/queries/site-content";

// Admin-authenticated preview only — reachable exclusively through /admin
// (this route sits inside the protected route group, so requireAdminUser()
// already ran in the layout). Deliberately reuses the EXACT same public
// Hero component the homepage renders, passed the DRAFT row's content via
// its optional override prop — what you see here is genuinely what
// publishing will make live, not a reconstruction of it. No public
// secret-token preview exists or is planned, matching the same principle
// already established by the Phase 13 product preview.
export default async function AdminWebsiteHomepagePreviewPage() {
  const draftRow = await getHeroContentRowForAdmin("draft");

  return (
    <div>
      <div className="admin-preview-banner">
        <Link href="/admin/website/homepage">← Back to admin</Link>
        <span>Previewing draft homepage content — not a public URL</span>
      </div>
      <main>
        <Header />
        {draftRow && (
          <Hero
            content={{
              badgePrimary: draftRow.badgePrimary,
              badgeSecondary: draftRow.badgeSecondary,
              eyebrow: draftRow.eyebrow,
              headlineLead: draftRow.headlineLead,
              headlineAccent: draftRow.headlineAccent,
              tagline: draftRow.tagline,
              supportingCopy: draftRow.supportingCopy,
              ctaLabel: draftRow.ctaLabel,
              ctaHref: draftRow.ctaHref,
              heroImageSrc: draftRow.heroImageSrc,
              heroImageAlt: draftRow.heroImageAlt,
              secondaryCtaLabel: draftRow.secondaryCtaLabel,
              secondaryCtaHref: draftRow.secondaryCtaHref,
            }}
          />
        )}
        <Footer />
      </main>
    </div>
  );
}
