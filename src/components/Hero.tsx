import Image from "next/image";
import { hero } from "@/data/homepage";
import { getPublishedHeroContent, getSiteSettings } from "@/server/queries/site-content";
import type { HeroContent } from "@/server/queries/site-content";
import { getPublishedMotionSettings, getDraftMotionSettings } from "@/server/queries/motion";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import HeroMotionShell from "./HeroMotionShell";
import VideoMedia from "./VideoMedia";

type HeroProps = {
  // Admin-only override — the draft-preview page passes the DRAFT row's
  // content directly so it can reuse this exact component (same principle
  // as Phase 13's product preview: what you see is genuinely what the
  // public page will render, not a reconstruction). Omitted everywhere
  // else, which reads the live PUBLISHED row as before.
  content?: HeroContent;
  // Phase 19D-1 — "published" (default) everywhere public; "draft" is
  // used only by /admin/website/motion/preview, mirroring Header/Footer's
  // existing brandVariant prop pattern exactly.
  motionVariant?: "published" | "draft";
};

// Database-backed as of Phase 14 — every rendered field below now comes
// from homepage_content's PUBLISHED row (field-level-fallback-safe against
// src/data/homepage.ts's hero export), except cta.icon/ariaLabel, which
// stay code-owned presentational/accessibility details, not part of the
// admin-editable content set. No hero image or secondary CTA is rendered
// this phase — those columns exist but are reserved, per Phase 14 scope.
export default async function Hero({ content: contentOverride, motionVariant = "published" }: HeroProps = {}) {
  const [content, settings, motion] = await Promise.all([
    contentOverride ? Promise.resolve(contentOverride) : getPublishedHeroContent(),
    getSiteSettings(),
    motionVariant === "draft" ? getDraftMotionSettings() : getPublishedMotionSettings(),
  ]);

  return (
    <HeroMotionShell heroEntrance={motion.heroEntrance} intensity={motion.intensity}>
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

      {/* Phase 19D-2 — inline cinematic hero media. Bounded, reserved
          aspect-ratio box so its presence/absence never shifts the
          typography above, which stays the visual priority (max-width
          well below full-bleed). VideoMedia is reused completely
          unmodified — no autoplay, no forced mute/loop, controls always
          visible, playback always user-initiated. */}
      {content.heroMediaMode === "video" && content.heroVideoSrc ? (
        <div className="hero-media">
          <VideoMedia src={content.heroVideoSrc} alt={content.heroImageAlt ?? ""} posterSrc={content.heroPosterSrc ?? undefined} />
        </div>
      ) : content.heroMediaMode === "image" && content.heroImageSrc ? (
        <div className="hero-media">
          <Image src={content.heroImageSrc} alt={content.heroImageAlt ?? ""} fill sizes="(max-width: 900px) 100vw, 640px" />
        </div>
      ) : null}
    </HeroMotionShell>
  );
}
