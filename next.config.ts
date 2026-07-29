import type { NextConfig } from "next";

// Media Library (Phase 15) — the one remote image host this app ever
// needs to trust. Deliberately the exact hostname for this project's
// Vercel Blob store ("BigRedMedia"), not a wildcard — next/image's
// optimizer refuses to render any external hostname that isn't explicitly
// allow-listed here, and a narrow, specific pattern is safer than a broad
// one. This hostname is a public CDN address, not a secret — it's the
// same one that appears in every public <img src> once media is uploaded.
// Local /public images (logos, existing product/portfolio photos) are
// completely unaffected — remotePatterns only applies to http(s) sources.
const BLOB_HOST = "https://cgub3jazsflfunrr.public.blob.vercel-storage.com";

// Phase 21A-2 — production security headers/CSP. Re-derived from a fresh
// inspection of this app's actual browser resource needs immediately
// before writing this (see CLAUDE.md "Security Headers (Phase 21A-2)" for
// the full writeup), not assumed from the Phase 21A architecture review:
//   - no next/font, no Google Fonts, no @font-face anywhere — no fonts src needed
//   - zero <script> tags anywhere in source, zero analytics/CDN-shipped
//     client packages in package.json — script-src stays 'self' only
//   - exactly one external host, the Blob CDN above, used for both images
//     and video — matches next.config.ts's own images.remotePatterns
//   - zero <iframe> usage anywhere — frame-ancestors 'none' is safe
//   - the one client-side fetch() (CheckoutView.tsx) targets "/api/orders",
//     same-origin — connect-src 'self' is sufficient, no external API host
//     is ever called from the browser
//   - Google OAuth (src/app/admin/login/page.tsx) is a Server-Action-driven
//     top-level redirect (signIn() inside a "use server" form action), never
//     a popup/window.open — confirmed no window.open anywhere in source, so
//     Cross-Origin-Opener-Policy: same-origin does not interfere with it
//   - 22 files use React inline style={{}} — style-src needs 'unsafe-inline';
//     no <style> block or CSS-in-JS library exists, so nothing beyond that
// No new external host has been introduced anywhere in this codebase since
// that review — confirmed by this fresh re-grep, not assumed.
// Phase 21C-2C — Stripe Payment Element additions, sourced directly from
// Stripe's own current official security guide (docs.stripe.com/security/
// guide) at implementation time, not assumed. Every addition is an exact
// Stripe-owned hostname — no wildcards beyond Stripe's own documented
// "*.js.stripe.com". Stripe's guide states this exists so "Stripe.js [can]
// improve performance by starting frames on different origins, where
// possible" — a real Stripe-side optimization, not a wildcard this app
// introduced for its own convenience. Real browser acceptance testing
// (headless Chrome, full network capture) confirmed every resource in that
// session — script, controller iframe, every Elements sub-frame — actually
// loaded from the exact origin "js.stripe.com", never a genuine subdomain;
// the wildcard was NOT exercised in that one session, but is kept anyway
// per Stripe's own documented reasoning, since a single session can't rule
// out Stripe's own infrastructure using a subdomain under different
// conditions (network/rollout/A-B). frame-ancestors/object-src/base-uri/
// form-action are untouched; Permissions-Policy's payment=() below is also
// deliberately untouched — see CLAUDE.md "Stripe Payment UI (Phase 21C-2C)"
// for why (this phase is scoped to card-only, so no wallet/Payment-Request-
// API capability is needed, and relaxing payment=() was explicitly avoided).
const STRIPE_JS_HOSTS = "https://js.stripe.com https://*.js.stripe.com";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${STRIPE_JS_HOSTS}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' ${BLOB_HOST} https://*.stripe.com data:`,
  `media-src 'self' ${BLOB_HOST}`,
  `connect-src 'self' https://api.stripe.com`,
  // New directive — previously absent, which meant it fell back to
  // default-src 'self' and would have blocked Stripe's iframe entirely.
  // hooks.stripe.com covers redirect-based payment-method authentication
  // frames; not otherwise expected to be reached given the card-only
  // configuration (see stripe.ts), but included per Stripe's own guidance.
  `frame-src ${STRIPE_JS_HOSTS} https://hooks.stripe.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  // 180 days, deliberately no `preload` — preload submission is a
  // one-way, hard-to-reverse commitment to browsers' built-in HSTS
  // preload lists, not something to opt into as a first production step.
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Legacy defense alongside frame-ancestors above — modern browsers
  // honor CSP's frame-ancestors and ignore this, but older/non-CSP-aware
  // clients still respect it. DENY matches frame-ancestors 'none' exactly.
  { key: "X-Frame-Options", value: "DENY" },
  // Provisionally approved — see CLAUDE.md for the real-OAuth-flow
  // reasoning (a top-level Server Action redirect, never a popup) and the
  // manual-acceptance requirement before this is considered fully proven.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cgub3jazsflfunrr.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  // Next.js's own Server Action request-body parser defaults to 1 MB,
  // independent of and far below the application's approved 8 MB image
  // limit — src/server/validate-media-upload.ts's MAX_IMAGE_UPLOAD_BYTES
  // is the real, unchanged 8 MB policy; this only raises the outer
  // transport ceiling enough to let a valid 8 MB file's multipart/
  // form-data envelope (boundary strings, headers, the alt/caption
  // fields) actually reach uploadMediaAction() to be checked. Deliberately
  // NOT set to 8mb, which would risk clipping a genuinely-8MB image before
  // the app's own validation ever runs.
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
  // Applied centrally, to every route, rather than per-route-group — this
  // app has no route whose actual external-resource needs differ from any
  // other (the Blob CDN is used by both public pages and the admin Media
  // Library; nothing else calls out to any other external host anywhere).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
