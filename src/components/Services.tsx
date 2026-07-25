import { getFeaturedServices } from "@/server/queries/services";
import { servicesIntro } from "@/data/homepage";
import { sectionAnchors } from "@/config/sections";
import SectionHeading from "./ui/SectionHeading";
import ServiceCard from "./ui/ServiceCard";

export default async function Services() {
  const featuredServices = await getFeaturedServices();
  return (
    <section className="services section" id={sectionAnchors.services}>
      <SectionHeading
        wrapperClassName="section-top"
        kicker={servicesIntro.kicker}
        heading={servicesIntro.heading}
      />
      <div className="services-list">
        {featuredServices.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </section>
  );
}
