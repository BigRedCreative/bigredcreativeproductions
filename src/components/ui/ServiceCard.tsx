import Link from "next/link";
import type { Service } from "@/data/services";
import { serviceHref } from "@/data/services";
import Badge from "./Badge";

type ServiceCardProps = {
  service: Service;
};

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="service-row">
      <Link
        href={serviceHref(service.slug)}
        className="service-row-link"
        aria-label={`View ${service.title} service`}
      />
      <span className="service-number">{service.serviceNumber}</span>
      <h3>{service.title}</h3>
      <p>{service.summary}</p>
      <div className="tags">
        {service.capabilities.slice(0, 3).map((capability) => (
          <Badge key={capability}>{capability}</Badge>
        ))}
      </div>
    </article>
  );
}
