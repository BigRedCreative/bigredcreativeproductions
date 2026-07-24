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
};

export default nextConfig;
