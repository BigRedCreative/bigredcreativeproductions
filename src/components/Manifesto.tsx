import { manifesto } from "@/data/homepage";
import { getPublishedMotionSettings } from "@/server/queries/motion";
import MotionSection from "./MotionSection";

// Phase 22 — Manifesto gains a scroll-triggered reveal using the EXISTING
// motion system's own "reveal" preset (already fully styled in
// globals.css, already reduced-motion-safe by construction), applied
// with a FIXED, hardcoded preset rather than a new admin-configurable
// motion_settings column — Manifesto motion was explicitly left out of
// the Phase 19D-1 admin system by design, and this phase's own
// regression boundary excludes any database schema change, so this
// stays a code-owned choice, not a new CMS field. Only `intensity`
// (already a real, existing published-row read) is reused, so the
// reveal's distance/duration still matches whatever the rest of the
// page's motion feels like. No draft-preview variant — Manifesto was
// never part of the admin motion-preview flow and still isn't.
export default async function Manifesto() {
  const motion = await getPublishedMotionSettings();
  return (
    <section className="manifesto">
      <MotionSection preset="reveal" intensity={motion.intensity} className="manifesto-inner">
        <div className="kicker">{manifesto.kicker}</div>
        <p>{manifesto.copy}</p>
      </MotionSection>
    </section>
  );
}
