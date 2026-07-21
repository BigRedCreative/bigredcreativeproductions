export type Project = {
  title: string;
  type: string;
  copy: string;
  className: string;
  stamp: string;
};

export const projects: Project[] = [
  {
    title: "SP Juices",
    type: "Brand identity · Packaging · Print",
    copy: "A loud, flavor-forward juice identity across labels, menus and promotional art.",
    className: "project-red",
    stamp: "FRESH DROP",
  },
  {
    title: "Crash The Stove",
    type: "Event identity · Promotions · Production",
    copy: "A culture-first event campaign spanning artist promotion, vendor communication and live-event graphics.",
    className: "project-dark",
    stamp: "LIVE CULTURE",
  },
  {
    title: "Product Packaging",
    type: "Creative direction · Labels · Finishing",
    copy: "High-impact packaging systems designed for shelf presence, brand recall and production readiness.",
    className: "project-cream",
    stamp: "BUILT TO MOVE",
  },
];
