import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/data/services";
import { serviceHref } from "@/data/services";
import Badge from "./Badge";

type ServiceCardProps = {
  service: Service;
};

// Phase 22 — still one oversized numbered ROW (never converted to a
// card, per explicit direction), now with a real-image reveal. For a
// video-type heroImage, only its resolved poster is used here — this is
// a small, purely decorative reveal, not a video player, so no <video>
// element (with its own real, keyboard-focusable controls) is ever
// rendered into a region that's only conditionally visible; a service
// whose video has no poster configured simply renders no media, rather
// than a broken non-image src. Desktop reveals on hover/focus-within
// (see globals.css's `@media (hover:hover)` gate); touch/mobile shows it
// unconditionally, per the approved "equally strong non-hover
// interaction" requirement.
export default function ServiceCard({ service }: ServiceCardProps) {
  const media = service.heroImage;
  const imageSrc = media ? (media.type === "video" ? media.posterSrc : media.src) : undefined;

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
      {imageSrc && (
        <div className="service-row-media" aria-hidden="true">
          <Image src={imageSrc} alt="" fill sizes="(max-width: 900px) 92vw, 320px" />
        </div>
      )}
    </article>
  );
}
