import Image from "next/image";
import type { Project } from "@/data/projects";

type ProjectHeroProps = {
  project: Project;
};

export default function ProjectHero({ project }: ProjectHeroProps) {
  const [firstWord, ...restWords] = project.title.split(" ");
  return (
    <section className="project-hero">
      <div>
        <span className="kicker">{project.category}</span>
        <h1>{project.title}</h1>
        <div className="tags">
          {project.services.map((service) => (
            <span key={service}>{service}</span>
          ))}
        </div>
        <p className="project-hero-summary">{project.summary}</p>
      </div>
      <div className={`project-hero-media ${project.className}`}>
        {project.heroImage ? (
          <Image
            src={project.heroImage.src}
            alt={project.heroImage.alt}
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
