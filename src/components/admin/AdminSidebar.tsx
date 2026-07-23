"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { adminNavItems } from "@/config/admin-nav";

// The one client component in the admin shell — needed only for
// usePathname()-driven active-link highlighting, nothing else here is
// interactive. Reserved (not-yet-built) sections render as plain disabled
// text, never a link, never a fake working href.
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        Big Red <span>Admin</span>
      </div>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {adminNavItems.map((item) =>
          item.available ? (
            <Link
              key={item.href}
              href={item.href}
              className="admin-sidebar-link"
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ) : (
            <span key={item.label} className="admin-sidebar-link-disabled" aria-disabled="true">
              {item.label}
              <span className="admin-sidebar-link-badge">Coming later</span>
            </span>
          ),
        )}
      </nav>
    </aside>
  );
}
