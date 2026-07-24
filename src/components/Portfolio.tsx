import { getFeaturedProjects } from "@/server/queries/portfolio";
import { portfolioIntro } from "@/data/homepage";
import { sectionAnchors } from "@/config/sections";
import SectionHeading from "./ui/SectionHeading";
import PortfolioGrid from "./PortfolioGrid";

export default async function Portfolio() {
  const featuredProjects = await getFeaturedProjects();
  return (
    <section className="work section" id={sectionAnchors.portfolio}>
      <SectionHeading
        wrapperClassName="section-top"
        kicker={portfolioIntro.kicker}
        heading={portfolioIntro.heading}
      />
      <PortfolioGrid projects={featuredProjects} />
    </section>
  );
}
