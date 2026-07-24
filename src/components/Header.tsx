import Image from "next/image";
import { sectionAnchors } from "@/config/sections";
import { getSiteSettings, getNavigation } from "@/server/queries/site-content";
import Button from "./ui/Button";
import CartNavLink from "./CartNavLink";

// Database-backed as of Phase 14 (was a static import) — logo path and nav
// links now come from the admin-editable site_settings/navigation_items
// tables, both field/row-level-fallback-safe against src/config/site.ts
// and src/data/navigation.ts so this can never render broken/blank.
export default async function Header() {
  const [settings, nav] = await Promise.all([getSiteSettings(), getNavigation()]);

  return (
    <header className="site-header">
      <a className="logo" href={`#${sectionAnchors.hero}`} aria-label={`${settings.siteName} home`}>
        <Image
          src={settings.logoHorizontalSrc}
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
