import Link from "next/link";
import type { Project } from "@/data/projects";
import { projectHref } from "@/data/projects";

type ProjectNavigationProps = {
  previous?: Project;
  next?: Project;
};

export default function ProjectNavigation({ previous, next }: ProjectNavigationProps) {
  if (!previous && !next) {
    return null;
  }
  return (
    <nav className="project-nav section" aria-label="Project navigation">
      {previous && (
        <Link
          href={projectHref(previous.slug)}
          className="project-nav-link project-nav-prev"
          aria-label={`Previous project: ${previous.title}`}
        >
          <span>← Previous</span>
          <b>{previous.shortTitle}</b>
        </Link>
      )}
      {next && (
        <Link
          href={projectHref(next.slug)}
          className="project-nav-link project-nav-next"
          aria-label={`Next project: ${next.title}`}
        >
          <span>Next →</span>
          <b>{next.shortTitle}</b>
        </Link>
      )}
    </nav>
  );
}
