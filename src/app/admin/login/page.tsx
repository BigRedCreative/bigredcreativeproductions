import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function AdminLoginPage() {
  // Convenience only, not an authorization check: anyone already holding a
  // Google session is sent on to /admin, where the protected layout's
  // requireAdminUser() makes the real allow/deny decision (redirecting to
  // /admin/access-denied if they aren't an active admin_users row).
  const session = await auth();
  if (session?.user) {
    redirect("/admin");
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <p className="admin-login-eyebrow">Big Red Creative Productions</p>
        <h1 className="admin-login-heading">Admin</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin" });
          }}
        >
          <button type="submit" className="admin-google-button">
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
