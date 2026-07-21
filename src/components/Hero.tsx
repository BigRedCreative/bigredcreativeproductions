import { siteConfig } from "@/config/site";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

export default function Hero() {
  return (
    <section className="hero grain" id="top">
      <Badge as="div" className="hero-sticker sticker-one">
        BUILT DIFFERENT
      </Badge>
      <Badge as="div" className="hero-sticker sticker-two">
        EST. MICHIGAN
      </Badge>
      <div className="hero-meta">
        <span>Independent creative production company</span>
        <span>{siteConfig.location}</span>
      </div>

      <h1>
        We make brands
        <span>move culture.</span>
      </h1>

      <div className="hero-tagline">BRANDING · PRINT · PROMOTIONS · EVENTS</div>

      <div className="hero-foot">
        <p>
          Strategy, design, print, promotion and event execution with premium
          polish, hip-hop energy and enough grit to be remembered.
        </p>
        <Button href="#work" className="round-button" ariaLabel="View selected work">
          <span>See the work</span>
          <b>↘</b>
        </Button>
      </div>
    </section>
  );
}
