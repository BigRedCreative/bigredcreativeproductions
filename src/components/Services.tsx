import { services } from "@/data/services";
import SectionHeading from "./ui/SectionHeading";
import ServiceCard from "./ui/ServiceCard";

export default function Services() {
  return (
    <section className="services section" id="services">
      <SectionHeading
        wrapperClassName="section-top"
        kicker="What we bring"
        heading="Full-service creative. No watered-down energy."
      />
      <div className="services-list">
        {services.map((service) => (
          <ServiceCard key={service.number} service={service} />
        ))}
      </div>
    </section>
  );
}
