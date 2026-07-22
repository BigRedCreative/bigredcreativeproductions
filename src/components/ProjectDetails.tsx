import type { Project } from "@/data/projects";

type ProjectDetailsProps = {
  project: Project;
};

export default function ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <section className="studio section">
      <div className="studio-copy">
        <h2>Project overview</h2>
        <p>{project.fullDescription}</p>
      </div>
      <dl className="project-meta">
        <div>
          <dt>Category</dt>
          <dd>{project.category}</dd>
        </div>
        <div>
          <dt>Services</dt>
          <dd>{project.services.join(", ")}</dd>
        </div>
        {project.client && (
          <div>
            <dt>Client</dt>
            <dd>{project.client}</dd>
          </div>
        )}
        {project.year && (
          <div>
            <dt>Year</dt>
            <dd>{project.year}</dd>
          </div>
        )}
        {project.credits && project.credits.length > 0 && (
          <div>
            <dt>Credits</dt>
            <dd>
              {project.credits.map((credit) => `${credit.role}: ${credit.name}`).join(", ")}
            </dd>
          </div>
        )}
        {project.externalLink && (
          <div>
            <dt>Link</dt>
            <dd>
              <a href={project.externalLink.url} target="_blank" rel="noreferrer">
                {project.externalLink.label}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
