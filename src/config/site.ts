export type SocialLink = {
  platform: string;
  url: string;
};

export const siteConfig = {
  name: "Big Red Creative Productions",
  legalName: "Big Red Creative Productions LLC",
  url: "https://bigredcreativeproductions.com",
  email: "hello@bigredcreativeproductions.com",
  location: "Michigan · Available nationwide",
  description:
    "Michigan creative production company delivering branding, graphic design, packaging, print production, promotions and event management.",
  ogDescription: "Bold branding, print, promotions and unforgettable events.",
  metaTitle: "Big Red Creative Productions | Branding, Print, Promotions & Events",
  // No social icons/links are rendered on the site today. Populate this list
  // and wire it into Header/Footer if/when social links are added.
  socialLinks: [] as SocialLink[],
};
