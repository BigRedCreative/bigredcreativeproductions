import Image from "next/image";
import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { primaryNav, headerCta } from "@/data/navigation";
import Button from "./ui/Button";
import CartNavLink from "./CartNavLink";

export default function Header() {
  return (
    <header className="site-header">
      <a className="logo" href={`#${sectionAnchors.hero}`} aria-label={`${siteConfig.name} home`}>
        <Image
          src="/brand/logo-horizontal.svg"
          alt={siteConfig.name}
          width={1600}
          height={500}
          priority
          unoptimized
        />
      </a>
      <nav aria-label="Primary navigation">
        {primaryNav.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
        <CartNavLink />
      </nav>
      <Button href={headerCta.href} className="header-cta">
        {headerCta.label}
      </Button>
    </header>
  );
}
