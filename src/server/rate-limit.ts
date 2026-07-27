import "server-only";
import { createHmac } from "node:crypto";
import { and, asc, count, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimitEvents, brainRequests, aiGenerationJobs } from "@/db/schema";
import { DAILY_IMAGE_GENERATION_CAP } from "@/data/creative-studio";

// ===========================================================================
// Phase 21A-1C — the shared, server-only rate limiter. Two-layer design (see
// CLAUDE.md's Phase 21A architecture report): this module is the Postgres
// half, covering authenticated/admin-scoped short-window bursts that a
// network-edge firewall can't naturally express (it keys on admin_users.id,
// not just source IP). Public/unauthenticated surfaces (admin login/OAuth,
// POST /api/orders, the contact form) are protected separately, entirely
// outside this codebase, by Vercel Firewall (IP-based, dashboard-configured,
// zero app code) — this module is never involved in those.
// ===========================================================================

// --- Closed scope vocabulary ------------------------------------------------
// Every scope this limiter knows about. Never accept an arbitrary string as
// a scope from any caller — the exported functions below only ever pass one
// of these four literals, never a value derived from request input.
export const RATE_LIMIT_SCOPES = [
  "brain_admin",
  "creative_studio_image",
  "video_upload_token_admin",
  "video_upload_token_ip",
  "order_creation_ip",
] as const;
export type RateLimitScope = (typeof RATE_LIMIT_SCOPES)[number];

// --- Event semantics ---------------------------------------------------------
// A row in rate_limit_events represents exactly ONE accepted,
// quota-consuming action for its (scope, key) pair. A REJECTED request
// never inserts a row — this is what stops a client that's already been
// blocked from filling the table indefinitely just by hammering an
// already-exceeded endpoint (retrying after a rejection costs the caller
// nothing extra to the database, but never gains them anything either,
// since the same check runs again next time with the same result until the
// window actually clears). This also means "remaining" is always computed
// from real, accepted history — never inflated by rejected attempts.

// --- Window/limit configuration ---------------------------------------------
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type DbClient = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
type HistoricalCountFn = (tx: Tx, key: string, windowStart: Date) => Promise<number>;

type RateLimitTier = {
  // Internal label only (e.g. "burst" | "daily" | "hourly") — never the
  // rate-limit KEY itself (admin id / hashed IP), safe to surface to a
  // caller for branching/messaging purposes.
  tierId: string;
  limit: number;
  windowMs: number;
  // Optional transition-safety fallback — see RATE_LIMIT_ENFORCEMENT_START
  // below for the full writeup. Only the two 24h "daily" tiers use this.
  historicalCount?: HistoricalCountFn;
};

// --- Transition safety (Phase 21A-1B/1C deployment) -------------------------
// rate_limit_events begins completely empty the moment this migration/code
// ships. Without accounting for that, an admin who had already made, say,
// 15 real Brain requests earlier today (counted the OLD way, against
// brain_requests) would find the NEW rolling-24h-per-admin counter reading
// zero and effectively receive a fresh extra allowance on top of what
// they'd already used — exactly the "accidental double allowance" risk
// flagged before implementation began.
//
// Fix: the two DAILY tiers (brain_admin, creative_studio_image) combine —
//   (a) live rows in rate_limit_events with created_at > windowStart, PLUS
//   (b) historical rows in brain_requests / ai_generation_jobs for that
//       same admin, with created_at in [windowStart, RATE_LIMIT_ENFORCEMENT_START)
// — a pure READ-TIME union at gate-check time. Nothing is copied/backfilled
// into rate_limit_events, and neither historical table is ever mutated.
//
// This is fixed once, at module load (effectively "the moment this
// deployment went live") rather than recomputed per request. The
// historical term is self-terminating by construction: once
// `windowStart >= RATE_LIMIT_ENFORCEMENT_START` (24 hours after deploy),
// every historicalCount() query's own WHERE clause (`createdAt <
// RATE_LIMIT_ENFORCEMENT_START AND createdAt > windowStart`) becomes
// unsatisfiable and always returns 0 — no cleanup job or manual cutover
// step is ever needed for this mechanism specifically.
//
// The 5-minute BURST tiers deliberately do NOT get this historical
// fallback: the realistic "already made some requests in the last 5
// minutes right as this deployed" risk is low-impact (a few minutes of
// slightly generous burst allowance, once, at deploy) and self-heals
// within single-digit minutes regardless — not worth the extra query cost
// on every single request forever.
export const RATE_LIMIT_ENFORCEMENT_START = new Date();

async function countHistoricalBrainRequests(tx: Tx, adminUserId: string, windowStart: Date): Promise<number> {
  const [row] = await tx
    .select({ c: count() })
    .from(brainRequests)
    .where(
      and(
        eq(brainRequests.requestedByAdminUserId, adminUserId),
        gt(brainRequests.createdAt, windowStart),
        lt(brainRequests.createdAt, RATE_LIMIT_ENFORCEMENT_START),
      ),
    );
  return row.c;
}

async function countHistoricalImageGenerations(tx: Tx, adminUserId: string, windowStart: Date): Promise<number> {
  const [row] = await tx
    .select({ c: count() })
    .from(aiGenerationJobs)
    .where(
      and(
        eq(aiGenerationJobs.requestedByAdminUserId, adminUserId),
        gt(aiGenerationJobs.createdAt, windowStart),
        lt(aiGenerationJobs.createdAt, RATE_LIMIT_ENFORCEMENT_START),
      ),
    );
  return row.c;
}

// The one place every limit/window value is declared. `brain_admin`'s
// "daily" limit (20) and `creative_studio_image`'s "daily" limit
// (DAILY_IMAGE_GENERATION_CAP, imported from the existing, already-approved
// data constant rather than re-declared, to keep exactly one source of
// truth for that number) intentionally match the pre-existing,
// already-real-tested product caps documented in CLAUDE.md — this feature
// changes HOW they're enforced (rate_limit_events, per-admin, rolling
// window), not the approved numeric values themselves. The two new "burst"
// tiers (5/5min, 3/5min) are new, additive short-window abuse protection on
// top of those existing caps, per the approved Phase 21A architecture.
const RATE_LIMIT_TIERS: Record<RateLimitScope, readonly RateLimitTier[]> = {
  brain_admin: [
    { tierId: "burst", limit: 5, windowMs: FIVE_MINUTES_MS },
    { tierId: "daily", limit: 20, windowMs: TWENTY_FOUR_HOURS_MS, historicalCount: countHistoricalBrainRequests },
  ],
  creative_studio_image: [
    { tierId: "burst", limit: 3, windowMs: FIVE_MINUTES_MS },
    {
      tierId: "daily",
      limit: DAILY_IMAGE_GENERATION_CAP,
      windowMs: TWENTY_FOUR_HOURS_MS,
      historicalCount: countHistoricalImageGenerations,
    },
  ],
  // Conservative, documented starting point for legitimate Media Library
  // usage: even a large batch session building out a new portfolio/service
  // gallery (several video uploads in one sitting) comfortably fits well
  // under 20 token issuances in an hour, while still meaningfully bounding
  // a runaway loop or a compromised admin session from minting unlimited
  // upload tokens.
  video_upload_token_admin: [{ tierId: "hourly", limit: 20, windowMs: ONE_HOUR_MS }],
  // Per approved Phase 21A architecture: 30 token requests per rolling
  // hour, keyed on the HMAC of the requester's IP (see hashIpForRateLimit
  // below) — never the raw IP.
  video_upload_token_ip: [{ tierId: "hourly", limit: 30, windowMs: ONE_HOUR_MS }],
  // Phase 21C-1 — POST /api/orders is intentionally public (no session,
  // no ambient authority — see CLAUDE.md's Phase 21C audit for why this
  // is an abuse-prevention concern, not CSRF), so this is keyed on the
  // HMAC of the requester's IP, never on anything client-submitted
  // (email, name, order id, request body). Two tiers, mirroring the
  // existing burst+window shape already used for the admin-scoped
  // products: "burst" catches rapid bot/script fire, "hourly" catches
  // sustained abuse from one IP over a longer window. No historical
  // fallback needed — there is no pre-existing enforcement mechanism for
  // order-creation-per-IP to reconcile against, so rate_limit_events
  // starting empty for this scope is correct, not a transition-safety gap.
  order_creation_ip: [
    { tierId: "burst", limit: 5, windowMs: FIVE_MINUTES_MS },
    { tierId: "hourly", limit: 10, windowMs: ONE_HOUR_MS },
  ],
};

// --- Result shape -------------------------------------------------------------
// Deliberately never includes the internal rate-limit KEY (admin id / IP
// hash) — only a small, safe summary a caller can use to build a
// user-facing message or an HTTP 429 body.
export type RateLimitResult =
  | { allowed: true; limit: number; remaining: number }
  | { allowed: false; tierId: string; limit: number; remaining: 0; retryAfterSeconds: number };

// --- Atomicity / concurrency --------------------------------------------------
// A naive "COUNT existing rows, then INSERT" is NOT concurrency-safe: two
// simultaneous requests can both run their COUNT before either INSERTs,
// both see the same (under-limit) count, and both proceed — bypassing the
// limit. This is prevented with Postgres's own native, zero-new-dependency
// mechanism: a TRANSACTION-LEVEL ADVISORY LOCK, keyed by (scope, key),
// held for the duration of the check+insert transaction.
//
// `pg_advisory_xact_lock(key1 int, key2 int)` blocks until it can acquire a
// lock in Postgres's global advisory-lock namespace for that exact 2-int
// key pair, and releases it AUTOMATICALLY at transaction end (COMMIT or
// ROLLBACK) — no manual unlock call, no risk of a leaked lock surviving a
// crashed request. `hashtext(scope)`/`hashtext(key)` deterministically
// reduce the scope string and the (admin id / IP hash) key string to two
// int4s for this call — two truly different (scope, key) pairs colliding
// on the SAME 64-bit combined lock id is astronomically unlikely, and even
// if it happened, the only consequence is two unrelated checks briefly
// serializing against each other (a performance nicety, never a
// correctness problem) — never a false NON-serialization, which is the
// only failure mode that would actually matter here.
//
// A concurrent multi-entry check (the video-upload-token route checks TWO
// scopes — admin AND ip — together) acquires every lock it needs UP FRONT,
// in a fixed, deterministic sort order (by "scope:key" string), before
// doing any counting. This specific ordering is what prevents a deadlock
// between two concurrent multi-entry checks that would otherwise try to
// acquire the same two locks in opposite orders.
function sortEntries(entries: readonly { scope: RateLimitScope; key: string }[]) {
  return [...entries].sort((a, b) => `${a.scope}:${a.key}`.localeCompare(`${b.scope}:${b.key}`));
}

// The one place a scope+key check is performed AND (if allowed) recorded,
// atomically, for one or more (scope, key) pairs together. Multi-entry
// calls succeed or fail as a UNIT — either every entry's quota is consumed
// together, or none is. This matters specifically for the video-upload-
// token route: without it, a request that passes the admin-scoped check
// but fails the IP-scoped check would have already consumed one of the
// admin's limited quota slots for a token that was never actually issued.
export async function checkAndRecordRateLimit(
  entries: readonly { scope: RateLimitScope; key: string }[],
): Promise<RateLimitResult> {
  if (entries.length === 0) {
    throw new Error("checkAndRecordRateLimit requires at least one (scope, key) entry.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    for (const entry of sortEntries(entries)) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${entry.scope}), hashtext(${entry.key}))`);
    }

    const now = new Date();
    let minRemaining = Number.POSITIVE_INFINITY;
    let limitForMinRemaining = 0;

    for (const entry of entries) {
      for (const tier of RATE_LIMIT_TIERS[entry.scope]) {
        const windowStart = new Date(now.getTime() - tier.windowMs);

        const [liveRow] = await tx
          .select({ c: count() })
          .from(rateLimitEvents)
          .where(and(eq(rateLimitEvents.scope, entry.scope), eq(rateLimitEvents.key, entry.key), gt(rateLimitEvents.createdAt, windowStart)));
        const liveCount = liveRow.c;

        let historicalCount = 0;
        if (tier.historicalCount && windowStart < RATE_LIMIT_ENFORCEMENT_START) {
          historicalCount = await tier.historicalCount(tx, entry.key, windowStart);
        }

        const totalCount = liveCount + historicalCount;

        if (totalCount >= tier.limit) {
          const [oldestLive] = await tx
            .select({ createdAt: rateLimitEvents.createdAt })
            .from(rateLimitEvents)
            .where(and(eq(rateLimitEvents.scope, entry.scope), eq(rateLimitEvents.key, entry.key), gt(rateLimitEvents.createdAt, windowStart)))
            .orderBy(asc(rateLimitEvents.createdAt))
            .limit(1);
          // If the block is (partly) driven by historical rows with no
          // live row yet in-window, there's no precise "oldest live event"
          // to count forward from — fall back to the full tier window as
          // a conservative (safe-to-overestimate-wait) estimate.
          const retryAfterMs = oldestLive ? oldestLive.createdAt.getTime() + tier.windowMs - now.getTime() : tier.windowMs;
          return {
            allowed: false,
            tierId: tier.tierId,
            limit: tier.limit,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
          };
        }

        const remaining = tier.limit - totalCount;
        if (remaining < minRemaining) {
          minRemaining = remaining;
          limitForMinRemaining = tier.limit;
        }
      }
    }

    // Every tier of every entry passed — record exactly one accepted event
    // per entry, together, inside the same transaction that just verified
    // room for all of them.
    for (const entry of entries) {
      await tx.insert(rateLimitEvents).values({ scope: entry.scope, key: entry.key });
    }

    return { allowed: true, limit: limitForMinRemaining, remaining: Math.max(0, minRemaining - 1) };
  });
}

// --- IP hashing (privacy-safe keying for the one IP-scoped limit) -----------
const IP_HASH_CONTEXT = "rate-limit-ip";
const UNKNOWN_IP_SENTINEL = "unknown-ip";

// A two-step derive-then-hash pattern, not literal secret+label string
// concatenation: HMAC(AUTH_SECRET, "rate-limit-ip") first produces a
// context-specific 32-byte DERIVED key, which is then used as the HMAC key
// for the actual per-request digest: HMAC(derivedKey, normalizedIp). This
// avoids any ambiguity a naive concatenation could introduce, and means
// this module's derived key material is never literally AUTH_SECRET
// itself (which also signs Auth.js sessions) nor any value that could be
// compared back against that other use.
function deriveIpHashKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(IP_HASH_CONTEXT).digest();
}

// Returns an opaque, fixed-length (64 hex char) SHA-256 digest — NEVER the
// raw IP. A plain unsalted hash of an IPv4 address was explicitly rejected
// during architecture review: the entire IPv4 space (~4.3 billion values)
// is small enough to exhaustively pre-hash, making a plain hash trivially
// reversible — a keyed HMAC is the actual minimum needed for "a safer
// representation than raw IP" to mean anything.
//
// Returns null when AUTH_SECRET is unavailable. Every caller MUST treat
// null as "fail closed" (deny) — never as "skip this check" and never as
// "fall back to storing/comparing the raw IP."
export function hashIpForRateLimit(rawIp: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const derivedKey = deriveIpHashKey(secret);
  const normalized = rawIp.trim().toLowerCase();
  return createHmac("sha256", derivedKey).update(normalized).digest("hex");
}

// Reads the real client IP from standard proxy headers — Vercel's edge
// network sets `x-forwarded-for` to the genuine connecting client IP (the
// first entry in the list); `x-real-ip` is a fallback for other/local
// environments. This function only ever returns the value or null — it
// never logs or persists it; the raw IP is fed directly into
// hashIpForRateLimit()/the "unknown IP" sentinel immediately by the
// caller and is never written to the database, audit_log, or the console.
export function extractClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  return null;
}

// --- Product-specific convenience wrappers -----------------------------------
// Each of these is the ONE place its caller needs to know about — they
// hide the (scope, key) shape from src/server/brain/handle-request.ts,
// src/server/creative-studio/generate-image.ts, and the video-upload-token
// route entirely.

export async function checkBrainRateLimit(adminUserId: string): Promise<RateLimitResult> {
  return checkAndRecordRateLimit([{ scope: "brain_admin", key: adminUserId }]);
}

export async function checkCreativeStudioRateLimit(adminUserId: string): Promise<RateLimitResult> {
  return checkAndRecordRateLimit([{ scope: "creative_studio_image", key: adminUserId }]);
}

// Both the admin-scoped AND the IP-scoped limit must pass before a video
// upload token is issued — checked and recorded together (see
// checkAndRecordRateLimit's own comment on why multi-entry calls are
// all-or-nothing). When no IP can be determined at all (no proxy header
// present — realistically only possible outside Vercel's own edge, e.g.
// certain local-dev setups), every such request shares one fixed
// "unknown-ip" bucket rather than skipping IP-scoped enforcement entirely
// — a deliberately conservative choice: ambiguity fails toward MORE
// restrictive shared throttling, never toward no throttling at all.
export async function checkVideoUploadTokenRateLimit(adminUserId: string, rawIp: string | null): Promise<RateLimitResult> {
  let ipKey: string;
  if (rawIp === null) {
    ipKey = UNKNOWN_IP_SENTINEL;
  } else {
    const hashed = hashIpForRateLimit(rawIp);
    if (hashed === null) {
      // AUTH_SECRET unavailable — fail closed for the whole combined check
      // without ever touching the database or consuming the admin-scoped
      // quota for a check that can't be safely completed.
      console.error("Rate limiter: AUTH_SECRET unavailable, failing closed for video-upload-token IP check.");
      const ipTier = RATE_LIMIT_TIERS.video_upload_token_ip[0];
      return { allowed: false, tierId: "auth_secret_unavailable", limit: ipTier.limit, remaining: 0, retryAfterSeconds: 60 };
    }
    ipKey = hashed;
  }

  return checkAndRecordRateLimit([
    { scope: "video_upload_token_admin", key: adminUserId },
    { scope: "video_upload_token_ip", key: ipKey },
  ]);
}

// Phase 21C-1 — POST /api/orders's own rate limit. IP-only (single-entry,
// unlike the video-token pair) since there is no admin identity on this
// public route to also key against. Throws (never silently falls back to
// allowing the request) when AUTH_SECRET is unavailable — the caller
// (src/app/api/orders/route.ts) is responsible for catching that and
// every other limiter failure and turning it into a controlled, fail-closed
// 503, per the approved Phase 21C-1 design — this function itself does not
// swallow or downgrade a fail-closed condition into a false "allowed".
export async function checkOrderCreationRateLimit(rawIp: string | null): Promise<RateLimitResult> {
  let ipKey: string;
  if (rawIp === null) {
    ipKey = UNKNOWN_IP_SENTINEL;
  } else {
    const hashed = hashIpForRateLimit(rawIp);
    if (hashed === null) {
      throw new Error("Rate limiter: AUTH_SECRET unavailable for order-creation IP check.");
    }
    ipKey = hashed;
  }

  return checkAndRecordRateLimit([{ scope: "order_creation_ip", key: ipKey }]);
}
