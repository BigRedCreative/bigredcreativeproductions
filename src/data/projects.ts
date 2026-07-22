import { validateProjects } from "./projects.validate";

export const PROJECT_CATEGORIES = [
  "Branding",
  "Packaging",
  "Print Production",
  "Events",
  "Promotions",
  "Web Design",
  "Graphic Design",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_STATUSES = ["published", "draft"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// The homepage grid is designed around this many cards. Mark more than this
// many projects as featured to build a rotation — only the first
// MAX_FEATURED_PROJECTS, in their array order, actually render on the
// homepage, so the layout never breaks no matter how many are flagged.
export const MAX_FEATURED_PROJECTS = 3;

export type ProjectImage = {
  src: string;
  alt: string;
};

export type ProjectResult = {
  label: string;
  value: string;
};

export type ProjectCredit = {
  role: string;
  name: string;
};

export type ProjectExternalLink = {
  label: string;
  url: string;
};

export type Project = {
  slug: string;
  title: string;
  // Short form used in compact UI (prev/next navigation). Defaults to the
  // full title for projects whose title is already short.
  shortTitle: string;
  category: ProjectCategory;
  services: string[];
  summary: string;
  fullDescription: string;
  // Only fill these in with real, confirmed information — never invent a
  // client name, date, result, or credit. Leave undefined until known.
  client?: string;
  year?: string;
  featured: boolean;
  // Draft projects stay in this file for prep but are excluded from the
  // homepage, static routes, and prev/next navigation. Omitted = published.
  status?: ProjectStatus;
  // Visual variant + ticket-stub badge used by the homepage ProjectCard.
  className: string;
  stamp: string;
  // No project photography exists yet. Leave these undefined and the UI
  // falls back to the site's existing typographic card treatment — do not
  // fill these with placeholder/stock images.
  thumbnail?: ProjectImage;
  heroImage?: ProjectImage;
  gallery?: ProjectImage[];
  externalLink?: ProjectExternalLink;
  results?: ProjectResult[];
  credits?: ProjectCredit[];
  seo: {
    title: string;
    description: string;
  };
};

export const projects: Project[] = [
  {
    slug: "sp-juices",
    title: "SP Juices",
    shortTitle: "SP Juices",
    category: "Branding",
    services: ["Brand identity", "Packaging", "Print"],
    summary:
      "A loud, flavor-forward juice identity across labels, menus and promotional art.",
    fullDescription:
      "SP Juices needed a brand identity loud enough to match the flavor of the product — built to work across bottle labels, menu boards and promotional art without losing clarity at any size. The project covered brand identity, packaging design and print production, giving the line a consistent, shelf-ready look across every touchpoint.",
    featured: true,
    className: "project-red",
    stamp: "FRESH DROP",
    seo: {
      title: "SP Juices — Brand Identity & Packaging | Big Red Creative Productions",
      description:
        "A loud, flavor-forward juice identity across labels, menus and promotional art.",
    },
  },
  {
    slug: "crash-the-stove",
    title: "Crash The Stove",
    shortTitle: "Crash The Stove",
    category: "Events",
    services: ["Event identity", "Promotions", "Production"],
    summary:
      "A culture-first event campaign spanning artist promotion, vendor communication and live-event graphics.",
    fullDescription:
      "Crash The Stove called for a culture-first event campaign that could carry artist promotion, vendor communication and live-event graphics under one identity. The work spanned event identity, promotions and production, keeping the visual language consistent from the first announcement through day-of signage.",
    featured: true,
    className: "project-dark",
    stamp: "LIVE CULTURE",
    seo: {
      title: "Crash The Stove — Event Identity & Promotions | Big Red Creative Productions",
      description:
        "A culture-first event campaign spanning artist promotion, vendor communication and live-event graphics.",
    },
  },
  {
    slug: "product-packaging",
    title: "Product Packaging",
    shortTitle: "Product Packaging",
    category: "Packaging",
    services: ["Creative direction", "Labels", "Finishing"],
    summary:
      "High-impact packaging systems designed for shelf presence, brand recall and production readiness.",
    fullDescription:
      "This packaging system was built for shelf presence and brand recall first, with creative direction, label design and production finishing handled to keep every piece print-ready. The result is a packaging system designed to hold up under real production constraints while still standing out on the shelf.",
    featured: true,
    className: "project-cream",
    stamp: "BUILT TO MOVE",
    seo: {
      title: "Product Packaging — Creative Direction & Labels | Big Red Creative Productions",
      description:
        "High-impact packaging systems designed for shelf presence, brand recall and production readiness.",
    },
  },
];

// Fails loudly (build or dev server) with every problem listed at once if
// project data is invalid — see src/data/projects.validate.ts.
validateProjects(projects, {
  validCategories: PROJECT_CATEGORIES,
  validStatuses: PROJECT_STATUSES,
});

// Builds the conventional path for a project image — see
// public/images/projects/[slug]/ in CLAUDE.md. Does not touch the file
// system; it only builds the string a real, already-placed file should live
// at.
export function projectImagePath(slug: string, filename: string): string {
  return `/images/projects/${slug}/${filename}`;
}

export function isPublished(project: Project): boolean {
  return project.status !== "draft";
}

// The only project list that's safe to expose publicly. Draft projects are
// excluded from every public-facing lookup below.
export function getPublishedProjects(): Project[] {
  return projects.filter(isPublished);
}

export function projectHref(slug: string): string {
  return `/work/${slug}`;
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getPublishedProjects().find((project) => project.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return getPublishedProjects()
    .filter((project) => project.featured)
    .slice(0, MAX_FEATURED_PROJECTS);
}

export function getAdjacentProjects(slug: string): {
  previous?: Project;
  next?: Project;
} {
  const published = getPublishedProjects();
  const index = published.findIndex((project) => project.slug === slug);
  if (index === -1 || published.length <= 1) {
    return {};
  }
  return {
    previous: published[(index - 1 + published.length) % published.length],
    next: published[(index + 1) % published.length],
  };
}
