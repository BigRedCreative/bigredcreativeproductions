import { projects } from "@/data/projects";
import SectionHeading from "./ui/SectionHeading";
import ProjectCard from "./ui/ProjectCard";

export default function Portfolio() {
  return (
    <section className="work section" id="work">
      <SectionHeading
        wrapperClassName="section-top"
        kicker="Selected work"
        heading="Made to stop the scroll and own the room."
      />
      <div className="project-grid">
        {projects.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
