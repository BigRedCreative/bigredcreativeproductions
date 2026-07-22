import { sectionAnchors } from "@/config/sections";

export type NavItem = {
  label: string;
  href: string;
};

export const primaryNav: NavItem[] = [
  { label: "Services", href: `#${sectionAnchors.services}` },
  { label: "Work", href: `#${sectionAnchors.portfolio}` },
  { label: "Studio", href: `#${sectionAnchors.studio}` },
  { label: "Contact", href: `#${sectionAnchors.contact}` },
];

export const headerCta: NavItem = {
  label: "Book the vision",
  href: `#${sectionAnchors.contact}`,
};
