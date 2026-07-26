import { validateServices } from "./services.validate";

// Phase 17 — optional link to a Media Library asset (media_assets.id),
// the exact same non-breaking extension Phase 15 made to the catalog's
// Media type. `src` stays always populated (frozen at selection time);
// src/server/queries/services.ts re-resolves it from the live media_assets
// row before this reaches a page, same as Product.media. Every entry in
// the fallback array below has no mediaAssetId, so this needs no edits
// there.
//
// Phase 19C — gallery-only video support, additive, no migration (this
// column is schema-less JSONB). Deliberately parallel to, but NOT shared
// with, Portfolio's ProjectImage — the two content systems evolve
// independently by design (see CLAUDE.md "Services + Portfolio Admin"),
// and ServiceImage has never had a lightBackground concept, so a shared
// type would carry a field this one doesn't need.
export type ServiceImage = {
  // Absent/undefined means "image" — every gallery item authored before
  // this phase (no `type` field at all) continues to render exactly as
  // before. Only ever set to "video" for a real Media Library video
  // selection; no manual/local video path support, matching how every
  // other Media-Library-only asset type already works in this codebase.
  type?: "image" | "video";
  src: string;
  alt: string;
  mediaAssetId?: string;
  // READ-TIME ONLY. Never authored by the admin form, never persisted
  // into service_versions.gallery's JSONB — see
  // sanitizeServiceGalleryForStorage() below, and the real bug in Phase
  // 19B's Portfolio implementation that proved this needs active,
  // server-side enforcement, not just a comment. Populated exclusively by
  // resolveServicesMedia() in src/server/queries/services.ts, resolving a
  // video asset's own posterMediaAssetId (Phase 19A) to that poster's
  // current URL on every read. Stays undefined when the video has no
  // poster configured, or for any non-video item.
  posterSrc?: string;
};

// The one place that decides what's ALLOWED to reach
// service_versions.gallery's JSONB. Direct structural mirror of
// sanitizeGalleryForStorage() in src/data/projects.ts — kept as a
// SEPARATE function on purpose (not generalized/shared), per explicit
// Phase 19C decision: Services and Portfolio are intentionally parallel
// but independently evolving systems, and their gallery shapes may
// diverge further later. Rebuilt via an explicit allowlist (never a
// `delete image.posterSrc`) so any FUTURE runtime-only field added to
// ServiceImage is stripped by default too — the server is the authority
// here, not the client. Called from src/server/mutate-service.ts's
// contentToColumns(), the one shared choke point both createServiceAction
// and saveServiceDraftAction go through.
export function sanitizeServiceGalleryForStorage(gallery: ServiceImage[] | null | undefined): ServiceImage[] | null {
  if (!gallery) return null;
  return gallery.map((image) => {
    const sanitized: ServiceImage = { src: image.src, alt: image.alt };
    if (image.type !== undefined) sanitized.type = image.type;
    if (image.mediaAssetId !== undefined) sanitized.mediaAssetId = image.mediaAssetId;
    return sanitized;
  });
}

export type ServiceProcessStep = {
  title: string;
  description: string;
};

// Phase 17 — Neon is now the runtime authority for services (see
// src/server/queries/services.ts); this array is retained only as frozen
// seed/reference data. `id`/`status` are optional specifically so every
// entry below still type-checks unmodified: `id` is populated only by the
// database read path (no component reads it), and `status` follows the
// exact same "undefined means published" idiom already established by
// Project.status, now including "archived" as a third possible value.
export const SERVICE_STATUSES = ["draft", "published", "archived"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export type Service = {
  id?: string;
  status?: ServiceStatus;
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  fullDescription: string;
  featured: boolean;
  serviceNumber: string;
  capabilities: string[];
  deliverables: string[];
  process: ServiceProcessStep[];
  ctaLabel: string;
  heroImage?: ServiceImage;
  gallery?: ServiceImage[];

  // Commerce extension points. None of these are read or rendered anywhere
  // yet — they exist so a future commerce phase can populate real values
  // without changing this type. See the "Services system" section in
  // CLAUDE.md for the full future-phase plan (packages, add-ons, deposits,
  // intake forms, cart/checkout).
  startingPrice?: number;
  pricingNote?: string;
  turnaround?: string;
  revisions?: string;
  depositAmount?: number;
  purchasable?: boolean;
  intakeFormSlug?: string;
  cartEligible?: boolean;

  seo: {
    title: string;
    description: string;
  };
};

// Shared by every service today since the company's rollout process is the
// same regardless of service line. Give a service its own `process` array
// instead of this constant if it ever needs a genuinely different sequence.
const standardProcess: ServiceProcessStep[] = [
  { title: "Tap In", description: "We learn the goals, audience and scope for the project." },
  { title: "Set Direction", description: "Strategy and creative direction get set before design begins." },
  { title: "Build It", description: "Design, revisions and refinement through to production-ready files." },
  { title: "Drop It", description: "Final delivery, ready to launch or go to production." },
];

export const services: Service[] = [
  {
    slug: "branding",
    title: "Branding",
    shortTitle: "Branding",
    serviceNumber: "01",
    featured: true,
    summary:
      "Brand identity systems built on strong strategy — logos, typography, color systems and creative direction applied consistently across every touchpoint.",
    fullDescription:
      "Branding work covers full identity systems: logo design, typography selection, color systems and the creative direction that ties them together. Every identity is built to apply consistently across brand applications, from digital presence to print and packaging, so a brand feels the same everywhere it shows up.",
    capabilities: [
      "Brand Identity",
      "Logo Design",
      "Typography",
      "Color Systems",
      "Creative Direction",
      "Brand Applications",
    ],
    deliverables: ["Logo design files", "Typography system", "Color palette", "Brand application guidelines"],
    process: standardProcess,
    ctaLabel: "Start a branding project",
    seo: {
      title: "Branding Services | Big Red Creative Productions",
      description:
        "Brand identity systems from Big Red Creative Productions — logo design, typography, color systems and creative direction built for consistent brand applications.",
    },
  },
  {
    slug: "graphic-design",
    title: "Graphic Design",
    shortTitle: "Graphic Design",
    serviceNumber: "02",
    featured: true,
    summary:
      "Promotional graphics, campaign artwork and marketing collateral designed to hold attention and stay on-brand.",
    fullDescription:
      "Graphic design work covers the day-to-day creative a brand needs to stay visible: flyers, promotional graphics, campaign artwork, social graphics, menus and marketing collateral. Every piece is built to carry a consistent visual language, whether it's a single social graphic or a full campaign rollout.",
    capabilities: [
      "Promotional Graphics",
      "Campaign Artwork",
      "Social Graphics",
      "Flyers",
      "Menus",
      "Marketing Collateral",
    ],
    deliverables: ["Print-ready graphic files", "Social media graphic sets", "Campaign artwork"],
    process: standardProcess,
    ctaLabel: "Start a graphic design project",
    seo: {
      title: "Graphic Design Services | Big Red Creative Productions",
      description:
        "Promotional graphics, campaign artwork and marketing collateral from Big Red Creative Productions, designed to stay on-brand across every format.",
    },
  },
  {
    slug: "packaging",
    title: "Packaging",
    shortTitle: "Packaging",
    serviceNumber: "03",
    featured: true,
    summary:
      "Product packaging and label systems built for shelf presence, clear visual hierarchy and print-ready production.",
    fullDescription:
      "Packaging work covers product packaging, labels and full packaging systems, designed with clear visual hierarchy so a product reads clearly on the shelf, and prepared as print-ready production layouts from the start. The goal is packaging that looks strong and holds up under real production constraints.",
    capabilities: ["Product Packaging", "Label Design", "Packaging Systems", "Visual Hierarchy", "Print-Ready Layouts"],
    deliverables: ["Label designs", "Packaging layout files", "Print-ready production files"],
    process: standardProcess,
    ctaLabel: "Start a packaging project",
    seo: {
      title: "Packaging Design | Big Red Creative Productions",
      description:
        "Product packaging and label design from Big Red Creative Productions, built for shelf presence, clear visual hierarchy and print-ready production.",
    },
  },
  {
    slug: "print-production",
    title: "Print Production",
    shortTitle: "Print Production",
    serviceNumber: "04",
    featured: true,
    summary:
      "Print-ready artwork and production file preparation for stickers, labels, signage and promotional materials.",
    fullDescription:
      "Print production covers the design and file-preparation side of getting artwork ready for real-world print: stickers, labels, signage and promotional materials, all prepared as clean, print-ready production files that hold up under real production constraints.",
    capabilities: ["Print-Ready Artwork", "Stickers", "Labels", "Signage", "Promotional Materials", "Production Files"],
    deliverables: ["Print-ready production files", "Sticker and label artwork", "Signage artwork"],
    process: standardProcess,
    ctaLabel: "Start a print production project",
    seo: {
      title: "Print Production Services | Big Red Creative Productions",
      description:
        "Print-ready artwork and production file preparation from Big Red Creative Productions for stickers, labels, signage and promotional materials.",
    },
  },
  {
    slug: "promotions",
    title: "Promotions",
    shortTitle: "Promotions",
    serviceNumber: "05",
    featured: true,
    summary: "Launch campaigns and promotional creative built to build momentum around a product, event or drop.",
    fullDescription:
      "Promotions work covers the creative that drives a launch or campaign: promotional graphics, call-to-action creative and social campaign content built around a product, event or drop. The goal is a promotional system that builds momentum and stays visually consistent from first announcement through launch.",
    capabilities: ["Launch Campaigns", "Event Promotion", "Product Promotion", "CTA Graphics", "Social Campaigns"],
    deliverables: ["Campaign graphic set", "Social promotional content", "Call-to-action graphics"],
    process: standardProcess,
    ctaLabel: "Start a promotional campaign",
    seo: {
      title: "Promotions & Campaign Creative | Big Red Creative Productions",
      description:
        "Launch campaigns and promotional creative from Big Red Creative Productions, including social campaign content and call-to-action graphics.",
    },
  },
  {
    slug: "event-management",
    title: "Event Management",
    shortTitle: "Event Management",
    serviceNumber: "06",
    featured: true,
    summary:
      "Event creative support and promotional coordination — artist and vendor communication graphics, campaign systems and event-day information.",
    fullDescription:
      "Event management work focuses on the creative and promotional side of live events: campaign systems that carry an event's identity across announcements, artist and vendor communication graphics, and event-day information like signage and setup details. This is creative support and promotional coordination, not full-service event production, venue management or talent booking.",
    capabilities: [
      "Event Creative Support",
      "Promotional Coordination",
      "Vendor Communication",
      "Artist Communication",
      "Event-Day Info",
    ],
    deliverables: [
      "Event promotional graphics",
      "Artist and vendor communication graphics",
      "Event-day signage and information graphics",
    ],
    process: standardProcess,
    ctaLabel: "Start an event campaign",
    seo: {
      title: "Event Promotion & Creative | Big Red Creative Productions",
      description:
        "Event creative support from Big Red Creative Productions — promotional coordination, artist and vendor communication graphics, and event-day information.",
    },
  },
  {
    slug: "websites",
    title: "Websites",
    shortTitle: "Websites",
    serviceNumber: "07",
    featured: true,
    summary: "Brand-driven websites, portfolio sites and landing pages built with responsive, creative web design.",
    fullDescription:
      "Website work covers brand-driven websites, portfolio sites and landing pages: creative web experiences built to feel like an extension of the brand, with responsive design across devices. This is creative website design work, not custom backend or application development.",
    capabilities: ["Brand Websites", "Portfolio Sites", "Landing Pages", "Responsive Design", "Web Experiences"],
    deliverables: ["Responsive website", "Landing page design", "Website content structure"],
    process: standardProcess,
    ctaLabel: "Start a website project",
    seo: {
      title: "Website Design | Big Red Creative Productions",
      description:
        "Brand-driven websites, portfolio sites and landing pages from Big Red Creative Productions, built with responsive, creative web design.",
    },
  },
];

validateServices(services);

export function serviceImagePath(slug: string, filename: string): string {
  return `/images/services/${slug}/${filename}`;
}

export function serviceHref(slug: string): string {
  return `/services/${slug}`;
}

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

export function getFeaturedServices(): Service[] {
  return services.filter((service) => service.featured);
}
