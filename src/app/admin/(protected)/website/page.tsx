import Link from "next/link";

// A plain hub linking to each Phase 14 content section — no database
// terminology anywhere in the labels/descriptions, per the approved scope.
const sections = [
  {
    href: "/admin/website/general",
    title: "General & Branding",
    description: "Site name, legal name, tagline, contact email, location, logos, and social links.",
  },
  {
    href: "/admin/website/homepage",
    title: "Homepage",
    description: "Edit the hero section shown at the top of the homepage. Save a draft, preview it, then publish.",
  },
  {
    href: "/admin/website/navigation",
    title: "Navigation",
    description: "Manage the header menu links, their order, and the header button.",
  },
  {
    href: "/admin/website/contact",
    title: "Contact",
    description: "Edit the heading, description, and button text shown above the contact form.",
  },
  {
    href: "/admin/website/seo",
    title: "SEO & Sharing",
    description: "Default page title, description, canonical URL, and social sharing description.",
  },
];

export default function AdminWebsitePage() {
  return (
    <div>
      <h1 className="admin-page-heading">Website</h1>
      <div className="admin-section-links">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="admin-section-link">
            <p className="admin-section-link-title">{section.title}</p>
            <p className="admin-section-link-description">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
