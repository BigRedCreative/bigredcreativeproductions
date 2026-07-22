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
    services: [
      "Brand identity development",
      "Logo design",
      "Packaging design",
      "Juice label design",
      "Menu design",
      "Print-production preparation",
      "Product-line visual system",
    ],
    summary:
      "A bold, urban brand identity and packaging system created for SP Juices, combining premium juice branding with 1990s hip-hop, comic-book, graffiti, and streetwear influences.",
    fullDescription:
      "SP Juices needed a brand identity and juice label system that could grow across an expanding lineup of fresh juice products while keeping every flavor distinct — energetic, urban, handmade, and culturally authentic rather than generic, corporate, or typical of a health-drink brand. The design direction centers on a bold white \"SP\" monogram, glossy dripping \"JUICES\" lettering inspired by fruit concentrate and rosin, thick comic-style outlines, high-impact typography, and an individual color palette for each flavor, mixing 1990s hip-hop, graffiti, streetwear, and comic-book influences with modern packaging design. The engagement covered brand identity development, logo design, packaging design, juice label design, menu design, print-production preparation, and a product-line visual system, with deliverables including the SP Juices logo and monogram, individual label designs for vertical 12 oz bottle formats, flavor-specific color systems, print-ready label artwork, a juice menu, product naming and visual hierarchy, and packaging graphics prepared for production. The product lineup developed during the project includes Soul Replenish, Soul Cleanse, Soul Power, Soul Rejuvenation, Soul Glo, Soul Nourish, Soul Bomb, Soul Revival, Seeded Souls, Mortal Soul, Soul Charge, Soul Reaper, and Soul Reboot, with ingredient combinations confirmed for several flavors: Soul Revival (Asian pear, apple, passionfruit, lemon, ginger, burdock root), Soul Cleanse (kale, cilantro, parsley, cucumber, pineapple, lemon with skin, Granny Smith apple, ginger, burdock root), Soul Nourish (yellow watermelon, pineapple, strawberry, apple, lemon, raspberry), Soul Glo (seeded red watermelon, raspberry, strawberry, lemon, pineapple, apple), Soul Replenish (soursop, raspberry, mango, apple, pineapple), Mortal Soul (jackfruit, pineapple, apple), and Seeded Souls (seeded watermelon, blackberry, plums, pineapple, lemon, apple). The system was created to give SP Juices a consistent, recognizable identity across labels, menus, promotional graphics, and future product releases while letting each juice keep its own personality and color identity.",
    client: "SP Juices",
    year: "2026",
    featured: true,
    className: "project-red",
    stamp: "FRESH DROP",
    credits: [
      {
        role: "Creative Direction, Branding, Graphic Design, Packaging Design, Print-Production Artwork",
        name: "Big Red Creative Productions",
      },
    ],
    seo: {
      title: "SP Juices Branding and Packaging Design | Big Red Creative Productions",
      description:
        "Explore the SP Juices branding and packaging system created by Big Red Creative Productions, featuring bold urban identity design, colorful juice labels, and print-ready product graphics.",
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
