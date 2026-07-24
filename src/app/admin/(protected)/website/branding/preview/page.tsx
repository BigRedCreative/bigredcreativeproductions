import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";

// Admin-authenticated preview only — reachable exclusively through /admin
// (this route sits inside the protected route group, so requireAdminUser()
// already ran in the layout). Reuses the EXACT same public components the
// live site renders (Header, Hero, ContactForm — the last one specifically
// because its submit button is one of the three tokenized transactional
// buttons — and Footer), passed brandVariant="draft" and wrapped in
// <BrandTokens variant="draft"> so what's shown here is genuinely what
// publishing will make live, not a reconstruction. No public secret-token
// preview exists or is planned, matching the same principle already
// established by the Phase 13 product preview and Phase 14 homepage
// preview.
export default function AdminBrandingPreviewPage() {
  return (
    <div>
      <div className="admin-preview-banner">
        <Link href="/admin/website/branding">← Back to admin</Link>
        <span>Previewing draft brand colors and logos — not a public URL</span>
      </div>
      <BrandTokens variant="draft">
        <main>
          <Header brandVariant="draft" />
          <Hero />
          <ContactForm />
          <Footer brandVariant="draft" />
        </main>
      </BrandTokens>
    </div>
  );
}
