export type Service = {
  number: string;
  title: string;
  text: string;
  tags: string[];
};

export const services: Service[] = [
  {
    number: "01",
    title: "Brand Strategy",
    text: "Naming, positioning, identity systems and brand direction with enough personality to own the room.",
    tags: ["Identity", "Naming", "Direction"],
  },
  {
    number: "02",
    title: "Design & Packaging",
    text: "Logos, product packaging, labels, menus and campaign artwork built for shelf impact and street-level recognition.",
    tags: ["Packaging", "Labels", "Graphics"],
  },
  {
    number: "03",
    title: "Print Production",
    text: "Stickers, signage, banners, collateral and production-ready files made to hit hard in the real world.",
    tags: ["Stickers", "Signs", "Collateral"],
  },
  {
    number: "04",
    title: "Promotions",
    text: "Campaign concepts, social drops, launch visuals and promotional systems that build momentum and attention.",
    tags: ["Campaigns", "Social", "Launches"],
  },
  {
    number: "05",
    title: "Event Management",
    text: "Event identity, artist and vendor promotion, guest communication, marketing assets and creative execution.",
    tags: ["Events", "Vendors", "Culture"],
  },
  {
    number: "06",
    title: "Digital Experiences",
    text: "Modern websites and digital touchpoints that move like your brand and turn attention into action.",
    tags: ["Web", "UX", "Digital"],
  },
];
