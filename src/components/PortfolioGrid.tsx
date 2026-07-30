"use client";

import { useMemo, useState } from "react";
import type { Project, ProjectCategory } from "@/data/projects";
import type { MotionPreset, MotionIntensity } from "@/data/motion";
import { useMotionEntrance } from "./MotionSection";
import ProjectCard from "./ui/ProjectCard";

type PortfolioGridProps = {
  projects: Project[];
  preset: MotionPreset;
  intensity: MotionIntensity;
  stagger: boolean;
};

const ALL_FILTER = "All" as const;
type FilterValue = ProjectCategory | typeof ALL_FILTER;

export default function PortfolioGrid({ projects, preset, intensity, stagger }: PortfolioGridProps) {
  // Already a client component (for filtering), so it attaches the motion
  // hook directly to its own .project-grid div rather than going through
  // MotionSection's wrapper — one fewer DOM node, same mechanism.
  const { ref: motionRef, visible: motionVisible } = useMotionEntrance<HTMLDivElement>(preset);
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
      <div
        ref={motionRef}
        className="project-grid"
        {...(stagger ? { "data-motion-container": preset } : { "data-motion": preset })}
        data-motion-intensity={intensity}
        data-motion-visible={motionVisible ? "true" : undefined}
      >
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} index={index} featured={index === 0} />
          ))
        ) : (
          <p className="portfolio-empty">No projects in this category yet.</p>
        )}
      </div>
    </>
  );
}
