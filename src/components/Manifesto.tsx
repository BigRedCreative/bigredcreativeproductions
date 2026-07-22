import { manifesto } from "@/data/homepage";

export default function Manifesto() {
  return (
    <section className="manifesto">
      <div className="kicker">{manifesto.kicker}</div>
      <p>{manifesto.copy}</p>
    </section>
  );
}
