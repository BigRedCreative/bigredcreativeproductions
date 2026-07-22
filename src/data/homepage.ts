// Editable homepage copy. Layout, JSX structure, and animation behavior stay
// in the components — this file holds only the words and labels they render.

export const hero = {
  badgePrimary: "BUILT DIFFERENT",
  badgeSecondary: "EST. MICHIGAN",
  eyebrow: "Independent creative production company",
  headlineLead: "We make brands",
  headlineAccent: "move culture.",
  tagline: "BRANDING · PRINT · PROMOTIONS · EVENTS",
  supportingCopy:
    "Strategy, design, print, promotion and event execution with premium polish, hip-hop energy and enough grit to be remembered.",
  cta: {
    label: "See the work",
    icon: "↘",
    ariaLabel: "View selected work",
  },
};

export const ticker = {
  items: ["BIG IDEAS", "BOLD DESIGNS", "UNFORGETTABLE EVENTS"],
  separator: "✦",
};

export const manifesto = {
  kicker: "The mission",
  copy: "We turn raw ideas into brands with presence—visual systems that feel polished enough for the boardroom and real enough for the block.",
};

export const statement = {
  label: "NO GENERIC BRANDS",
  kicker: "Our point of view",
  headlineLines: ["Clean strategy.", "Raw energy."],
  copy: "High-end creative direction with the confidence, rhythm and visual punch of hip-hop culture.",
};

export const servicesIntro = {
  kicker: "What we bring",
  heading: "Full-service creative. No watered-down energy.",
};

export const portfolioIntro = {
  kicker: "Selected work",
  heading: "Made to stop the scroll and own the room.",
};

export const studio = {
  kicker: "The studio",
  heading: "One team. One vision. Every touchpoint connected.",
  // Rendered as "{siteConfig.name} {introSuffix}" — see Studio.tsx.
  introSuffix:
    "works with entrepreneurs, artists, product brands, venues and event organizers that need more than isolated design files.",
  secondParagraph:
    "We bring brand identity, physical production, campaign thinking and live-event creative under one roof so the whole experience hits with one voice.",
  principles: ["Bold, never reckless.", "Urban, never cliché.", "Professional, never boring."],
};

export type ProcessStep = {
  number: string;
  title: string;
  copy: string;
};

export const process = {
  kicker: "The rollout",
  steps: [
    { number: "01", title: "Tap In", copy: "We learn the idea, audience, goals and energy." },
    { number: "02", title: "Set Direction", copy: "Strategy, creative direction and a clear plan." },
    { number: "03", title: "Build It", copy: "Design, revise, refine and prep for production." },
    { number: "04", title: "Drop It", copy: "Launch, deliver and keep the momentum moving." },
  ] as ProcessStep[],
};

export const contact = {
  kicker: "Start a project",
  heading: "Let’s make noise.",
  description: "Tell us what you’re building and where you need creative support.",
  form: {
    nameLabel: "Your name",
    namePlaceholder: "Name or company",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    serviceLabel: "Service",
    servicePlaceholder: "Select a service",
    serviceOptions: [
      "Branding",
      "Packaging & Labels",
      "Print Production",
      "Promotions",
      "Event Management",
      "Website",
      "Multiple Services",
    ],
    detailsLabel: "Project details",
    detailsPlaceholder: "Tell us about the vision, timing and budget.",
    submitLabel: "Send the vision ↗",
  },
};

export const footer = {
  tagline: "Branding · Print · Promotions · Events",
  backToTopLabel: "Back to top ↑",
};
