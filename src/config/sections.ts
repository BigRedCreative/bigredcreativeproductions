// Single source of truth for homepage section order, anchor IDs, and
// whether a section renders. Keep this in sync when adding/removing sections
// in src/app/page.tsx.

export const sectionAnchors = {
  hero: "top",
  services: "services",
  portfolio: "work",
  studio: "studio",
  contact: "contact",
} as const;

export type SectionId =
  | "header"
  | "hero"
  | "ticker"
  | "manifesto"
  | "services"
  | "statement"
  | "portfolio"
  | "studio"
  | "process"
  | "contact"
  | "footer";

export type SectionConfig = {
  id: SectionId;
  anchorId?: string;
  enabled: boolean;
};

export const homepageSections: SectionConfig[] = [
  { id: "header", enabled: true },
  { id: "hero", anchorId: sectionAnchors.hero, enabled: true },
  { id: "ticker", enabled: true },
  { id: "manifesto", enabled: true },
  { id: "services", anchorId: sectionAnchors.services, enabled: true },
  { id: "statement", enabled: true },
  { id: "portfolio", anchorId: sectionAnchors.portfolio, enabled: true },
  { id: "studio", anchorId: sectionAnchors.studio, enabled: true },
  { id: "process", enabled: true },
  { id: "contact", anchorId: sectionAnchors.contact, enabled: true },
  { id: "footer", enabled: true },
];

export function isSectionEnabled(id: SectionId): boolean {
  return homepageSections.find((section) => section.id === id)?.enabled ?? false;
}
