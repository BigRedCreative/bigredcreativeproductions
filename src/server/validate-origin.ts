import "server-only";

// Phase 21B — same-origin enforcement for authenticated Route Handlers that
// carry real cookie-derived authority and are NOT covered by Next.js's own
// built-in Server Action Origin/Host CSRF check (that mechanism is specific
// to the 'use server' action-invocation path — see CLAUDE.md "Auth/Session +
// Origin/CSRF Hardening (Phase 21B)" for the full architecture writeup and
// why this is the ONE route that needed it, not a general-purpose
// middleware).
//
// Deliberately narrow: this is scoped to POST endpoints where the caller is
// already known to be authenticated (see video-upload-token/route.ts — this
// check runs AFTER getAdminUserOrNull() succeeds, never before) — CSRF is
// fundamentally about abusing an authenticated session's ambient authority,
// so an unauthenticated request is already rejected by the existing auth
// check regardless of Origin.
//
// Fails closed in every ambiguous case: missing Origin, malformed Origin,
// and missing Host/X-Forwarded-Host all reject, exactly like a genuine
// cross-origin mismatch. No Referer fallback — Referer is weaker (easily
// absent for legitimate privacy-respecting reasons) and was explicitly
// rejected as a fallback mechanism.
export type OriginValidationResult =
  | { ok: true }
  | { ok: false; reason: "missing_origin" | "malformed_origin" | "missing_host" | "origin_mismatch" };

// `host`/`x-forwarded-host` are identical on Vercel (confirmed against
// Vercel's own current docs) and reflect how Vercel's edge actually routed
// this specific request to this deployment — the production custom domain,
// or that exact Preview deployment's own *.vercel.app host. This is NOT the
// same trust class as `x-forwarded-for` (which Vercel explicitly documents
// it overwrites to prevent client spoofing) — for a request that genuinely
// reached this deployment, host/x-forwarded-host already reflects Vercel's
// own routing decision, not arbitrary client-supplied authority. Preferring
// x-forwarded-host (falling back to host) matches the exact strategy
// reviewed and approved for this helper.
function resolveDeploymentHost(request: Request): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

export function validateSameOriginRequest(request: Request): OriginValidationResult {
  const origin = request.headers.get("origin");
  if (!origin) {
    return { ok: false, reason: "missing_origin" };
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return { ok: false, reason: "malformed_origin" };
  }

  const deploymentHost = resolveDeploymentHost(request);
  if (!deploymentHost) {
    return { ok: false, reason: "missing_host" };
  }

  if (originHost !== deploymentHost) {
    return { ok: false, reason: "origin_mismatch" };
  }

  return { ok: true };
}
