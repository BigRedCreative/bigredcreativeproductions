import {
  boolean,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { Media } from "@/data/media";
import type { ProductAddOn, ProductOption, ProductPackage, ProductPricing } from "@/data/products";
import type { CartAddOnSelection, CartOptionSelection, CartPackageSelection } from "@/data/cart";
import type { OrderPricingSummary } from "@/data/orders";

// Server-side persistence layer — see CLAUDE.md "Backend + database
// foundation" for the full architecture writeup. This schema deliberately
// reuses the existing application types (Media, ProductPricing,
// CartOptionSelection, etc.) for its JSONB columns rather than defining
// parallel DB-only types, so the database and the application stay in sync
// automatically instead of two shapes that could silently drift.
//
// CORE PRINCIPLE: live `products` rows are mutable; `orders`/`order_lines`
// are historical snapshots. An order_line must never depend on the current
// state of its product to render correctly — everything needed is frozen
// onto the row at creation time.

// Human-readable order numbers (BRCP-####) are generated from this
// sequence, never from SELECT MAX()+1 — Postgres sequences are safe under
// concurrent access by design. See src/server/create-order.ts for how the
// formatted "BRCP-####" string is produced from nextval().
export const orderNumberSeq = pgSequence("order_number_seq", {
  startWith: 1001,
  increment: 1,
});

// ---------------------------------------------------------------------
// Admin users — authorization only, not identity. Auth.js (Google OAuth,
// JWT session strategy, no database adapter) establishes WHO someone is;
// this table is the separate, independent decision of WHETHER that person
// may use the admin system. There is no `authProviderUserId` column —
// matching is by normalized email against the Google-verified identity,
// which is sufficient since Google OAuth only ever returns a verified
// mailbox. No password columns exist here or anywhere in this schema —
// Auth.js/Google own all credential handling.
//
// `active` and `role` are read fresh from this table on every admin
// request (see src/server/require-admin-user.ts) — never trusted from a
// session/JWT claim, so deactivating someone takes effect on their very
// next request regardless of how long their session token remains valid.
// ---------------------------------------------------------------------
export const ADMIN_ROLES = ["owner", "admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Always stored normalized (trim + lowercase), same convention as
    // customers.email.
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().$type<AdminRole>(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_email_unique").on(table.email)],
);

// ---------------------------------------------------------------------
// Audit log — small and general on purpose, not product-specific. The
// one place any admin write action's "who did what, to what, when" gets
// recorded. Append-only: nothing in this codebase ever updates or deletes
// an audit_log row once written, so there is no updatedAt column, matching
// the same immutable-record philosophy already used for order_lines.
//
// `metadata` must stay small, structured, and non-sensitive — e.g.
// { slug, title } or { from: "draft", to: "published" }. Never a full
// entity payload, never secrets, never customer/order PII.
//
// Written inside the SAME db.transaction() as the mutation it records
// (see src/server/audit-log.ts), so a logged event and the change it
// describes can never drift apart — either both happen or neither does.
// ---------------------------------------------------------------------
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  // e.g. "product.created" | "product.updated" | "product.published" | "product.archived"
  action: text("action").notNull(),
  // e.g. "product" — the kind of thing this event is about, not scoped to
  // products specifically; future admin writes (orders, customers, ...)
  // reuse this same table.
  entityType: text("entity_type").notNull(),
  // The entity's permanent id — text, not uuid, since e.g. Product.id is a
  // plain stable string, not necessarily a UUID.
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------
// Products — schema only. No real rows are inserted this phase (the
// public catalog stays on src/data/products.ts until a content/admin
// workflow exists — see CLAUDE.md). This table exists so order_lines has
// something real to (optionally) reference, and so a future admin can
// start creating rows here without another schema migration.
//
// media/options/packages/addOns are JSONB, deliberately not normalized
// into separate tables yet — see CLAUDE.md for the reasoning. They mirror
// Product's shape in src/data/products.ts field-for-field.
// ---------------------------------------------------------------------
export const products = pgTable("products", {
  // Matches the existing Product.id convention: a stable string, not
  // necessarily a UUID (e.g. "prod_packaging_design_standard").
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  productType: text("product_type").notNull(), // "physical" | "service"
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull(),
  summary: text("summary").notNull(),
  fullDescription: text("full_description").notNull(),
  status: text("status").notNull(), // "draft" | "published" | "archived"
  featured: boolean("featured").notNull().default(false),
  category: text("category").notNull(),
  pricing: jsonb("pricing").notNull().$type<ProductPricing>(),
  relatedServiceSlug: text("related_service_slug"),
  ctaLabel: text("cta_label").notNull(),
  seo: jsonb("seo").notNull().$type<{ title: string; description: string }>(),
  media: jsonb("media").notNull().$type<Media[]>().default([]),
  options: jsonb("options").$type<ProductOption[]>(),
  packages: jsonb("packages").$type<ProductPackage[]>(),
  addOns: jsonb("add_ons").$type<ProductAddOn[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------
// Customers — no accounts, no passwords. Matched by normalized
// (trimmed, lowercased) email at order-creation time — see
// src/server/create-order.ts for the non-destructive find-or-create logic.
// ---------------------------------------------------------------------
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    // Always stored normalized (trim + lowercase) — never trust caller casing.
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("customers_email_unique").on(table.email)],
);

// ---------------------------------------------------------------------
// Orders — id is the permanent internal identity; orderNumber is the
// separate, human-readable, sequence-generated identity (see
// orderNumberSeq above). clientRequestId is the idempotency key: a unique
// constraint here is the actual source of truth preventing duplicate
// orders, not application-level "check then insert" logic (which is
// race-prone under real concurrency — see create-order.ts).
// ---------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull(),
    // "draft" | "submitted" | "needs-review" | "confirmed" | "cancelled" —
    // deliberately no paid/fulfilled/refunded states yet, see CLAUDE.md.
    status: text("status").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    pricingSummary: jsonb("pricing_summary").notNull().$type<OrderPricingSummary>(),
    notes: text("notes"),
    // Free-form context, e.g. "checkout" today; room for "admin-created"
    // later without a schema change.
    source: text("source").notNull().default("checkout"),
    clientRequestId: text("client_request_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("orders_client_request_id_unique").on(table.clientRequestId),
  ],
);

// ---------------------------------------------------------------------
// Order lines — frozen historical snapshots. selectedPackage/
// selectedOptions/selectedAddOns are JSONB reusing the exact Cart*
// Selection shapes already defined in src/data/cart.ts — a snapshot is an
// opaque historical blob, not a live relational entity, so there is no
// separate OrderLineOption/OrderLineAddOn/OrderLinePackage table.
//
// productId is nullable, with an ON DELETE SET NULL foreign key to
// `products` restored in Phase 13 now that Neon is the authoritative
// catalog (see CLAUDE.md "Product admin + database-backed catalog"). It
// was deliberately dropped in Phase 11 because `products` was permanently
// empty while src/data/products.ts stayed authoritative — a real FK would
// have rejected every order. That reason no longer applies. SET NULL (not
// CASCADE, not RESTRICT) is deliberate: archiving or — in the unlikely
// event one ever happens — deleting a product must never delete or block
// deletion of historical order history. Every field needed to render this
// row is already frozen directly on it, so this column remains
// reference-only, never a rendering requirement.
// ---------------------------------------------------------------------
export const orderLines = pgTable("order_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  productSlug: text("product_slug").notNull(),
  productTitle: text("product_title").notNull(),
  productType: text("product_type").notNull(),
  purchaseMode: text("purchase_mode").notNull(),
  quantity: integer("quantity").notNull(),
  selectedPackage: jsonb("selected_package").$type<CartPackageSelection | null>(),
  selectedOptions: jsonb("selected_options").notNull().$type<CartOptionSelection[]>().default([]),
  selectedAddOns: jsonb("selected_add_ons").notNull().$type<CartAddOnSelection[]>().default([]),
  unitPrice: integer("unit_price").notNull(),
  depositAmount: integer("deposit_amount"),
  lineSubtotal: integer("line_subtotal").notNull(),
  // Service-intake handoff — always null today, nothing populates these
  // yet. See CLAUDE.md / src/data/orders.ts OrderLine for why.
  intakeRequired: boolean("intake_required"),
  intakeFormSlug: text("intake_form_slug"),
  intakeStatus: text("intake_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  lines: many(orderLines),
}));

export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderLines.productId], references: [products.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  adminUser: one(adminUsers, { fields: [auditLog.adminUserId], references: [adminUsers.id] }),
}));

// ---------------------------------------------------------------------
// Phase 14 — Website Content Admin. Four small, typed tables, deliberately
// NOT one giant untyped JSON blob — see CLAUDE.md "Website content admin"
// for the full architecture writeup. Every table here is a pure content
// store with no FK relationship to products/customers/orders; "who edited
// what, when" is already covered by audit_log, so these rows don't
// duplicate that.
//
// FALLBACK PRINCIPLE: the existing src/config/site.ts, src/data/homepage.ts
// (hero export), and src/data/navigation.ts stay in the codebase unchanged
// as the fallback source — these tables are seeded from their CURRENT
// values verbatim, so the first database-backed render is byte-identical
// to what's live today. Nothing here replaces those files this phase.
// ---------------------------------------------------------------------

// site_settings — a singleton row (id is always the literal string
// "default"; the application only ever updates this one row, never creates
// a second one). Backs the admin UI's General/Branding/SEO/Contact-email
// groupings, even though it's one table — the admin UI's section layout is
// a presentation choice, not a database structure. socialLinks stays a
// small, bounded JSONB array (mirrors the existing SocialLink type in
// site.ts) since it's a variable-length list, not a giant blob.
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey(),
  siteName: text("site_name").notNull(),
  legalName: text("legal_name").notNull(),
  // Canonical brand/footer tagline — distinct from homepageContent.tagline,
  // which is the Hero-section-specific tagline. Kept deliberately separate
  // per Phase 14 approval, not collapsed into one shared field.
  tagline: text("tagline").notNull(),
  contactEmail: text("contact_email").notNull(),
  // Reserved: siteConfig has no phone field today and nothing renders one
  // yet. Nullable, not required, ready for a future phase to wire up.
  contactPhone: text("contact_phone"),
  location: text("location").notNull(),
  // Reserved: siteConfig.socialLinks exists today but is always empty and
  // rendered nowhere. Kept as the same shape so populating it later needs
  // no schema change.
  socialLinks: jsonb("social_links").notNull().$type<{ platform: string; url: string }[]>().default([]),
  metaTitle: text("meta_title").notNull(),
  metaDescription: text("meta_description").notNull(),
  ogDescription: text("og_description").notNull(),
  // Reserved: layout.tsx's openGraph metadata has no `images` field wired
  // up yet — nullable until a future phase adds that rendering.
  ogImageSrc: text("og_image_src"),
  // Feeds metadataBase (`new URL(...)`) — validated as an absolute https
  // URL at the mutation boundary, never trusted as-is from admin input.
  canonicalUrl: text("canonical_url").notNull(),
  logoHorizontalSrc: text("logo_horizontal_src").notNull(),
  logoWhiteSrc: text("logo_white_src").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// navigation_items — genuinely multi-row, fully scalar (no JSONB needed;
// every field is independently validated). One table covers both the
// existing primaryNav array (`placement: "primary"`, ordered by sortOrder)
// and the single headerCta object (`placement: "header_cta"`) from
// src/data/navigation.ts, rather than two near-identical tables.
export const NAVIGATION_PLACEMENTS = ["primary", "header_cta"] as const;
export type NavigationPlacement = (typeof NAVIGATION_PLACEMENTS)[number];

export const navigationItems = pgTable("navigation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  placement: text("placement").notNull().$type<NavigationPlacement>(),
  label: text("label").notNull(),
  // Validated server-side at write time (relative path, "#anchor", https://,
  // or mailto: only — never javascript:/data:/vbscript: or bare http://).
  // Button.tsx and Header.tsx render this directly with no runtime
  // sanitization, exactly like every other href in this codebase today —
  // safety has to come from what's allowed to be written, not from
  // escaping at render time.
  href: text("href").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// homepage_content — the one Phase 14 table with a draft/published split,
// because it's the one piece of website content where "preview before it
// goes live" has real value (the first thing every visitor sees). Modeled
// as exactly two rows differentiated by `status`, never more — this
// mirrors the mental model already established by products.status, at a
// fraction of the complexity: no version history table, just "the one
// being edited" and "the one that's live". The admin always updates one of
// these two rows in place; "publish" copies draft column values onto the
// published row inside one transaction (see CLAUDE.md).
//
// heroImageSrc/heroImageAlt/secondaryCtaLabel/secondaryCtaHref are reserved
// per Phase 14 approval: the columns exist so a future phase doesn't need
// a migration to add them, but Hero.tsx renders neither an image nor a
// second CTA this phase — the homepage stays exactly as it looks today.
export const HOMEPAGE_CONTENT_STATUSES = ["draft", "published"] as const;
export type HomepageContentStatus = (typeof HOMEPAGE_CONTENT_STATUSES)[number];

export const homepageContent = pgTable("homepage_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().$type<HomepageContentStatus>(),
  badgePrimary: text("badge_primary").notNull(),
  badgeSecondary: text("badge_secondary").notNull(),
  eyebrow: text("eyebrow").notNull(),
  headlineLead: text("headline_lead").notNull(),
  headlineAccent: text("headline_accent").notNull(),
  tagline: text("tagline").notNull(),
  supportingCopy: text("supporting_copy").notNull(),
  ctaLabel: text("cta_label").notNull(),
  ctaHref: text("cta_href").notNull(),
  heroImageSrc: text("hero_image_src"),
  heroImageAlt: text("hero_image_alt"),
  secondaryCtaLabel: text("secondary_cta_label"),
  secondaryCtaHref: text("secondary_cta_href"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// contact_content — a singleton row (same "default"-id convention as
// site_settings), scoped to exactly the fields ContactForm.tsx actually
// renders as section copy (kicker/heading/description/submit label). The
// form's own field labels/placeholders/service options stay code-owned in
// this phase — narrower scope than "every string in the component", matching
// "content likely to change often" rather than form microcopy. Immediate/
// current — no draft/published split, per Phase 14 approval (no concrete
// staging need identified for this content).
export const contactContent = pgTable("contact_content", {
  id: text("id").primaryKey(),
  kicker: text("kicker").notNull(),
  heading: text("heading").notNull(),
  description: text("description").notNull(),
  submitLabel: text("submit_label").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------
// Phase 15 — Media Library foundation. Metadata/reference only, no binary
// data — the actual file bytes live in Vercel Blob; this table is purely
// "what is it, where does it live, who uploaded it, is it still active."
// See CLAUDE.md "Media Library" for the full architecture writeup.
//
// `id` follows the same "prod_" convention already established for
// products: a stable string ("media_" + crypto.randomUUID()), never
// derived from filename/storage key, never reused.
//
// `storageProvider` is included even though "vercel-blob" is the only
// value written by anything in this phase — it exists so a future
// provider swap, or a later "represent an existing local file without
// uploading it" feature (explicitly deferred this phase), doesn't need a
// schema change to add a second provider value.
//
// `filename` is display metadata only, NEVER the storage key and NEVER
// interpolated into one — `storageKey` is always a fresh, server-generated
// unique value (see src/server/mutate-media.ts once built). `alt` defaults
// to empty string rather than being nullable, so "no alt written yet" is
// one consistent falsy check everywhere, not a null-vs-empty distinction;
// it's still required at the point an asset is actually attached to a
// product/site field, enforced by that field's own validator, not here.
// ---------------------------------------------------------------------
export const MEDIA_ASSET_TYPES = ["image", "video"] as const;
export type MediaAssetType = (typeof MEDIA_ASSET_TYPES)[number];

export const MEDIA_ASSET_STATUSES = ["active", "archived"] as const;
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  storageProvider: text("storage_provider").notNull(),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().$type<MediaAssetType>(),
  mimeType: text("mime_type").notNull(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes").notNull(),
  alt: text("alt").notNull().default(""),
  caption: text("caption"),
  status: text("status").notNull().$type<MediaAssetStatus>(),
  createdByAdminUserId: uuid("created_by_admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  createdByAdminUser: one(adminUsers, { fields: [mediaAssets.createdByAdminUserId], references: [adminUsers.id] }),
}));
