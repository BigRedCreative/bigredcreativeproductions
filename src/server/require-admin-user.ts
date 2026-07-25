import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { ADMIN_ROLES, adminUsers } from "@/db/schema";
import type { AdminRole } from "@/db/schema";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
};

// role/active are deliberately re-read from the database on every call,
// never trusted from the session/JWT — see src/db/schema.ts's comment on
// adminUsers for why (instant-effect deactivation). Shared by both
// requireAdminUser() (redirects — for pages/Server Actions) and
// getAdminUserOrNull() (returns null — for JSON API Route Handlers, where
// a redirect response would confuse a non-browser client like the
// @vercel/blob upload SDK; see src/app/api/media/video-upload-token/route.ts).
async function lookupAdminUser(): Promise<AdminUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const row = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, normalizedEmail),
  });

  if (!row || !row.active || !ADMIN_ROLES.includes(row.role)) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
  };
}

// The ONE real authorization boundary for the admin system. Authentication
// (proved by Auth.js/Google) is necessary but never sufficient — this is
// the separate, independent check for whether that authenticated person is
// allowed to use the admin panel at all. Every protected admin page's
// layout calls this, and — because Next.js proxy/middleware does not cover
// Server Actions or Route Handlers (confirmed against Next's own docs) —
// every future admin Server Action and Route Handler must call this too,
// independently, even once one already ran for the page that rendered the
// form/button that triggered it. Never rely on a page-level check alone.
export async function requireAdminUser(): Promise<AdminUser> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/admin/login");
  }

  const user = await lookupAdminUser();
  if (!user) {
    redirect("/admin/access-denied");
  }

  return user;
}

// Same authorization check as requireAdminUser(), but returns null instead
// of redirecting — for JSON API Route Handlers where a 307 to /admin/login
// would reach a non-browser client (e.g. the @vercel/blob client SDK
// calling handleUploadUrl) as a confusing, unhandleable response instead
// of a clean 401.
export async function getAdminUserOrNull(): Promise<AdminUser | null> {
  return lookupAdminUser();
}
