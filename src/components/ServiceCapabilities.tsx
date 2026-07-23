import type { Service } from "@/data/services";
import SectionHeading from "./ui/SectionHeading";

type ServiceCapabilitiesProps = {
  service: Service;
};

export default function ServiceCapabilities({ service }: ServiceCapabilitiesProps) {
  return (
    <section className="section">
      <SectionHeading wrapperClassName="section-top" kicker="Capabilities" heading="What this service covers" />
      <div className="tags">
        {service.capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>
    </section>
  );
}
