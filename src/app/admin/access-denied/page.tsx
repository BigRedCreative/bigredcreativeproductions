import { signOut } from "@/auth";

// Reached only by someone who successfully authenticated with Google but
// has no active admin_users row (see requireAdminUser()). Deliberately
// non-sensitive: never confirms or denies whether a given email exists in
// admin_users, never explains the allowlist — just a plain "you're not
// authorized" plus a way to sign out and try a different account.
export default function AdminAccessDeniedPage() {
  return (
    <div className="admin-denied-shell">
      <div className="admin-denied-card">
        <h1 className="admin-denied-heading">Access denied</h1>
        <p>Your account is not authorized to access this admin system.</p>
        <p>If you believe this is a mistake, contact the site owner.</p>
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
      </div>
    </div>
  );
}
