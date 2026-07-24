import Image from "next/image";
import { sectionAnchors } from "@/config/sections";
import { getSiteSettings, getNavigation } from "@/server/queries/site-content";
import { getPublishedBrandTokens, getDraftBrandTokens } from "@/server/queries/brand";
import Button from "./ui/Button";
import CartNavLink from "./CartNavLink";

type HeaderProps = {
  // "published" (default) everywhere public. "draft" is used only by the
  // authenticated brand preview page, mirroring the same override-prop
  // pattern Hero.tsx already established in Phase 14.
  brandVariant?: "published" | "draft";
};

// Database-backed as of Phase 14 (was a static import) — logo path and nav
// links now come from the admin-editable site_settings/navigation_items
// tables, both field/row-level-fallback-safe against src/config/site.ts
// and src/data/navigation.ts so this can never render broken/blank. As of
// Phase 16, the rendered logo comes from getPublishedBrandTokens()
// (resolved: a Media Library selection if the published brand row has
// one, otherwise site_settings.logoHorizontalSrc unchanged) rather than
// site_settings directly, so a published "Choose Logo" selection actually
// reaches the public header.
export default async function Header({ brandVariant = "published" }: HeaderProps = {}) {
  const [settings, nav, brand] = await Promise.all([
    getSiteSettings(),
    getNavigation(),
    brandVariant === "draft" ? getDraftBrandTokens() : getPublishedBrandTokens(),
  ]);

  return (
    <header className="site-header">
      <a className="logo" href={`#${sectionAnchors.hero}`} aria-label={`${settings.siteName} home`}>
        <Image
          src={brand.logoHorizontalSrc}
          alt={settings.siteName}
          width={1600}
          height={500}
          priority
          unoptimized
        />
      </a>
      <nav aria-label="Primary navigation">
        {nav.primary.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
        <CartNavLink />
      </nav>
      <Button href={nav.headerCta.href} className="header-cta">
        {nav.headerCta.label}
      </Button>
    </header>
  );
}
