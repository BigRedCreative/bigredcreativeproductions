// Starter template for adding a new portfolio project. Copy the object you
// need into the `projects` array in src/data/projects.ts and fill it in.
// This file is reference-only — it is never imported by the app, and these
// two objects are never added to `projects` or the build.
//
// Rules:
// - Never invent a client name, year, result, or credit — omit the field
//   until you have the real, confirmed information.
// - Never invent or use a stock/placeholder photo — omit image fields until
//   real project photography exists. The UI has a built-in typographic
//   fallback (the same one every current project uses) for projects with
//   no images yet.
// - Every image needs real, meaningful alt text describing what it shows.
// - `category` must be one of PROJECT_CATEGORIES; `services` can be any
//   free-form list of the disciplines actually used on the project.
//
// See CLAUDE.md → "Portfolio system" for the full field reference.

import type { Project } from "./projects";
import { projectImagePath } from "./projects";

// ---- Minimum required fields ----
// slug, title, shortTitle, category, services, summary, fullDescription,
// featured, className, stamp, seo.title, seo.description.
export const minimalProjectTemplate: Project = {
  slug: "project-slug",
  title: "Project Title",
  shortTitle: "Project Title",
  category: "Branding",
  services: ["Branding"],
  summary: "One sentence describing the project.",
  fullDescription: "Two or three sentences describing the project in more depth.",
  featured: false,
  className: "project-red", // project-red | project-dark | project-cream
  stamp: "NEW",
  seo: {
    title: "Project Title | Big Red Creative Productions",
    description: "One sentence describing the project.",
  },
};

// ---- Full template — every optional field shown ----
export const fullProjectTemplate: Project = {
  slug: "project-slug",
  title: "Project Title",
  shortTitle: "Project Title",
  category: "Branding",
  services: ["Branding", "Packaging"],
  summary: "One sentence describing the project.",
  fullDescription: "Two or three sentences describing the project in more depth.",
  client: "Real, confirmed client name", // omit entirely if not confirmed
  year: "2026", // omit entirely if not confirmed
  featured: false,
  // "draft" keeps it out of the homepage, static routes, and navigation
  // until it's ready. Set to "published" (or omit the field) to go live.
  status: "draft",
  className: "project-red",
  stamp: "NEW",
  thumbnail: {
    src: projectImagePath("project-slug", "thumbnail.jpg"),
    alt: "Describe exactly what the image shows",
  },
  heroImage: {
    src: projectImagePath("project-slug", "hero.jpg"),
    alt: "Describe exactly what the image shows",
  },
  gallery: [
    {
      src: projectImagePath("project-slug", "gallery-1.jpg"),
      alt: "Describe exactly what the image shows",
    },
  ],
  externalLink: { label: "Visit site", url: "https://example.com" }, // omit if none
  results: [
    { label: "Real, confirmed metric", value: "Real, confirmed number" }, // omit if none
  ],
  credits: [
    { role: "Creative Direction", name: "Big Red Creative Productions" }, // omit if none
  ],
  seo: {
    title: "Project Title | Big Red Creative Productions",
    description: "One sentence describing the project.",
  },
};
