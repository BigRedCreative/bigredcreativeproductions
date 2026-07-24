import Image from "next/image";
import { sectionAnchors } from "@/config/sections";
import { footer } from "@/data/homepage";
import { getSiteSettings } from "@/server/queries/site-content";

// Database-backed as of Phase 14 — logo path, email, legal name, and
// tagline now come from the admin-editable site_settings table, field-
// level-fallback-safe against src/config/site.ts. backToTopLabel stays a
// static UI label from homepage.ts — not admin-editable content.
export default async function Footer() {
  const settings = await getSiteSettings();

  return (
    <footer>
      <Image
        src={settings.logoWhiteSrc}
        alt={settings.siteName}
        width={1600}
        height={500}
        unoptimized
      />
      <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
      <div className="footer-bottom">
        <span>{settings.legalName}</span>
        <span>{settings.tagline}</span>
        <a href={`#${sectionAnchors.hero}`}>{footer.backToTopLabel}</a>
      </div>
    </footer>
  );
}
