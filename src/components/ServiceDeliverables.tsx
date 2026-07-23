import type { Service } from "@/data/services";

type ServiceDeliverablesProps = {
  service: Service;
};

export default function ServiceDeliverables({ service }: ServiceDeliverablesProps) {
  return (
    <section className="studio section">
      <div className="studio-copy">
        <h2>Service overview</h2>
        <p>{service.fullDescription}</p>
      </div>
      <div>
        <span className="kicker">Deliverables</span>
        <div className="principles">
          {service.deliverables.map((deliverable) => (
            <span key={deliverable}>{deliverable}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
