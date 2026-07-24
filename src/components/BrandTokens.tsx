import type { CSSProperties, ReactNode } from "react";
import { getPublishedBrandTokens, getDraftBrandTokens } from "@/server/queries/brand";
import type { BrandTokenValues } from "@/server/queries/brand";

type BrandTokensProps = {
  // "published" (default) is what every public page uses. "draft" is used
  // exclusively by the authenticated /admin/website/branding/preview route
  // — never reachable from a public URL.
  variant?: "published" | "draft";
  children: ReactNode;
};

// Option B from the Phase 16 architecture approval: injected per-page
// (the same place Header already is), NOT in the root layout — the root
// layout wraps /admin too, and admin.css deliberately reuses the same
// custom-property names as globals.css, so a root-layout injection would
// leak published/draft brand colors into the admin dashboard itself. This
// component is only ever imported by public top-level pages and the one
// dedicated brand-preview page — never by any other admin route — so
// there is no leak path.
//
// Renders a wrapping element (not :root) with the resolved colors set as
// real CSS custom properties, explicitly re-declaring `background`/`color`
// on itself too — necessary because `body`'s own background/color in
// globals.css is fixed at the body element itself, which is an ANCESTOR
// of this wrapper, not a descendant; only descendants pick up a custom
// property redeclared here. Without this, any section relying on the
// inherited default background (most of them) would still show body's
// original, unoverridden color. See CLAUDE.md "Brand Controls" for the
// full writeup.
function buildStyle(brand: BrandTokenValues): CSSProperties {
  return {
    ["--red" as string]: brand.primaryColor,
    ["--acid" as string]: brand.accentColor,
    ["--cream" as string]: brand.backgroundColor,
    ["--white" as string]: brand.surfaceColor,
    ["--text" as string]: brand.textColor,
    ["--gray" as string]: brand.mutedTextColor,
    ["--black" as string]: brand.borderColor,
    ["--button-bg" as string]: brand.buttonBackground,
    ["--button-text" as string]: brand.buttonText,
    ["--button-hover-bg" as string]: brand.buttonHoverBackground,
    background: "var(--cream)",
    color: "var(--text)",
  };
}

export default async function BrandTokens({ variant = "published", children }: BrandTokensProps) {
  const brand = variant === "draft" ? await getDraftBrandTokens() : await getPublishedBrandTokens();
  return <div style={buildStyle(brand)}>{children}</div>;
}
