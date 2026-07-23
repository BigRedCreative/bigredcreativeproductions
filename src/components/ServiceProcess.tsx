import type { Service } from "@/data/services";
import SectionHeading from "./ui/SectionHeading";

type ServiceProcessProps = {
  service: Service;
};

export default function ServiceProcess({ service }: ServiceProcessProps) {
  return (
    <section className="process section">
      <SectionHeading kicker="Process" heading="How it works" />
      <div className="process-grid">
        {service.process.map((step, index) => (
          <article key={step.title}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
