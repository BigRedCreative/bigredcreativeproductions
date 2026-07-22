import Image from "next/image";
import { siteConfig } from "@/config/site";

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
        <span>Branding · Print · Promotions · Events</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
