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
  // Gallery items default to a dark background (matches most label/product
  // artwork, which is already full-bleed black). Set true only for images
  // that read poorly on black — e.g. a dark-outlined logo on a transparent
  // background.
  lightBackground?: boolean;
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
    heroImage: {
      src: projectImagePath("sp-juices", "hero.png"),
      alt: "SP Juices hero artwork featuring the SP monogram, tropical fruit, Soul Cleanse and Soul Bomb bottle mockups, bold SP JUICE lettering, and cold-pressed organic branding.",
    },
    gallery: [
      {
        src: projectImagePath("sp-juices", "logo.png"),
        alt: "Transparent SP Juices monogram logo with bold black outline and dripping graphic details.",
        lightBackground: true,
      },
      {
        src: projectImagePath("sp-juices", "menu.png"),
        alt: "SP Juices printed juice menu poster listing seven flavors — Soul Revival, Soul Cleanse, Soul Nourish, Soul Glo, Soul Replenish, Mortal Soul, and Seeded Souls — each in a comic-style illustrated card with ingredients and pricing, under a \"100% RAW · COLD PRESSED · NO ADDED SUGAR\" banner.",
      },
      {
        src: projectImagePath("sp-juices", "soulglojuicemockup.png"),
        alt: "SP Juices Soul Bomb bottle mockup: a 12 oz bottle of orange juice with a black label featuring the SP monogram, mandarin, pineapple, apple, papaya, and turmeric illustrations, and the \"SOUL BOMB\" logotype.",
      },
      {
        src: projectImagePath("sp-juices", "soul-bomb-label.png"),
        alt: "SP Juices \"Soul Bomb\" label artwork on black, with mandarin, pineapple, apple, papaya, and turmeric illustrations around the SP monogram, a white-and-red \"SOUL BOMB\" logotype, ingredient list, QR code, and 12 OZ / SHAKE WELL details.",
      },
      {
        src: projectImagePath("sp-juices", "soul-charge-label.png"),
        alt: "SP Juices \"Soul Charge\" label artwork on black, with seeded grapes, green apple, pineapple, lime, beets, ginger, and burdock root illustrations around the SP monogram, and a purple-and-green \"SOUL CHARGE\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-cleanse-label.png"),
        alt: "SP Juices \"Soul Cleanse\" label artwork on black, with kale, cilantro, parsley, cucumber, pineapple, lemon, apple, ginger, and burdock root illustrations around the SP monogram, and a green \"SOUL CLEANSE\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-glo-label.png"),
        alt: "SP Juices \"Soul Glo\" label artwork on black, with watermelon, raspberry, strawberry, lemon, apple, and pineapple illustrations around the SP monogram, and a neon pink-and-orange \"SOUL GLO\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-mortal-label.png"),
        alt: "SP Juices \"Mortal Soul\" label artwork on black, with jackfruit, pineapple, and apple illustrations around the SP monogram, and a blue-and-white \"MORTAL SOUL\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-nourish-label.png"),
        alt: "SP Juices \"Soul Nourish\" label artwork on black, with yellow watermelon, pineapple, strawberry, apple, lemon, and raspberry illustrations around the SP monogram, and a teal-and-yellow \"SOUL NOURISH\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-power-label.png"),
        alt: "SP Juices \"Soul Power\" label artwork on black, with lemon, cherry, pineapple, and apple illustrations around the SP monogram, and a teal-and-yellow \"SOUL POWER\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-replenish-label.png"),
        alt: "SP Juices \"Soul Replenish\" label artwork on black, with soursop, raspberry, mango, pineapple, and apple illustrations around the SP monogram, and a yellow-and-magenta \"SOUL REPLENISH\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-revival-label.png"),
        alt: "SP Juices \"Soul Revival\" label artwork on black, with Asian pear, apple, passionfruit, lemon, ginger, and burdock root illustrations around the SP monogram, and a teal-and-red \"SOUL REVIVAL\" logotype with ingredient list.",
      },
      {
        src: projectImagePath("sp-juices", "soul-seeded-label.png"),
        alt: "SP Juices \"Seeded Souls\" label artwork, with seeded watermelon, blackberry, plums, pineapple, lemon, and apple illustrations around the SP monogram, and a blue-and-teal \"SEEDED SOULS\" logotype with ingredient list on a dark red banner.",
      },
    ],
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
