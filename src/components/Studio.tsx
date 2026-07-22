import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { studio } from "@/data/homepage";
import SectionHeading from "./ui/SectionHeading";

export default function Studio() {
  return (
    <section className="studio section" id={sectionAnchors.studio}>
      <SectionHeading
        wrapperClassName="studio-title"
        kicker={studio.kicker}
        heading={studio.heading}
      />
      <div className="studio-copy">
        <p>
          {siteConfig.name} {studio.introSuffix}
        </p>
        <p>{studio.secondParagraph}</p>
        <div className="principles">
          {studio.principles.map((principle) => (
            <span key={principle}>{principle}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
