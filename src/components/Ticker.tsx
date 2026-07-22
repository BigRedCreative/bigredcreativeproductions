import { ticker } from "@/data/homepage";

export default function Ticker() {
  const sequence = `${ticker.items.join(` ${ticker.separator} `)} ${ticker.separator}`;
  return (
    <div className="ticker" aria-hidden="true">
      <div>
        {sequence} {sequence}
      </div>
    </div>
  );
}
