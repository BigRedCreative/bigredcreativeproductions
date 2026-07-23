import { signOut } from "@/auth";
import type { AdminUser } from "@/server/require-admin-user";

export default function AdminHeader({ adminUser }: { adminUser: AdminUser }) {
  return (
    <header className="admin-header">
      <div className="admin-header-user">
        {adminUser.displayName}
        <span className="admin-header-email">{adminUser.email}</span>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <button type="submit" className="admin-signout-button">
          Sign out
        </button>
      </form>
    </header>
  );
}
