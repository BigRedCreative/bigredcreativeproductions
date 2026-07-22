import Image from "next/image";
import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { footer } from "@/data/homepage";

export default function Footer() {
  return (
    <footer>
      <Image
        src="/brand/logo-white.svg"
        alt={siteConfig.name}
        width={1600}
        height={500}
        unoptimized
      />
      <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
      <div className="footer-bottom">
        <span>{siteConfig.legalName}</span>
        <span>{footer.tagline}</span>
        <a href={`#${sectionAnchors.hero}`}>{footer.backToTopLabel}</a>
      </div>
    </footer>
  );
}
