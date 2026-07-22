import { services } from "@/data/services";
import { servicesIntro } from "@/data/homepage";
import { sectionAnchors } from "@/config/sections";
import SectionHeading from "./ui/SectionHeading";
import ServiceCard from "./ui/ServiceCard";

export default function Services() {
  return (
    <section className="services section" id={sectionAnchors.services}>
      <SectionHeading
        wrapperClassName="section-top"
        kicker={servicesIntro.kicker}
        heading={servicesIntro.heading}
      />
      <div className="services-list">
        {services.map((service) => (
          <ServiceCard key={service.number} service={service} />
        ))}
      </div>
    </section>
  );
}
