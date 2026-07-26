import { getFeaturedServices } from "@/server/queries/services";
import { getPublishedMotionSettings, getDraftMotionSettings } from "@/server/queries/motion";
import { servicesIntro } from "@/data/homepage";
import { sectionAnchors } from "@/config/sections";
import SectionHeading from "./ui/SectionHeading";
import ServiceCard from "./ui/ServiceCard";
import MotionSection from "./MotionSection";

type ServicesProps = {
  motionVariant?: "published" | "draft";
};

export default async function Services({ motionVariant = "published" }: ServicesProps = {}) {
  const [featuredServices, motion] = await Promise.all([
    getFeaturedServices(),
    motionVariant === "draft" ? getDraftMotionSettings() : getPublishedMotionSettings(),
  ]);
  return (
    <section className="services section" id={sectionAnchors.services}>
      <SectionHeading
        wrapperClassName="section-top"
        kicker={servicesIntro.kicker}
        heading={servicesIntro.heading}
      />
      <MotionSection preset={motion.servicesPreset} intensity={motion.intensity} stagger={motion.servicesStagger} className="services-list">
        {featuredServices.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </MotionSection>
    </section>
  );
}
