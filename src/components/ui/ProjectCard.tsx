import type { Project } from "@/data/projects";
import Badge from "./Badge";

type ProjectCardProps = {
  project: Project;
  index: number;
};

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const [firstWord, ...restWords] = project.title.split(" ");
  return (
    <article className={`project-card ${project.className}`}>
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
          <p>{project.type}</p>
          <h3>{project.title}</h3>
        </div>
        <p>{project.copy}</p>
      </div>
    </article>
  );
}
