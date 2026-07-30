"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { observeMotionElement } from "./motion-observer";
import type { MotionPreset, MotionIntensity, HeroEntrance } from "@/data/motion";

// Exported — HeroMotionShell's cursor-parallax effect reuses this exact
// check rather than a second implementation.
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Phase 19D-1 — the reusable motion entrance hook. Returns a ref to attach
// to the real DOM element that should animate, plus a plain `visible`
// boolean the caller turns into its own data-motion-visible attribute.
// Deliberately does NOT render anything itself — this is what lets
// Hero.tsx attach motion behavior directly to its own existing <section>
// (no extra wrapper div, no risk of breaking its flex/absolute-positioned
// sticker-badge layout), while MotionSection below is a thin convenience
// wrapper for the common case where an extra wrapper <div> is harmless.
//
// `preset` is typed as MotionPreset | HeroEntrance — both are already
// closed enums narrowed server-side (never free text), so the resulting
// data-motion value is always one of a small, known set of strings. This
// is the actual mechanism behind "do not derive arbitrary class names
// from unchecked DB strings": there is no code path from an arbitrary
// string to this attribute.
export function useMotionEntrance<T extends HTMLElement>(preset: MotionPreset | HeroEntrance) {
  const ref = useRef<T>(null);
  // Computed once, lazily, on first render — "none" or a reduced-motion
  // preference both start (and stay) visible with no observer ever
  // attached. typeof window guards SSR: the server and the pre-hydration
  // client render both evaluate to `preset === "none"` only, so there's
  // no hydration mismatch; the reduced-motion branch only ever resolves
  // true once real client JS runs.
  const [visible, setVisible] = useState(() => preset === "none" || prefersReducedMotion());

  useEffect(() => {
    if (preset === "none" || !ref.current || prefersReducedMotion()) return;
    return observeMotionElement(ref.current, () => setVisible(true));
  }, [preset]);

  return { ref, visible };
}

type MotionSectionProps = {
  preset: MotionPreset;
  intensity: MotionIntensity;
  // Only meaningful for the three list-shaped sections (Services,
  // Portfolio, Process) — see the stagger CSS in globals.css for the
  // fixed, non-admin-configurable per-child delay and its cap.
  stagger?: boolean;
  className?: string;
  children: ReactNode;
};

// Thin convenience wrapper for the common case: a single content block
// (Statement's copy, Studio's copy, Services' row list, Process' step
// grid) that can safely gain one extra, unstyled ancestor <div> without
// affecting layout — or, when `className` matches an existing target
// class (e.g. "services-list"), effectively BECOMES that element rather
// than wrapping it, adding no extra DOM node at all. Hero does NOT use
// this — see useMotionEntrance's own doc comment above for why; Portfolio
// (via PortfolioGrid, already a client component) calls the hook
// directly for the same reason.
export default function MotionSection({ preset, intensity, stagger = false, className, children }: MotionSectionProps) {
  const { ref, visible } = useMotionEntrance<HTMLDivElement>(preset);
  const visibleAttr = visible ? "true" : undefined;

  if (stagger) {
    return (
      <div ref={ref} className={className} data-motion-container={preset} data-motion-intensity={intensity} data-motion-visible={visibleAttr}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} data-motion={preset} data-motion-intensity={intensity} data-motion-visible={visibleAttr}>
      {children}
    </div>
  );
}
