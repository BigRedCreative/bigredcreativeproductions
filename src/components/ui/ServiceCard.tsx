import type { Service } from "@/data/services";
import Badge from "./Badge";

type ServiceCardProps = {
  service: Service;
};

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="service-row">
      <span className="service-number">{service.number}</span>
      <h3>{service.title}</h3>
      <p>{service.text}</p>
      <div className="tags">
        {service.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </article>
  );
}
