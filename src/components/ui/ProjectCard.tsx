import Link from "next/link";
import type { Project } from "@/data/projects";
import { projectHref } from "@/data/projects";
import Badge from "./Badge";

type ProjectCardProps = {
  project: Project;
  index: number;
};

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const [firstWord, ...restWords] = project.title.split(" ");
  return (
    <article className={`project-card ${project.className}`}>
      <Link
        href={projectHref(project.slug)}
        className="project-card-link"
        aria-label={`View ${project.title} project`}
      />
      <div className="project-topline">
        <span className="project-index">0{index + 1}</span>
        <Badge className="project-stamp">{project.stamp}</Badge>
      </div>
      <div className="project-art">
        <span>{firstWord}</span>
        <b>{restWords.join(" ")}</b>
      </div>
      <div className="project-info">
        <div>
          <p>{project.services.join(" · ")}</p>
          <h3>{project.title}</h3>
        </div>
        <p>{project.summary}</p>
      </div>
    </article>
  );
}
