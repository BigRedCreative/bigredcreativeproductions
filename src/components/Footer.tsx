import Image from "next/image";
import { sectionAnchors } from "@/config/sections";
import { footer } from "@/data/homepage";
import { getSiteSettings } from "@/server/queries/site-content";
import { getPublishedBrandTokens, getDraftBrandTokens } from "@/server/queries/brand";

type FooterProps = {
  brandVariant?: "published" | "draft";
};

// Database-backed as of Phase 14 — email, legal name, and tagline come
// from the admin-editable site_settings table, field-level-fallback-safe
// against src/config/site.ts. As of Phase 16, the rendered logo comes from
// getPublishedBrandTokens() (resolved: a Media Library selection if the
// published brand row has one, otherwise site_settings.logoWhiteSrc
// unchanged) — same reasoning as Header.tsx. backToTopLabel stays a static
// UI label from homepage.ts — not admin-editable content.
export default async function Footer({ brandVariant = "published" }: FooterProps = {}) {
  const [settings, brand] = await Promise.all([
    getSiteSettings(),
    brandVariant === "draft" ? getDraftBrandTokens() : getPublishedBrandTokens(),
  ]);

  return (
    <footer>
      <Image
        src={brand.logoWhiteSrc}
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
