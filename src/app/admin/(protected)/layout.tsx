import { requireAdminUser } from "@/server/require-admin-user";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

// The real authorization boundary for every route in this group — this
// server component body runs on every request to any nested page
// (/admin, /admin/orders, /admin/orders/[id], /admin/customers,
// /admin/customers/[id]). requireAdminUser() redirects unauthenticated or
// unauthorized visitors before anything below it ever renders. This does
// NOT cover Server Actions/Route Handlers added later — each of those
// must call requireAdminUser() independently. See CLAUDE.md "Admin
// foundation" and the comment on requireAdminUser() itself.
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const adminUser = await requireAdminUser();

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <AdminHeader adminUser={adminUser} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
