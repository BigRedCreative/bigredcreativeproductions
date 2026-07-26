"use client";

import type { ReactNode } from "react";
import { useMotionEntrance } from "./MotionSection";
import type { HeroEntrance, MotionIntensity } from "@/data/motion";
import { sectionAnchors } from "@/config/sections";

type HeroMotionShellProps = {
  heroEntrance: HeroEntrance;
  intensity: MotionIntensity;
  children: ReactNode;
};

// Hero is the one section where MotionSection's convenience wrapper <div>
// would be actively harmful — .hero relies on its DIRECT children
// (.hero-sticker badges, .hero-meta, h1, .hero-tagline, .hero-foot) for
// its display:flex;flex-direction:column;justify-content:space-between
// layout. This shell attaches the motion ref/data-attributes directly to
// the real <section className="hero grain"> element instead, so Hero's
// existing DOM structure — and every existing selector that depends on
// it — is completely unchanged. Hero.tsx itself stays an async server
// component (it fetches homepage_content/site_settings from Neon); this
// thin client shell is the one place it needs client-side observation.
export default function HeroMotionShell({ heroEntrance, intensity, children }: HeroMotionShellProps) {
  const { ref, visible } = useMotionEntrance<HTMLElement>(heroEntrance);

  return (
    <section
      className="hero grain"
      id={sectionAnchors.hero}
      ref={ref}
      data-motion={heroEntrance}
      data-motion-intensity={intensity}
      data-motion-visible={visible ? "true" : undefined}
    >
      {children}
    </section>
  );
}
