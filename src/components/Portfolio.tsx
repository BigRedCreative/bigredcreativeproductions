import { getFeaturedProjects } from "@/server/queries/portfolio";
import { getPublishedMotionSettings, getDraftMotionSettings } from "@/server/queries/motion";
import { portfolioIntro } from "@/data/homepage";
import { sectionAnchors } from "@/config/sections";
import SectionHeading from "./ui/SectionHeading";
import PortfolioGrid from "./PortfolioGrid";

type PortfolioProps = {
  motionVariant?: "published" | "draft";
};

export default async function Portfolio({ motionVariant = "published" }: PortfolioProps = {}) {
  const [featuredProjects, motion] = await Promise.all([
    getFeaturedProjects(),
    motionVariant === "draft" ? getDraftMotionSettings() : getPublishedMotionSettings(),
  ]);
  return (
    <section className="work section" id={sectionAnchors.portfolio}>
      <SectionHeading
        wrapperClassName="section-top"
        kicker={portfolioIntro.kicker}
        heading={portfolioIntro.heading}
      />
      <PortfolioGrid
        projects={featuredProjects}
        preset={motion.portfolioPreset}
        intensity={motion.intensity}
        stagger={motion.portfolioStagger}
      />
    </section>
  );
}
