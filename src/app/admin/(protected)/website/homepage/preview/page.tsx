import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { getDraftHeroContent } from "@/server/queries/site-content";

// Admin-authenticated preview only — reachable exclusively through /admin
// (this route sits inside the protected route group, so requireAdminUser()
// already ran in the layout). Deliberately reuses the EXACT same public
// Hero component the homepage renders, passed the DRAFT row's content via
// its optional override prop — what you see here is genuinely what
// publishing will make live, not a reconstruction of it. No public
// secret-token preview exists or is planned, matching the same principle
// already established by the Phase 13 product preview.
//
// Phase 19D-2 — now calls getDraftHeroContent() (a real, resolved read —
// including hero media/poster) instead of hand-building an unresolved
// override object from the raw draft row, and passes motionVariant="draft"
// to Hero — fixing a real, pre-existing inconsistency this exact file
// needed to change for anyway: this preview previously always rendered
// with PUBLISHED motion settings, unlike /admin/website/motion/preview,
// which already correctly used draft motion. The private preview now
// shows draft content + draft hero media + draft motion together, so it
// genuinely represents what Publish will make live. The public homepage
// is untouched by this change — Hero's motionVariant still defaults to
// "published" everywhere else.
export default async function AdminWebsiteHomepagePreviewPage() {
  const content = await getDraftHeroContent();

  return (
    <div>
      <div className="admin-preview-banner">
        <Link href="/admin/website/homepage">← Back to admin</Link>
        <span>Previewing draft homepage content — not a public URL</span>
      </div>
      <main>
        <Header />
        <Hero content={content} motionVariant="draft" />
        <Footer />
      </main>
    </div>
  );
}
