import Image from "next/image";
import type { Service } from "@/data/services";

type ServiceHeroProps = {
  service: Service;
};

export default function ServiceHero({ service }: ServiceHeroProps) {
  const [firstWord, ...restWords] = service.title.split(" ");
  return (
    <section className="project-hero">
      <div>
        <span className="kicker">Service {service.serviceNumber}</span>
        <h1>{service.title}</h1>
        <div className="tags">
          {service.capabilities.slice(0, 3).map((capability) => (
            <span key={capability}>{capability}</span>
          ))}
        </div>
        <p className="project-hero-summary">{service.summary}</p>
      </div>
      <div className="project-hero-media project-dark">
        {service.heroImage ? (
          <Image
            src={service.heroImage.src}
            alt={service.heroImage.alt}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        ) : (
          <div className="project-art">
            <span>{firstWord}</span>
            <b>{restWords.join(" ")}</b>
          </div>
        )}
      </div>
    </section>
  );
}
