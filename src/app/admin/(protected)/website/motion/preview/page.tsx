import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import Manifesto from "@/components/Manifesto";
import Services from "@/components/Services";
import Statement from "@/components/Statement";
import Portfolio from "@/components/Portfolio";
import Studio from "@/components/Studio";
import Process from "@/components/Process";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";

// Admin-authenticated preview only — reachable exclusively through /admin
// (this route sits inside the protected route group, so requireAdminUser()
// already ran in the layout). Reuses the EXACT same real homepage
// components /page.tsx renders, in the same order — not a
// reconstruction. Only the six motion-aware sections (Hero, Services,
// Statement, Portfolio, Studio, Process) receive motionVariant="draft";
// everything else (Header, Ticker, Manifesto, Contact, Footer) renders
// its normal, current PUBLISHED content — this page previews a motion
// change, not a content or brand change, so nothing else has a reason to
// show draft state. BrandTokens stays on "published" (its default) for
// the identical reason. Viewing this page never alters public settings —
// it only reads getDraftMotionSettings(), never writes anything.
export default function AdminMotionPreviewPage() {
  return (
    <div>
      <div className="admin-preview-banner">
        <Link href="/admin/website/motion">← Back to admin</Link>
        <span>Previewing draft motion settings — not a public URL</span>
      </div>
      <BrandTokens>
        <main>
          <Header />
          <Hero motionVariant="draft" />
          <Ticker />
          <Manifesto />
          <Services motionVariant="draft" />
          <Statement motionVariant="draft" />
          <Portfolio motionVariant="draft" />
          <Studio motionVariant="draft" />
          <Process motionVariant="draft" />
          <ContactForm />
          <Footer />
        </main>
      </BrandTokens>
    </div>
  );
}
