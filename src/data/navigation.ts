import { sectionAnchors } from "@/config/sections";
import { STORE_INDEX_HREF } from "@/data/products";

export type NavItem = {
  label: string;
  href: string;
};

// Homepage-section links use an absolute `/#anchor` href (not a bare
// `#anchor`) so they resolve correctly from every route, not just the
// homepage. A bare `#services` clicked while on /store or /work/[slug]
// would just look for that id on the current page and fail — `/#services`
// always navigates to the homepage first, then the browser's native
// hash-scroll takes over. No routing JavaScript needed for this.
export const primaryNav: NavItem[] = [
  { label: "Services", href: `/#${sectionAnchors.services}` },
  { label: "Work", href: `/#${sectionAnchors.portfolio}` },
  { label: "Store", href: STORE_INDEX_HREF },
  { label: "Studio", href: `/#${sectionAnchors.studio}` },
  { label: "Contact", href: `/#${sectionAnchors.contact}` },
];

export const headerCta: NavItem = {
  label: "Book the vision",
  href: `/#${sectionAnchors.contact}`,
};
