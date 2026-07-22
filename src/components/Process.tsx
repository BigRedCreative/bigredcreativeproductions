import { process } from "@/data/homepage";

export default function Process() {
  return (
    <section className="process section">
      <span className="kicker">{process.kicker}</span>
      <div className="process-grid">
        {process.steps.map((step) => (
          <article key={step.number}>
            <b>{step.number}</b>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
