import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Auth.js (v5) — identity only. This file answers "who is this person,
// really" (a verified Google account) and nothing more. It deliberately
// carries no role/authorization data: the JWT session strategy below
// (the default when no adapter is configured) is fast and requires no
// database tables of Auth.js's own, but it also means anything put in the
// token travels with the user until it expires — so no admin_users lookup
// happens here, and the token never carries a role or an "active" flag.
// Authorization is a fully separate, always-fresh decision made in
// src/server/require-admin-user.ts on every protected request. See
// CLAUDE.md "Admin foundation" for the full writeup.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  // Phase 21B — an explicit, intentional session lifetime replacing
  // Auth.js's own inherited 30-day default (confirmed against current
  // Auth.js docs before this change — `session.maxAge` is the correct v5
  // configuration location, in seconds). 7 days is proportionate for a
  // single-owner admin surface that increasingly touches money-adjacent
  // and AI-cost-bearing actions, without being so short it becomes a
  // daily annoyance. This does not change the JWT strategy, encryption,
  // cookie names, cookie flags, or any callback — only how long a session
  // is allowed to live before Auth.js requires a fresh sign-in.
  session: {
    maxAge: 60 * 60 * 24 * 7, // 7 days, in seconds
  },
});
