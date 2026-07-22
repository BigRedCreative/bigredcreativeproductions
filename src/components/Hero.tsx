import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { hero } from "@/data/homepage";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

export default function Hero() {
  return (
    <section className="hero grain" id={sectionAnchors.hero}>
      <Badge as="div" className="hero-sticker sticker-one">
        {hero.badgePrimary}
      </Badge>
      <Badge as="div" className="hero-sticker sticker-two">
        {hero.badgeSecondary}
      </Badge>
      <div className="hero-meta">
        <span>{hero.eyebrow}</span>
        <span>{siteConfig.location}</span>
      </div>

      <h1>{hero.headlineLead}<span>{hero.headlineAccent}</span></h1>

      <div className="hero-tagline">{hero.tagline}</div>

      <div className="hero-foot">
        <p>{hero.supportingCopy}</p>
        <Button
          href={`#${sectionAnchors.portfolio}`}
          className="round-button"
          ariaLabel={hero.cta.ariaLabel}
        >
          <span>{hero.cta.label}</span>
          <b>{hero.cta.icon}</b>
        </Button>
      </div>
    </section>
  );
}
