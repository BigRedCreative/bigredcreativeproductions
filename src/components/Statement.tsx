import Badge from "./ui/Badge";

export default function Statement() {
  return (
    <section className="statement grain">
      <Badge as="div" className="statement-label">
        NO GENERIC BRANDS
      </Badge>
      <span className="kicker">Our point of view</span>
      <h2>
        Clean strategy.
        <br />
        Raw energy.
      </h2>
      <p>
        High-end creative direction with the confidence, rhythm and visual
        punch of hip-hop culture.
      </p>
    </section>
  );
}
