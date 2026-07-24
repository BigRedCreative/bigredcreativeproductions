import { sectionAnchors } from "@/config/sections";
import { hero } from "@/data/homepage";
import { getPublishedHeroContent, getSiteSettings } from "@/server/queries/site-content";
import type { HeroContent } from "@/server/queries/site-content";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

type HeroProps = {
  // Admin-only override — the draft-preview page passes the DRAFT row's
  // content directly so it can reuse this exact component (same principle
  // as Phase 13's product preview: what you see is genuinely what the
  // public page will render, not a reconstruction). Omitted everywhere
  // else, which reads the live PUBLISHED row as before.
  content?: HeroContent;
};

// Database-backed as of Phase 14 — every rendered field below now comes
// from homepage_content's PUBLISHED row (field-level-fallback-safe against
// src/data/homepage.ts's hero export), except cta.icon/ariaLabel, which
// stay code-owned presentational/accessibility details, not part of the
// admin-editable content set. No hero image or secondary CTA is rendered
// this phase — those columns exist but are reserved, per Phase 14 scope.
export default async function Hero({ content: contentOverride }: HeroProps = {}) {
  const [content, settings] = await Promise.all([
    contentOverride ? Promise.resolve(contentOverride) : getPublishedHeroContent(),
    getSiteSettings(),
  ]);

  return (
    <section className="hero grain" id={sectionAnchors.hero}>
      <Badge as="div" className="hero-sticker sticker-one">
        {content.badgePrimary}
      </Badge>
      <Badge as="div" className="hero-sticker sticker-two">
        {content.badgeSecondary}
      </Badge>
      <div className="hero-meta">
        <span>{content.eyebrow}</span>
        <span>{settings.location}</span>
      </div>

      <h1>{content.headlineLead}<span>{content.headlineAccent}</span></h1>

      <div className="hero-tagline">{content.tagline}</div>

      <div className="hero-foot">
        <p>{content.supportingCopy}</p>
        <Button
          href={content.ctaHref}
          className="round-button"
          ariaLabel={hero.cta.ariaLabel}
        >
          <span>{content.ctaLabel}</span>
          <b>{hero.cta.icon}</b>
        </Button>
      </div>
    </section>
  );
}
