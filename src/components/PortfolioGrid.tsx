"use client";

import { useMemo, useState } from "react";
import type { Project, ProjectCategory } from "@/data/projects";
import ProjectCard from "./ui/ProjectCard";

type PortfolioGridProps = {
  projects: Project[];
};

const ALL_FILTER = "All" as const;
type FilterValue = ProjectCategory | typeof ALL_FILTER;

export default function PortfolioGrid({ projects }: PortfolioGridProps) {
  const categories = useMemo(() => {
    const unique: ProjectCategory[] = [];
    for (const project of projects) {
      if (!unique.includes(project.category)) {
        unique.push(project.category);
      }
    }
    return unique;
  }, [projects]);

  const [selected, setSelected] = useState<FilterValue>(ALL_FILTER);

  const filteredProjects =
    selected === ALL_FILTER
      ? projects
      : projects.filter((project) => project.category === selected);

  return (
    <>
      {categories.length > 1 && (
        <div className="portfolio-filters" role="group" aria-label="Filter projects by category">
          <button
            type="button"
            className="portfolio-filter"
            aria-pressed={selected === ALL_FILTER}
            onClick={() => setSelected(ALL_FILTER)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="portfolio-filter"
              aria-pressed={selected === category}
              onClick={() => setSelected(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      <div className="project-grid">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} index={index} />
          ))
        ) : (
          <p className="portfolio-empty">No projects in this category yet.</p>
        )}
      </div>
    </>
  );
}
