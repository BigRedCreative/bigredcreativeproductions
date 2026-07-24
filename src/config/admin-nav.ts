// The admin sidebar's single source of truth for what's built vs. reserved.
// Reserved items are never links — no href, not navigable, rendered
// disabled — see AdminShell.tsx. Add a real `href` here (and flip
// `available`) only once a section actually exists; never point a nav item
// at a route that doesn't render anything yet.
export type AdminNavItem =
  | { label: string; href: string; available: true }
  | { label: string; available: false };

export const adminNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", available: true },
  { label: "Orders", href: "/admin/orders", available: true },
  { label: "Customers", href: "/admin/customers", available: true },
  { label: "Products", href: "/admin/products", available: true },
  { label: "Services", available: false },
  { label: "Portfolio", available: false },
  { label: "Media", href: "/admin/media", available: true },
  { label: "Website", href: "/admin/website", available: true },
  { label: "Settings", available: false },
  { label: "Big Red Brain", available: false },
];
