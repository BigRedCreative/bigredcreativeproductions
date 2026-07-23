import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed middleware.ts -> proxy.ts (a leftover middleware.ts is
// silently ignored at build time, not an error) — this IS that file, named
// correctly for this version. See CLAUDE.md "Admin foundation" for the
// verification trail.
//
// This is a FAST-PATH convenience redirect only, not the real security
// boundary: it only checks that a session cookie exists, never touches the
// database, and Next's own proxy docs are explicit that Server Actions and
// Route Handlers are not covered by a page-path matcher like this one. The
// actual authorization decision — is this person in admin_users, active,
// with an allowed role — happens in src/server/require-admin-user.ts,
// called independently by the protected layout AND by every admin Server
// Action/Route Handler. Never add real authorization logic here.
export default auth((request) => {
  const { pathname } = request.nextUrl;

  // /admin/login must stay reachable by a signed-out visitor — redirecting
  // it back to itself would loop.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!request.auth) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
