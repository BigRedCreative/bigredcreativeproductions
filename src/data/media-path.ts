// Shared by product validation (products.validate.ts) and website-content
// validation (src/server/validate-website-content.ts) — a path counts as
// "local" simply by not being an absolute http(s) URL. Extracted into its
// own module in Phase 14 so both validators reuse the exact same rule
// instead of maintaining two copies.
export function isLocalMediaPath(src: string): boolean {
  return !/^https?:\/\//i.test(src);
}
