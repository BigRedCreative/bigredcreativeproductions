import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import { getAdminUserOrNull } from "@/server/require-admin-user";
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_UPLOAD_BYTES } from "@/server/validate-video-upload";
import { checkVideoUploadTokenRateLimit, extractClientIp } from "@/server/rate-limit";
import { validateSameOriginRequest } from "@/server/validate-origin";
import { recordAuditEvent } from "@/server/audit-log";
import { getDb } from "@/db";

// The ONE endpoint that issues a short-lived, scoped Vercel Blob client
// upload token for video — the reason video uses a client-direct-to-Blob
// upload instead of the image path's Server Action body-relay: a 100 MB
// video would either force a global next.config.ts Server Action
// bodySizeLimit increase (affecting every action in the app, not just
// this one) or push a huge request through a serverless function's
// memory/duration budget for no benefit. See CLAUDE.md "Video Media
// Library" for the full architecture writeup.
//
// This is a JSON API, not a page — getAdminUserOrNull() (not
// requireAdminUser()) is used deliberately: requireAdminUser() redirects
// on failure, which would send the @vercel/blob client SDK's internal
// fetch() a 307 to /admin/login instead of a clean 401 it can actually
// surface as an error to the uploading admin.
//
// The actual database write does NOT happen via this route's
// onUploadCompleted callback — Vercel Blob calls that as a server-to-
// server webhook requiring a publicly reachable URL, which a local `next
// dev` server cannot receive without a tunnel. Instead, the browser
// calls a normal Server Action (confirmVideoUploadAction) once upload()
// resolves — see mutate-media.ts — which works identically in local dev,
// preview, and production.
export async function POST(request: Request): Promise<Response> {
  const adminUser = await getAdminUserOrNull();
  if (!adminUser) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  // Phase 21B — same-origin enforcement, for this authenticated request
  // specifically. Runs BEFORE the rate limiter and BEFORE any Blob
  // interaction — a rejected request here has zero provider/storage side
  // effects and consumes no quota. See src/server/validate-origin.ts for
  // the full design rationale. Audited (never the Origin/Host/IP values
  // themselves, only that a rejection happened and why, in a closed
  // vocabulary) so a genuine cross-origin attempt against real admin
  // authority leaves a real trace.
  const originResult = validateSameOriginRequest(request);
  if (!originResult.ok) {
    await recordAuditEvent(getDb(), {
      adminUserId: adminUser.id,
      action: "csrf.origin_rejected",
      entityType: "security",
      entityId: "video_upload_token",
      metadata: { reason: originResult.reason },
    });
    return Response.json({ error: "Request rejected." }, { status: 403 });
  }

  // Phase 21A-1C — BOTH the authenticated-admin limit AND the
  // privacy-safe IP limit must pass before a token is issued (checked and
  // recorded together — see checkVideoUploadTokenRateLimit's own comment
  // on why this is all-or-nothing). This protects token ISSUANCE only —
  // it never touches, and has no bearing on, ordinary public image/video
  // delivery from Blob, which isn't a token-gated operation at all.
  const clientIp = extractClientIp(request.headers);
  const rateLimitResult = await checkVideoUploadTokenRateLimit(adminUser.id, clientIp);
  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [...ALLOWED_VIDEO_CONTENT_TYPES],
          maximumSizeInBytes: MAX_VIDEO_UPLOAD_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return Response.json(jsonResponse);
  } catch (error) {
    console.error("Video upload token generation failed", { error });
    return Response.json({ error: "We couldn't start this upload. Please try again." }, { status: 400 });
  }
}
