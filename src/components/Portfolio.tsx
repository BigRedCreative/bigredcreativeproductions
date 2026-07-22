import { getFeaturedProjects } from "@/data/projects";
import { portfolioIntro } from "@/data/homepage";
import { sectionAnchors } from "@/config/sections";
import SectionHeading from "./ui/SectionHeading";
import ProjectCard from "./ui/ProjectCard";

export default function Portfolio() {
  const featuredProjects = getFeaturedProjects();
  return (
    <section className="work section" id={sectionAnchors.portfolio}>
      <SectionHeading
        wrapperClassName="section-top"
        kicker={portfolioIntro.kicker}
        heading={portfolioIntro.heading}
      />
      <div className="project-grid">
        {featuredProjects.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
