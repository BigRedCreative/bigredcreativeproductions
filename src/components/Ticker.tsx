import { ticker } from "@/data/homepage";

// Phase 22 — the kinetic capability marquee. Still a plain server
// component, no client JS: the "dual opposing tracks" effect (desktop
// only — see globals.css's own media query hiding the second row under
// 900px) is achieved with two independent CSS @keyframes animations
// running in opposite directions, nothing more. Fully decorative,
// unchanged aria-hidden="true" on the whole thing.
export default function Ticker() {
  const sequence = `${ticker.items.join(` ${ticker.separator} `)} ${ticker.separator}`;
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-row ticker-row-a">
        <div>
          {sequence} {sequence}
        </div>
      </div>
      <div className="ticker-row ticker-row-b">
        <div>
          {sequence} {sequence}
        </div>
      </div>
    </div>
  );
}
