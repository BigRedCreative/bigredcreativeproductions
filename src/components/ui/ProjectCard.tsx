import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/data/projects";
import { projectHref } from "@/data/projects";
import Badge from "./Badge";

type ProjectCardProps = {
  project: Project;
  index: number;
  // Phase 22 — the first card in whatever's currently displayed (all
  // projects, or a filtered category subset — PortfolioGrid always
  // passes index 0 of the array it's actually rendering) gets the larger
  // "command substantial viewport space" treatment. Adapts naturally to
  // category filtering with no separate logic needed.
  featured?: boolean;
};

// Phase 22 — real published media, when the project has any: the
// existing typographic .project-art split-word treatment remains the
// real, intentional fallback for a project without real photography
// (never fabricated) — this is genuinely conditional, not a redesign of
// that fallback. For a video-type heroImage, only its resolved POSTER is
// used here — the card itself is one giant stretched <Link>
// (.project-card-link, inset:0), so a real <video controls> element
// layered inside it would create competing/nested interactive targets;
// the full playable video experience stays correctly on the project's
// own detail page gallery, which has no competing full-card link.
export default function ProjectCard({ project, index, featured = false }: ProjectCardProps) {
  const [firstWord, ...restWords] = project.title.split(" ");
  const media = project.heroImage;
  const imageSrc = media ? (media.type === "video" ? media.posterSrc : media.src) : undefined;

  return (
    <article
      className={`project-card ${project.className}${featured ? " project-card-featured" : ""}${imageSrc ? " project-card-has-media" : ""}`}
    >
      <Link
        href={projectHref(project.slug)}
        className="project-card-link"
        aria-label={`View ${project.title} project`}
      />
      <div className="project-topline">
        <span className="project-index">0{index + 1}</span>
        <Badge className="project-stamp">{project.stamp}</Badge>
      </div>
      {imageSrc ? (
        <div className="project-card-media">
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes={featured ? "(max-width: 900px) 92vw, 720px" : "(max-width: 900px) 92vw, 460px"}
          />
          <span className="project-card-view">View project</span>
        </div>
      ) : (
        <div className="project-art">
          <span>{firstWord}</span>
          <b>{restWords.join(" ")}</b>
        </div>
      )}
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
