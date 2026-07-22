import { statement } from "@/data/homepage";
import Badge from "./ui/Badge";

export default function Statement() {
  return (
    <section className="statement grain">
      <Badge as="div" className="statement-label">
        {statement.label}
      </Badge>
      <span className="kicker">{statement.kicker}</span>
      <h2>{statement.headlineLines[0]}<br />{statement.headlineLines[1]}</h2>
      <p>{statement.copy}</p>
    </section>
  );
}
