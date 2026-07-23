import { sectionAnchors } from "@/config/sections";
import type { Service } from "@/data/services";
import Button from "./ui/Button";

type ServiceCTAProps = {
  service: Service;
};

export default function ServiceCTA({ service }: ServiceCTAProps) {
  return (
    <section className="service-cta">
      <h2>Ready to start?</h2>
      <p>Tell us about your project and where you need creative support.</p>
      <Button href={`/#${sectionAnchors.contact}`} className="round-button" ariaLabel={service.ctaLabel}>
        <span>{service.ctaLabel}</span>
        <b>↘</b>
      </Button>
    </section>
  );
}
