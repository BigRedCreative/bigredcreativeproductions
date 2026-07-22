import { siteConfig } from "@/config/site";
import SectionHeading from "./ui/SectionHeading";

export default function Studio() {
  return (
    <section className="studio section" id="studio">
      <SectionHeading
        wrapperClassName="studio-title"
        kicker="The studio"
        heading="One team. One vision. Every touchpoint connected."
      />
      <div className="studio-copy">
        <p>
          {siteConfig.name} works with entrepreneurs, artists, product
          brands, venues and event organizers that need more than isolated
          design files.
        </p>
        <p>
          We bring brand identity, physical production, campaign thinking and
          live-event creative under one roof so the whole experience hits
          with one voice.
        </p>
        <div className="principles">
          <span>Bold, never reckless.</span>
          <span>Urban, never cliché.</span>
          <span>Professional, never boring.</span>
        </div>
      </div>
    </section>
  );
}
