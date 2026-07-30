"use client";

import { useEffect, type ReactNode } from "react";
import { useMotionEntrance, prefersReducedMotion } from "./MotionSection";
import type { HeroEntrance, MotionIntensity } from "@/data/motion";
import { sectionAnchors } from "@/config/sections";

type HeroMotionShellProps = {
  heroEntrance: HeroEntrance;
  intensity: MotionIntensity;
  children: ReactNode;
};

// Phase 22 — subtle desktop-only cursor-reactive depth. Deliberately NOT
// React state: a single `pointermove` listener writes the latest cursor
// position into a ref, and at most one requestAnimationFrame callback per
// frame reads that ref and writes two CSS custom properties directly onto
// the hero element via el.style.setProperty(...) — zero re-renders, zero
// per-mousemove React work. Gated on (hover:hover) and (pointer:fine) so
// it never even attaches on touch devices, and on prefers-reduced-motion
// so it never attaches when the user has asked for less motion (the CSS
// side's own @media (prefers-reduced-motion:reduce) override is the real
// guarantee — see globals.css — this is the JS-side optimization that
// avoids the listener's cost entirely, matching useMotionEntrance's own
// existing pattern one file over).
function useHeroParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (prefersReducedMotion()) return;

    let latestX = 0;
    let latestY = 0;
    let frameRequested = false;

    function applyFrame() {
      frameRequested = false;
      el!.style.setProperty("--hero-mx", latestX.toFixed(3));
      el!.style.setProperty("--hero-my", latestY.toFixed(3));
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      // Normalized -1..1 from the hero's own center — small, deliberate
      // range; the CSS side scales this down further into single-digit
      // pixel movement, never anything that competes with reading the copy.
      latestX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      latestY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      if (!frameRequested) {
        frameRequested = true;
        requestAnimationFrame(applyFrame);
      }
    }

    function handlePointerLeave() {
      latestX = 0;
      latestY = 0;
      if (!frameRequested) {
        frameRequested = true;
        requestAnimationFrame(applyFrame);
      }
    }

    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [ref]);
}

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
  useHeroParallax(ref);

  return (
    <section
      className="hero grain"
      id={sectionAnchors.hero}
      ref={ref}
      data-motion={heroEntrance}
      data-motion-intensity={intensity}
      data-motion-visible={visible ? "true" : undefined}
    >
      <div className="hero-crop-marks" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      {children}
    </section>
  );
}
