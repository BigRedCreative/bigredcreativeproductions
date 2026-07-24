import "server-only";
import { isLocalMediaPath } from "@/data/media-path";

// Shared, small, composable validators for Phase 14 website-content
// mutations. None of this replaces collectProductValidationErrors() — it's
// a parallel set of primitives for a different content shape, following
// the same "collect everything, return inline, never partial-write"
// philosophy already established by products.validate.ts/orders.validate.ts.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ABSOLUTE_PROTOCOLS = new Set(["https:"]);

export function validateRequiredText(value: string, label: string): string | null {
  return value?.trim() ? null : `${label} is required`;
}

export function validateEmailShape(value: string, label: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return `${label} is required`;
  return EMAIL_PATTERN.test(trimmed) ? null : `${label} must be a valid email address`;
}

// Accepts: a relative path ("/store"), a same-page hash ("#contact"), a
// mailto: link with a valid-looking address, or an absolute https:// URL.
// Rejects everything else — javascript:, data:, vbscript:, bare http://,
// protocol-relative "//host" URLs, and anything malformed. This is the ONE
// place any admin-editable href gets checked: Button.tsx/Header.tsx render
// every href directly with zero runtime sanitization, exactly like every
// other href in this codebase today, so safety has to come from what's
// allowed to be written, not from escaping at render time.
export function validateHref(value: string, label: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return `${label} is required`;
  if (trimmed.startsWith("//")) return `${label} may not be a protocol-relative URL`;
  if (trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("#") && trimmed.length > 1) return null;
  if (/^mailto:/i.test(trimmed)) {
    return validateEmailShape(trimmed.slice("mailto:".length), `${label} (mailto address)`);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return `${label} is not a valid URL`;
  }
  if (!ALLOWED_ABSOLUTE_PROTOCOLS.has(parsed.protocol)) {
    return `${label} must be a relative path, "#anchor", "mailto:", or an https:// URL (got "${parsed.protocol}")`;
  }
  return null;
}

// Stricter than validateHref — used only for site_settings.canonicalUrl,
// which feeds `new URL(...)` as layout.tsx's metadataBase. Must always be
// a full absolute https URL; relative paths/hashes are not valid here.
export function validateAbsoluteHttpsUrl(value: string, label: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return `${label} is required`;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return `${label} must be a valid absolute URL`;
  }
  if (parsed.protocol !== "https:") return `${label} must use https://`;
  return null;
}

// Optional-field media path check — local-path-only, same rule products
// already enforce. Callers decide required-ness separately (most
// website-content media fields are reserved/optional this phase).
export function validateOptionalLocalMediaPath(value: string, label: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return isLocalMediaPath(trimmed) ? null : `${label} must be a local path, not an external URL`;
}

export function validateRequiredLocalMediaPath(value: string, label: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return `${label} is required`;
  return isLocalMediaPath(trimmed) ? null : `${label} must be a local path, not an external URL`;
}
