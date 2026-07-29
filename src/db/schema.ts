import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { Media } from "@/data/media";
import type { ProductAddOn, ProductOption, ProductPackage, ProductPricing } from "@/data/products";
import type { CartAddOnSelection, CartOptionSelection, CartPackageSelection } from "@/data/cart";
import type { OrderPricingSummary } from "@/data/orders";
import type { ServiceImage, ServiceProcessStep } from "@/data/services";
import type { ProjectImage, ProjectExternalLink, ProjectResult, ProjectCredit } from "@/data/projects";
import type { MotionSettingsStatus, MotionIntensity, MotionPreset, HeroEntrance } from "@/data/motion";
import type {
  BrainRequestStatus,
  BrainRequestSource,
  BrainRequestType,
  BrainErrorCategory,
  BrainRelatedEntityType,
  BrainUsageMetadata,
} from "@/data/brain";
import type {
  CreativeTaskPreset,
  CreativeContextSourceType,
  CreativeBrief,
  ImageGenerationSize,
  ImageGenerationQuality,
  ImageGenerationStatus,
  ImageGenerationErrorCategory,
  ImageGenerationUsageMetadata,
} from "@/data/creative-studio";

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
// Phase 18 — `status` (the work/project lifecycle) gets a wider approved
// value set: draft | needs-review | submitted | approved | in-progress |
// awaiting-client | completed | cancelled — deliberately separate from
// paymentStatus below, since "is the creative work done" and "did we get
// paid" are independent axes that must never be collapsed into one
// column. "draft" now has a genuine purpose beyond the checkout flow's
// own (mostly theoretical) use of it: a manual/admin-created order the
// admin is still assembling, not yet finalized. Zero real orders existed
// when this list was approved, so this was a clean-slate redesign, not a
// breaking migration against real data. The actual TS-level
// ORDER_STATUSES/OrderStatus export in src/data/orders.ts is updated to
// match in the follow-up UI-building step, not this schema step — this
// column stays plain `text` either way (matching every other status
// column in this schema, e.g. products.status), so widening the allowed
// values has zero SQL/migration impact. See CLAUDE.md "Leads, Customers,
// and Orders Admin".
//
// paymentStatus is new this phase: unpaid | deposit-paid | paid-in-full |
// refunded — purely admin-set for now, no Stripe, no real charge object.
// Still genuinely useful today: a manual order taken by phone/Instagram
// still needs "did I actually get paid" tracked regardless of channel.
// Its own PaymentStatus TS type/const also lands in src/data/orders.ts in
// the UI-building step, alongside the updated ORDER_STATUSES.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull(),
    status: text("status").notNull(),
    // Defaults to 'unpaid', matching every order's real starting state
    // until an admin manually marks it otherwise.
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    pricingSummary: jsonb("pricing_summary").notNull().$type<OrderPricingSummary>(),
    // The customer-submitted context frozen at order-creation time (from
    // checkout) — NOT admin commentary. Ongoing internal admin notes live
    // in the separate `notes` table below instead, so the two concepts
    // (a customer's original message vs. an admin's running commentary)
    // never collide in one column.
    notes: text("notes"),
    // Free-form context, e.g. "checkout" today; "manual" for Phase 18's
    // admin-created orders — already free text, no schema change needed
    // for that.
    source: text("source").notNull().default("checkout"),
    clientRequestId: text("client_request_id").notNull(),
    // Phase 21C-2A — payment infrastructure only, added ahead of any real
    // Stripe integration (see CLAUDE.md "Payment Schema + Provider
    // Abstraction (Phase 21C-2A)"). All four columns are nullable and
    // additive; every existing row (including the one real order,
    // BRCP-1013) is unaffected and simply reads NULL for all four. Nothing
    // in this phase writes to any of them — no PaymentIntent has ever been
    // created, no webhook exists yet.
    //
    // stripePaymentIntentId is the ONE identifier linking an order to a
    // future Stripe PaymentIntent, and doubles as the discriminator
    // between a manual/off-platform order (this stays NULL forever) and a
    // future Stripe-linked one (this gets set exactly once, by a future,
    // separately-approved PaymentIntent-creation step — Phase 21C-2B) —
    // see "Manual vs. Stripe-linked payment handling" below for why no
    // separate column was needed to distinguish the two.
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    // Informational only — the raw last-known Stripe PaymentIntent.status
    // string (e.g. "requires_action", "succeeded"), for future debugging/
    // support visibility. Business logic must NEVER branch on this column
    // — orders.paymentStatus (the existing, already-transition-guarded
    // column above) remains the one authoritative business-state field,
    // exactly like orders.status vs. paymentStatus already stay
    // independent axes today.
    stripePaymentStatus: text("stripe_payment_status"),
    // Set exactly once, by a future verified Stripe webhook, the moment a
    // Stripe-linked order's payment succeeds. Never set by anything else —
    // not checkout, not an admin action, not a frontend redirect.
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // Reflects the MOST RECENT failed payment attempt only (a future
    // webhook clears this back to null on a subsequent success), not a
    // history — full history already belongs in audit_log, matching this
    // schema's standing "don't duplicate history a different table
    // already owns" convention.
    paymentFailedAt: timestamp("payment_failed_at", { withTimezone: true }),
    // Phase 21C-2B (reconciliation-timestamp foundation) — the timestamp of
    // the FIRST actual attempt to create a Stripe PaymentIntent for this
    // order. Deliberately NOT order-creation time, payment-completion time,
    // latest-retry time, or webhook time — a customer may create an order
    // and not attempt payment until hours later, so orders.createdAt is
    // not a safe anchor for reasoning about Stripe idempotency-key
    // retention (Stripe guarantees a key is honored for "at least 24
    // hours" from when it was first used, not from order creation). Once
    // set, ordinary retries do NOT reset it — a future payment-intent
    // endpoint (Phase 21C-2B proper, not built yet) sets this exactly
    // once, atomically, immediately before the first real provider
    // create() call, and never touches it again. See CLAUDE.md "Payment
    // Reconciliation Timestamp (Phase 21C-2B)" for the full future
    // algorithm this column supports (case-by-case: fresh attempt allowed
    // when null; same deterministic idempotency key safely reusable while
    // under 24h old; fail closed, no replacement PaymentIntent, no
    // paymentStatus change, once 24h or older). Nullable, no default —
    // every existing order, including BRCP-1013, reads NULL, and will
    // continue to for as long as nothing calls the future PaymentIntent-
    // creation code path, which does not exist yet.
    stripePaymentIntentAttemptedAt: timestamp("stripe_payment_intent_attempted_at", { withTimezone: true }),
    // Phase 21C-2B-0 — the payment capability token, added ahead of any
    // real PaymentIntent-creation code (that's Phase 21C-2B proper,
    // separately approved and not started). See CLAUDE.md "Payment
    // Capability Token (Phase 21C-2B-0)" for the full design.
    //
    // Deliberately NOT clientRequestId — clientRequestId remains
    // exclusively order-creation idempotency; reusing it as a payment-
    // authorization secret would conflate two different concerns with two
    // different trust boundaries. This column is a SEPARATE, purpose-
    // built capability: whoever presents the matching raw token (never
    // stored here — only its SHA-256 hash is) is authorized to initialize/
    // resume payment for THIS order, and nothing else — not line changes,
    // not customer-info changes, not cancellation, not refunds, not
    // paymentStatus changes directly.
    //
    // Only ever populated for a payment-eligible checkout order (a future,
    // separately-approved order-creation change — not wired in this
    // phase). Every existing order, including the real BRCP-1013 (a
    // manual, non-payment-eligible order) and every order created between
    // now and that future change, reads NULL here.
    paymentAccessTokenHash: text("payment_access_token_hash"),
    // Nullable, paired with the hash above — a token with no expiry is
    // never considered valid (src/server/payments/access-token.ts's
    // verification helper requires both fields to be non-null AND unexpired).
    paymentAccessTokenExpiresAt: timestamp("payment_access_token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("orders_client_request_id_unique").on(table.clientRequestId),
    // Partial-in-spirit but implemented as a plain unique index over a
    // nullable column — Postgres treats multiple NULLs as distinct for
    // unique-index purposes (NULLs never conflict with each other), so
    // this correctly allows unlimited manual/off-platform orders (which
    // stay NULL forever) while still guaranteeing at most one order per
    // real Stripe PaymentIntent once that column is ever populated.
    uniqueIndex("orders_stripe_payment_intent_id_unique").on(table.stripePaymentIntentId),
  ],
);

// ---------------------------------------------------------------------
// Stripe webhook events — Phase 21C-2A, added ahead of any real webhook
// endpoint (see CLAUDE.md "Payment Schema + Provider Abstraction (Phase
// 21C-2A)"). Exists solely so a FUTURE, signature-verified webhook
// handler (Phase 21C-2D) has a real, race-safe idempotency mechanism to
// insert into on day one — Stripe's own docs explicitly warn that a
// webhook event can be delivered more than once, and this codebase's
// standing idempotency discipline (a real DB unique constraint as the
// final authority, not just an application-level check — see
// orders_client_request_id_unique) should extend here rather than being
// weakened for this one integration.
//
// `id` IS the Stripe event's own "evt_..." id, stored verbatim as the
// primary key — this is deliberately the ONE mechanism needed for
// deduplication (a future handler's first statement is
// `INSERT ... ON CONFLICT (id) DO NOTHING`; zero rows affected means
// "already processed, no-op"). No separate uuid, no secondary unique
// index — a primary-key lookup already covers the only query this table
// will ever need to serve. No raw webhook body, no JSON Stripe object, no
// webhook signature, no customer PII, no payment method data, and no
// credential of any kind is ever stored here — only an id, a type string
// (for debugging/observability only), which order it affected, and when
// it was processed.
// ---------------------------------------------------------------------
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),
  // e.g. "payment_intent.succeeded" — free text, not a closed enum: a
  // Stripe event type is Stripe's own, externally-versioned vocabulary,
  // not one this app should hardcode/enumerate and risk falling out of
  // sync with.
  type: text("type").notNull(),
  relatedOrderId: uuid("related_order_id").references(() => orders.id, { onDelete: "set null" }),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  // Phase 18 — nullable, matching productId's existing nullable precedent.
  // A manual/custom line item (Admin → Orders → New, no real catalog
  // product involved) has no meaningful slug — leaving it null is the
  // honest choice over synthesizing a fake one. productTitle stays
  // required either way — the short line-item name (e.g. "Custom Packaging
  // Design"), whether it came from a catalog product or was typed by hand.
  productSlug: text("product_slug"),
  productTitle: text("product_title").notNull(),
  // Phase 18B — nullable. The optional longer scope/description for a line
  // item (e.g. "Front/back pouch design, print-ready production files, 2
  // revision rounds, and final CMYK exports"), deliberately kept separate
  // from productTitle rather than overloading one field with both a short
  // name and a paragraph of scope. Always null for every existing
  // checkout-created order line — create-order.ts never sets this column,
  // so nothing about the checkout path changes. Only admin-created manual
  // order lines populate it, and only when the admin actually writes one.
  description: text("description"),
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
  // Phase 19D-2 — nullable, optional link to a media_assets row, the same
  // optional-mediaAssetId-plus-legacy-path-fallback pattern already
  // proven on Product.media (Phase 15), brand_settings (Phase 16), and
  // Service/Portfolio hero images (Phase 17). Deliberately does NOT add a
  // separate "hero media type" column — media_assets.type is already
  // authoritative for image-vs-video, resolved at read time, never
  // duplicated here. Deliberately does NOT add a separate hero poster
  // column either — a video's poster relationship already lives on the
  // video asset itself (media_assets.posterMediaAssetId, Phase 19A) and
  // is resolved the same way Portfolio/Service hero media already is.
  // heroImageSrc/heroImageAlt above remain the legacy/manual IMAGE
  // fallback, used only when this column is null — untouched, not
  // repurposed. ON DELETE SET NULL: deleting/archiving the referenced
  // asset must never cascade-delete or block deletion of this row — the
  // hero simply loses its media reference, exactly like every other
  // optional media reference in this schema.
  heroMediaAssetId: text("hero_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
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
  // Phase 19A — nullable, self-referencing FK to another media_assets row
  // (always an image asset in practice, enforced at the application layer
  // rather than a DB CHECK constraint, matching how every other "which
  // kind of asset is allowed here" rule in this codebase already lives in
  // validation code, not SQL). Lets a video's poster be a real, reusable,
  // independently-replaceable Media Library image — the same optional-
  // mediaAssetId-plus-manual-fallback pattern already proven three times
  // (Product.media, brand_settings logos, service/portfolio hero images).
  // ON DELETE SET NULL: deleting/archiving the poster image must never
  // cascade-delete or block deletion of the video asset that references
  // it — the video row simply loses its poster reference, exactly like
  // every other optional media reference in this schema.
  posterMediaAssetId: text("poster_media_asset_id").references((): AnyPgColumn => mediaAssets.id, {
    onDelete: "set null",
  }),
  createdByAdminUserId: uuid("created_by_admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  createdByAdminUser: one(adminUsers, { fields: [mediaAssets.createdByAdminUserId], references: [adminUsers.id] }),
  posterMediaAsset: one(mediaAssets, {
    fields: [mediaAssets.posterMediaAssetId],
    references: [mediaAssets.id],
    relationName: "posterMediaAsset",
  }),
}));

// ---------------------------------------------------------------------
// Phase 16 — Brand Controls. Exactly two rows, differentiated by
// `status`, mirroring homepage_content's already-proven draft/published
// pattern — never a version-history table, just "the one being edited"
// and "the one that's live". Every color column is a validated, normalized
// "#RRGGBB" string (never raw CSS, never a CSS function/keyword) — see
// CLAUDE.md "Brand Controls" for the validation boundary and the public
// <BrandTokens /> rendering mechanism that turns these into real CSS
// custom properties at request time.
//
// Logo references live HERE, not on site_settings, specifically so a logo
// choice participates in the same Save Draft -> Preview -> Publish
// workflow as colors — the public site keeps rendering the PUBLISHED
// row's logo (or, if null, site_settings' existing static path as
// fallback) until an explicit publish, exactly like colors. This is a
// deliberate divergence from Phase 14, where site_settings' logo path
// fields stayed immediate/current; that immediate pair remains untouched
// and is still what a brand-draft row with no media selection falls back
// to — nothing here changes site_settings.logoHorizontalSrc/logoWhiteSrc
// or how they're read today.
// ---------------------------------------------------------------------
export const BRAND_SETTINGS_STATUSES = ["draft", "published"] as const;
export type BrandSettingsStatus = (typeof BRAND_SETTINGS_STATUSES)[number];

export const brandSettings = pgTable("brand_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().$type<BrandSettingsStatus>(),
  primaryColor: text("primary_color").notNull(),
  accentColor: text("accent_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  surfaceColor: text("surface_color").notNull(),
  textColor: text("text_color").notNull(),
  mutedTextColor: text("muted_text_color").notNull(),
  borderColor: text("border_color").notNull(),
  buttonBackground: text("button_background").notNull(),
  buttonText: text("button_text").notNull(),
  buttonHoverBackground: text("button_hover_background").notNull(),
  // Reserved/optional — nullable. When set, resolved against the live
  // media_assets row at read time (same runtime-resolution principle
  // Phase 15 established for Product.media), overriding the
  // site_settings path fallback. When null, the public site falls back to
  // site_settings.logoHorizontalSrc/logoWhiteSrc exactly as it does today.
  logoHorizontalMediaAssetId: text("logo_horizontal_media_asset_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  logoWhiteMediaAssetId: text("logo_white_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------
// Phase 17 — Services + Portfolio Admin. Staged draft/publish editing,
// per entity, at real Neon-backed scale (many rows, not a singleton pair
// like homepage_content/brand_settings). The model is a permanent-identity
// "entity" table plus a "versions" table holding at most two rows per
// entity — one `draft`, one `published` — enforced by a unique
// (entityId, versionType) index rather than application logic.
//
// ALL editorial content (title, slug, media, SEO, everything a visitor
// would see) lives on the version row. The entity row holds only what
// must never be "staged": permanent id, lifecycle status, and admin sort
// order. This is what makes editing an already-published entity safe by
// construction — a draft save is an UPDATE against the version_type =
// 'draft' row only; the public site always reads version_type =
// 'published', so it is structurally impossible for a draft edit to leak
// into a live page. Publishing is a single transaction that copies every
// content column from the draft row onto the published row (upserting the
// published row if this is the entity's first-ever publish) and flips the
// entity's status to 'published' if it wasn't already.
//
// Archiving is deliberately an ENTITY-level status flip only — it never
// touches either version row, so un-archiving restores exactly what was
// there before with zero data loss. See CLAUDE.md "Services + Portfolio
// Admin" for the full model writeup, including why this diverges from
// Product's simpler single-row-with-status model.
// ---------------------------------------------------------------------
export const CONTENT_ENTITY_STATUSES = ["draft", "published", "archived"] as const;
export type ContentEntityStatus = (typeof CONTENT_ENTITY_STATUSES)[number];

export const CONTENT_VERSION_TYPES = ["draft", "published"] as const;
export type ContentVersionType = (typeof CONTENT_VERSION_TYPES)[number];

export const services = pgTable("services", {
  // "service_" + crypto.randomUUID() — the ONE thing that never changes
  // across a rename, a draft edit, or a publish.
  id: text("id").primaryKey(),
  status: text("status").notNull().$type<ContentEntityStatus>(),
  // Immediate/current, NOT staged — reordering the homepage service rows
  // takes effect right away via plain up/down admin buttons, mirroring
  // navigation_items.sortOrder exactly. Staging a reorder alongside
  // content edits was judged unnecessary complexity for what is, in
  // practice, a rare and low-risk action to see reflected immediately.
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceVersions = pgTable(
  "service_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    versionType: text("version_type").notNull().$type<ContentVersionType>(),
    // Slug lives on the VERSION row on purpose — a draft can stage a slug
    // change and preview it without the live public route ever moving.
    // Uniqueness is enforced by two PARTIAL indexes below (one scoped to
    // version_type='draft', one to version_type='published'), not one
    // global unique(slug) — a global constraint would reject the seed's
    // own draft+published pair for the same entity, since both start with
    // identical slugs by design. This means the database alone does NOT
    // prevent entity A's published slug from colliding with entity B's
    // draft slug (different partial indexes never see each other) —
    // server-side validation is authoritative for that cross-state case;
    // see CLAUDE.md "Services + Portfolio Admin" for the full writeup.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    shortTitle: text("short_title").notNull(),
    serviceNumber: text("service_number").notNull(),
    // Staged, not immediate — a draft's featured toggle must never affect
    // the live homepage until that draft is published (see CLAUDE.md).
    featured: boolean("featured").notNull().default(false),
    summary: text("summary").notNull(),
    fullDescription: text("full_description").notNull(),
    capabilities: jsonb("capabilities").notNull().$type<string[]>().default([]),
    deliverables: jsonb("deliverables").notNull().$type<string[]>().default([]),
    process: jsonb("process").notNull().$type<ServiceProcessStep[]>().default([]),
    ctaLabel: text("cta_label").notNull(),
    // Same optional-mediaAssetId-plus-legacy-path-fallback pattern already
    // proven on Product.media (Phase 15) and brand_settings (Phase 16).
    heroMediaAssetId: text("hero_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    heroImageSrc: text("hero_image_src"),
    heroImageAlt: text("hero_image_alt"),
    gallery: jsonb("gallery").$type<ServiceImage[]>(),
    seo: jsonb("seo").notNull().$type<{ title: string; description: string }>(),
    // Commerce extension fields — carried forward unpopulated, exactly as
    // in src/data/services.ts today. Nothing reads or renders these yet.
    startingPrice: integer("starting_price"),
    pricingNote: text("pricing_note"),
    turnaround: text("turnaround"),
    revisions: text("revisions"),
    depositAmount: integer("deposit_amount"),
    purchasable: boolean("purchasable"),
    intakeFormSlug: text("intake_form_slug"),
    cartEligible: boolean("cart_eligible"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("service_versions_service_id_version_type_unique").on(table.serviceId, table.versionType),
    // Partial unique indexes — see the `slug` column comment above for why
    // this is two scoped constraints instead of one global one.
    uniqueIndex("service_versions_slug_draft_unique")
      .on(table.slug)
      .where(sql`${table.versionType} = 'draft'`),
    uniqueIndex("service_versions_slug_published_unique")
      .on(table.slug)
      .where(sql`${table.versionType} = 'published'`),
  ],
);

export const servicesRelations = relations(services, ({ many }) => ({
  versions: many(serviceVersions),
}));

export const serviceVersionsRelations = relations(serviceVersions, ({ one }) => ({
  service: one(services, { fields: [serviceVersions.serviceId], references: [services.id] }),
}));

// portfolio_projects / portfolio_project_versions — identical staged-editing
// shape to services/service_versions above, field set matching the Project
// type in src/data/projects.ts. `thumbnail` is deliberately NOT carried
// into this schema — confirmed dead/unrendered (ProjectCard.tsx never
// reads it), see CLAUDE.md. className is a required field constrained at
// the application/validation layer to the fixed set of real CSS variants
// ("project-red" | "project-dark" | "project-cream") — never free text in
// the admin UI, since a typo'd value would silently break styling with
// nothing to catch it.
export const portfolioProjects = pgTable("portfolio_projects", {
  // "project_" + crypto.randomUUID().
  id: text("id").primaryKey(),
  status: text("status").notNull().$type<ContentEntityStatus>(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioProjectVersions = pgTable(
  "portfolio_project_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id")
      .notNull()
      .references(() => portfolioProjects.id, { onDelete: "cascade" }),
    versionType: text("version_type").notNull().$type<ContentVersionType>(),
    // Same partial-index uniqueness split as service_versions.slug above —
    // scoped to draft/published separately, not globally unique.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    shortTitle: text("short_title").notNull(),
    category: text("category").notNull(),
    // Free-form descriptive tags, NOT a foreign key to the services table
    // above — matches the existing, deliberate Project.services behavior
    // exactly (see CLAUDE.md "Categories and services").
    services: jsonb("services").notNull().$type<string[]>().default([]),
    summary: text("summary").notNull(),
    fullDescription: text("full_description").notNull(),
    // Never fabricated — stays null until real, confirmed information
    // exists, exactly matching the existing rule for Project.client/year.
    client: text("client"),
    year: text("year"),
    featured: boolean("featured").notNull().default(false),
    className: text("class_name").notNull(),
    stamp: text("stamp").notNull(),
    heroMediaAssetId: text("hero_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    heroImageSrc: text("hero_image_src"),
    heroImageAlt: text("hero_image_alt"),
    gallery: jsonb("gallery").$type<ProjectImage[]>(),
    externalLink: jsonb("external_link").$type<ProjectExternalLink | null>(),
    results: jsonb("results").$type<ProjectResult[] | null>(),
    credits: jsonb("credits").$type<ProjectCredit[] | null>(),
    seo: jsonb("seo").notNull().$type<{ title: string; description: string }>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portfolio_project_versions_project_id_version_type_unique").on(table.projectId, table.versionType),
    uniqueIndex("portfolio_project_versions_slug_draft_unique")
      .on(table.slug)
      .where(sql`${table.versionType} = 'draft'`),
    uniqueIndex("portfolio_project_versions_slug_published_unique")
      .on(table.slug)
      .where(sql`${table.versionType} = 'published'`),
  ],
);

export const portfolioProjectsRelations = relations(portfolioProjects, ({ many }) => ({
  versions: many(portfolioProjectVersions),
}));

export const portfolioProjectVersionsRelations = relations(portfolioProjectVersions, ({ one }) => ({
  project: one(portfolioProjects, { fields: [portfolioProjectVersions.projectId], references: [portfolioProjects.id] }),
}));

// ---------------------------------------------------------------------
// Phase 18 — Leads, Customers, and Orders Admin. `leads` is operational
// business data, not published content — it deliberately does NOT use the
// Phase 17 staged draft/publish model (nothing about a lead is ever
// "public"), and deliberately does NOT use the prod_/service_/project_
// text-id convention those content-entity tables use. It uses a plain
// uuid, matching customers/orders/order_lines/admin_users — the "business
// record" family, not the "public content entity" family.
//
// No unique constraint on email, unlike customers — a lead represents one
// discrete inquiry event; the same person submitting a second genuine
// inquiry later is a new, separately trackable record, not a duplicate to
// collapse away.
//
// Archival is deliberately ORTHOGONAL to the funnel status (new/contacted/
// qualified/won/lost) rather than a 6th status value — a nullable
// archivedAt timestamp instead of an 'archived' status, per approval. A
// lead can be archived from any funnel stage without losing what stage it
// was actually in; "is this archived" and "what stage is it at" are two
// independent questions, the exact same reasoning already applied to
// orders.status vs. orders.paymentStatus above.
//
// customerId is nullable and set only by an explicit admin action
// (Convert to customer / Link to existing customer) — never automatically,
// and never as a side effect of a status change reaching "won". See
// CLAUDE.md "Leads, Customers, and Orders Admin".
// ---------------------------------------------------------------------
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Always stored normalized (trim + lowercase), same convention as
    // customers.email — but NOT unique, see above.
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    // Frozen copy of whatever was selected in the contact form's service
    // dropdown at submission time — free text, NOT a foreign key to that
    // (code-owned, editable) options list. A lead's historical request
    // must never be silently reinterpreted by a later copy edit, the same
    // "frozen snapshot" principle order_lines already uses for products.
    requestedService: text("requested_service"),
    message: text("message").notNull(),
    // Free text, room for 'phone' | 'instagram' | 'manual' etc. later
    // with no schema change — mirrors orders.source exactly.
    source: text("source").notNull().default("website-contact-form"),
    // 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
    status: text("status").notNull().default("new"),
    // Orthogonal to status — see the table comment above.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("leads_status_idx").on(table.status), index("leads_customer_id_idx").on(table.customerId)],
);

export const leadsRelations = relations(leads, ({ one }) => ({
  customer: one(customers, { fields: [leads.customerId], references: [customers.id] }),
}));

// ---------------------------------------------------------------------
// Notes — one small, generic, append-only table shared by leads,
// customers, and orders, reusing the exact entityType/entityId polymorphic
// pattern audit_log already established in this codebase, rather than
// building three near-identical *_notes tables. Append-only: no
// updatedAt, no edit/delete path — a wrong note gets corrected by adding
// a new note, not by rewriting history, the same immutable-record
// philosophy audit_log already uses. adminUserId (nullable, ON DELETE SET
// NULL) records who wrote it, matching audit_log.adminUserId exactly.
//
// The tradeoff, documented honestly: entityId is not a real foreign key
// (it can't be — it points at three different tables depending on
// entityType), so referential integrity here is an application-level
// guarantee, not a database-enforced one — identical to the tradeoff
// audit_log already accepts today.
// ---------------------------------------------------------------------
export const NOTE_ENTITY_TYPES = ["lead", "customer", "order"] as const;
export type NoteEntityType = (typeof NOTE_ENTITY_TYPES)[number];

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notes_entity_idx").on(table.entityType, table.entityId)],
);

export const notesRelations = relations(notes, ({ one }) => ({
  adminUser: one(adminUsers, { fields: [notes.adminUserId], references: [adminUsers.id] }),
}));

// ---------------------------------------------------------------------
// Phase 19D-1 — Motion System + Admin Controls. Exactly two rows,
// differentiated by `status`, the identical draft/published singleton-pair
// pattern already proven by brand_settings (Phase 16) and homepage_content
// (Phase 14) — never a version-history table, just "the one being edited"
// and "the one that's live." No unique index enforces the two-row limit
// (brand_settings/homepage_content don't either) — that discipline lives
// entirely in the application layer (src/server/mutate-motion.ts, not yet
// built), exactly like those two tables.
//
// Every preset column is a closed, validated enum string — never raw CSS,
// never a transform/duration/easing value, never arbitrary text. This is
// the actual security/safety boundary for a future Big Red Brain
// suggestion (see CLAUDE.md "Phase 19D" once written): there is no column
// here an AI (or a human) could write an arbitrary CSS expression into,
// only a value from MOTION_PRESETS/MOTION_INTENSITIES/HERO_ENTRANCE_OPTIONS.
//
// The enum constants themselves live in src/data/motion.ts, not here —
// only the TYPES are imported for these columns' $type<>() annotations.
// This mirrors the exact ServiceImage/ProjectImage pattern already used
// throughout this file: src/data/*.ts is the single, client-safe source
// of truth for a business enum/shape, schema.ts only borrows its type.
// Keeping the runtime arrays out of schema.ts also keeps them safely
// importable from client components (the admin motion form, MotionSection)
// without pulling any drizzle-orm code into a client bundle.
//
// Deliberately does NOT reference media_assets or homepage_content in any
// way — Phase 19D-1 is motion-only. Hero media (heroMediaAssetId on
// homepage_content) is explicit Phase 19D-2 scope; this table's
// `heroEntrance` column only ever chooses between "none" and
// "cinematic_reveal" as a presentation *behavior*, independent of whether
// any hero media exists yet.
// ---------------------------------------------------------------------
export const motionSettings = pgTable("motion_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().$type<MotionSettingsStatus>(),
  // Global multiplier applied on top of every section's own preset choice
  // — scales distance/duration/easing together via a fixed, code-owned
  // mapping (never a raw number an admin or AI can set directly).
  intensity: text("intensity").notNull().$type<MotionIntensity>(),
  heroEntrance: text("hero_entrance").notNull().$type<HeroEntrance>(),
  servicesPreset: text("services_preset").notNull().$type<MotionPreset>(),
  servicesStagger: boolean("services_stagger").notNull().default(false),
  statementPreset: text("statement_preset").notNull().$type<MotionPreset>(),
  portfolioPreset: text("portfolio_preset").notNull().$type<MotionPreset>(),
  portfolioStagger: boolean("portfolio_stagger").notNull().default(false),
  studioPreset: text("studio_preset").notNull().$type<MotionPreset>(),
  processPreset: text("process_preset").notNull().$type<MotionPreset>(),
  processStagger: boolean("process_stagger").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------
// Phase 20A — Big Red Brain foundation. brain_requests is a plain,
// append-only HISTORY/AUDIT table for READ + RECOMMEND requests only — it
// is not a queue, not a conversation/session table, and not a generic
// "AI did something" log. See CLAUDE.md's Phase 20 architecture report for
// the full safety model this table exists to support.
//
// This table stores SAFE SUMMARIES only, never the raw material a request
// was built from or produced. It must never contain: a full assembled
// prompt/context, full provider output, provider credentials, environment
// variables, raw customer notes/messages (only a reduced, safe summary of
// them), or arbitrary HTML/JS. prompt_summary/response_summary are
// deliberately short, generated summaries — not "the first N characters of
// whatever the model said" — enforced at BRAIN_PROMPT_SUMMARY_MAX_LENGTH/
// BRAIN_RESPONSE_SUMMARY_MAX_LENGTH (src/data/brain.ts) by the future
// mutate-brain.ts write path, the same "closed vocabulary/length rule
// lives in application code, not a SQL CHECK constraint" convention every
// other content rule in this schema already follows.
//
// related_entity_type/related_entity_id are a polymorphic, APPLICATION-
// LEVEL-ONLY reference — deliberately no foreign key, since the same
// column pair points at different tables (leads/customers/orders/
// portfolio_projects/services/media_assets) depending on
// related_entity_type. This is the exact same accepted tradeoff
// notes.entityType/entityId and audit_log.entityType/entityId already
// make in this schema — referential integrity here is an application
// guarantee (see src/data/brain.ts's BRAIN_RELATED_ENTITY_TYPES), not a
// database-enforced one.
//
// status is closed to 'completed' | 'failed' in Phase 20A on purpose —
// every real request in this phase is one synchronous provider round
// trip. 'pending'/'running' states belong to a future async generation-job
// table (image/video), not this one — see BRAIN_REQUEST_STATUSES's own
// comment in src/data/brain.ts.
//
// No brain_requests row is ever written by anything other than a future
// mutate-brain.ts Server Action that has already independently called
// requireAdminUser() — matching the standing rule every other admin
// mutation in this codebase already follows since Phase 12. This table
// grants NO write access to homepage_content, services, portfolio_projects,
// products, customers, orders, leads, motion_settings, or brand_settings —
// Phase 20A remains READ + RECOMMEND only; nothing here is a path to any
// of those tables.
// ---------------------------------------------------------------------
export const brainRequests = pgTable(
  "brain_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestedByAdminUserId: uuid("requested_by_admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    requestType: text("request_type").notNull().$type<BrainRequestType>(),
    requestSource: text("request_source").notNull().$type<BrainRequestSource>(),
    // Polymorphic, application-level only — see the table comment above.
    // No foreign key by design; validated against BRAIN_RELATED_ENTITY_TYPES
    // at the application layer, not by the database.
    relatedEntityType: text("related_entity_type").$type<BrainRelatedEntityType>(),
    relatedEntityId: text("related_entity_id"),
    // SAFE, short, human-readable summary of what was asked — never the
    // full assembled prompt/context sent to the provider. See the table
    // comment above and BRAIN_PROMPT_SUMMARY_MAX_LENGTH.
    promptSummary: text("prompt_summary").notNull(),
    // SAFE, short, generated summary of what was returned — never a large
    // raw model response, never raw HTML. Nullable because a failed
    // request has no response to summarize. See BRAIN_RESPONSE_SUMMARY_MAX_LENGTH.
    responseSummary: text("response_summary"),
    // Free text, not an enum — a provider/model name changes on a faster
    // timescale than this schema should chase (see CLAUDE.md's Phase 20
    // architecture report, "Provider abstraction"). Nothing branches on
    // this column's literal value except an application-level allowlist
    // check at request time; it is never interpolated into a query.
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull().$type<BrainRequestStatus>(),
    // Small, numeric, non-sensitive only — see BrainUsageMetadata's own
    // comment in src/data/brain.ts for the exact allowed shape. Never
    // prompts, never model output, never PII, never credentials.
    usageMetadata: jsonb("usage_metadata").$type<BrainUsageMetadata>(),
    errorCategory: text("error_category").$type<BrainErrorCategory>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every future admin-facing list of Brain activity is "most recent
    // first" — a plain history page, request-usage-cap queries (Phase 20's
    // cost controls), and the future /admin/brain "recent activity" view
    // all order by this column.
    index("brain_requests_created_at_idx").on(table.createdAt),
    // Powers "my request history" / per-admin usage-cap queries — the same
    // shape as leads_customer_id_idx's own reasoning (a real, planned
    // lookup by this column, not a speculative one).
    index("brain_requests_requested_by_admin_user_id_idx").on(table.requestedByAdminUserId),
    // Powers "what has Big Red Brain already said about THIS lead/order/
    // portfolio project" — a context-aware entry point (Customer detail,
    // Order detail, etc., see CLAUDE.md's Phase 20 architecture report,
    // "Context-aware entry points") looking up prior requests scoped to
    // its own entity, mirroring notes_entity_idx's exact reasoning and
    // shape for the same kind of polymorphic lookup.
    index("brain_requests_related_entity_idx").on(table.relatedEntityType, table.relatedEntityId),
  ],
);

export const brainRequestsRelations = relations(brainRequests, ({ one }) => ({
  requestedByAdminUser: one(adminUsers, { fields: [brainRequests.requestedByAdminUserId], references: [adminUsers.id] }),
}));

// ---------------------------------------------------------------------
// Phase 20C-1 — AI Creative Studio foundation (image generation). A
// SEPARATE table from brain_requests, never a shared/extended one — Big
// Red Brain (text) and the image ImageProvider are deliberately
// independent provider capabilities, per approval. This table is the
// image-generation counterpart, not an extension of brain_requests.
//
// Same strict READ + RECOMMEND + GENERATE-PREVIEW boundary as Brain: this
// table grants no write access to any other business/content table. A
// generation only becomes a real, usable asset via a SEPARATE, explicit
// "Save to Media Library" action (not yet built this phase) that inserts
// a normal media_assets row and sets outputMediaAssetId here — nothing
// about this table's presence ever auto-attaches anything to
// Homepage/Portfolio/Service/Product/any other business record.
//
// `id` uses the "aigen_" + crypto.randomUUID() text-id convention
// (matching media_assets/services/portfolio_projects' "permanent content
// entity" family) rather than a plain uuid — once saved, a generation job
// is permanently, meaningfully referenced by a real media_assets row and
// by admin provenance views the same way those entities are.
//
// `status` is closed to 'completed' | 'failed', mirroring
// brain_requests.status exactly. OpenAI's Images API is synchronous — one
// blocking HTTP request, no polling, no webhook — so there is no
// 'queued'/'running' state this system will ever actually observe.
// 'saved' is deliberately NOT a status value either: it's a derived fact
// (outputMediaAssetId IS NOT NULL), kept structurally independent of
// `status` so "did the provider succeed" and "did the owner decide to
// keep it" can never collide into one enum or fall out of sync.
//
// `discardedAt` (nullable, orthogonal to status/outputMediaAssetId — same
// "orthogonal timestamp, not a status value" pattern leads.archivedAt
// already established) is the smallest mechanism for "the owner is done
// reviewing this, hide it from the active Studio workflow" WITHOUT
// deleting the underlying Blob object or this row — recoverability during
// early Creative Studio use, per approval. Discarding never touches
// outputStorageKey/outputUrl; the generated file stays fully intact in
// Blob storage and this row remains a complete, permanent history record.
// No automated retention-cleanup scheduler exists yet — documented as a
// deferred future maintenance/security task, not built this phase.
//
// A generated image is NEVER inserted into media_assets, and therefore
// NEVER appears in any Media Library picker, until the separate Save
// action runs — this table has no relationship to picker queries at all,
// discarded or not.
//
// `referenceMediaAssetIds`/`contextSourceId` are both application-level
// only (no FK): referenceMediaAssetIds is a JSONB array of ids (a single
// scalar FK can't span it, and each id is independently re-verified
// against media_assets at generation time, never trusted as already
// valid); contextSourceId is polymorphic across
// brand_settings/portfolio_projects/services/media_assets, the identical
// accepted tradeoff brain_requests.relatedEntityId already makes.
//
// NEVER stored on this table, by design: API keys/credentials, the raw
// provider request or response, full hidden system-prompt text,
// customer/order/lead PII, or an arbitrary browser-submitted remote URL.
// ---------------------------------------------------------------------
export const aiGenerationJobs = pgTable(
  "ai_generation_jobs",
  {
    id: text("id").primaryKey(),
    requestedByAdminUserId: uuid("requested_by_admin_user_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    taskPreset: text("task_preset").notNull().$type<CreativeTaskPreset>(),
    // Polymorphic, application-level only — see the table comment above.
    contextSourceType: text("context_source_type").$type<CreativeContextSourceType>(),
    contextSourceId: text("context_source_id"),
    // The FINAL, bounded, sanitized brief actually sent to the image
    // provider — never a raw freeform prompt dump. See CreativeBrief's
    // own comment in src/data/creative-studio.ts.
    brief: jsonb("brief").notNull().$type<CreativeBrief>(),
    // Independently re-verified (exists, active, type=image) at
    // generation time, never trusted as already-valid structure.
    referenceMediaAssetIds: jsonb("reference_media_asset_ids").notNull().$type<string[]>().default([]),
    // Free text, not a $type<>()-narrowed enum — mirrors
    // brainRequests.provider/.model exactly (see that table's own comment):
    // a provider/model name changes on a faster timescale than this
    // schema's TypeScript layer should chase. Allowlisted at the
    // application layer only (src/data/creative-studio.ts).
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    requestedSize: text("requested_size").notNull().$type<ImageGenerationSize>(),
    requestedQuality: text("requested_quality").notNull().$type<ImageGenerationQuality>(),
    status: text("status").notNull().$type<ImageGenerationStatus>(),
    errorCategory: text("error_category").$type<ImageGenerationErrorCategory>(),
    // Output — set only when status='completed'. The generated image is
    // uploaded to real Blob storage (validated via the exact same
    // validateImageUpload() every human upload already goes through)
    // BEFORE this row is ever written, so outputUrl always points at a
    // real, already-validated object — never a raw, unvalidated provider
    // URL, and never a value the browser could have supplied.
    outputStorageKey: text("output_storage_key"),
    outputUrl: text("output_url"),
    outputWidth: integer("output_width"),
    outputHeight: integer("output_height"),
    outputSizeBytes: integer("output_size_bytes"),
    // Nullable until the owner explicitly runs the separate Save action —
    // see the table comment above. ON DELETE SET NULL: deleting the saved
    // media_assets row later must never delete or block deletion of this
    // permanent generation-history record.
    outputMediaAssetId: text("output_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    // Small, numeric, non-sensitive only — identical shape/unit convention
    // to brain_requests.usageMetadata (integer microdollars), a
    // deliberately SEPARATE column/table from Brain's own text-request
    // accounting, per approval. No cost figures are hardcoded in this
    // migration.
    usageMetadata: jsonb("usage_metadata").$type<ImageGenerationUsageMetadata>(),
    // Orthogonal to status — see the table comment above. Never deletes
    // the Blob object or this row; only hides it from the active Studio
    // review workflow.
    discardedAt: timestamp("discarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Set together with outputMediaAssetId, by the same Save action.
    savedAt: timestamp("saved_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_generation_jobs_created_at_idx").on(table.createdAt),
    index("ai_generation_jobs_requested_by_admin_user_id_idx").on(table.requestedByAdminUserId),
    index("ai_generation_jobs_output_media_asset_id_idx").on(table.outputMediaAssetId),
  ],
);

export const aiGenerationJobsRelations = relations(aiGenerationJobs, ({ one }) => ({
  requestedByAdminUser: one(adminUsers, {
    fields: [aiGenerationJobs.requestedByAdminUserId],
    references: [adminUsers.id],
  }),
  outputMediaAsset: one(mediaAssets, { fields: [aiGenerationJobs.outputMediaAssetId], references: [mediaAssets.id] }),
}));

// ---------------------------------------------------------------------
// Phase 21A — the Postgres half of the two-layer rate-limit design (the
// other half is Vercel Firewall, configured entirely outside this
// codebase, for public/IP-level edge protection — see CLAUDE.md's Phase
// 21A architecture report). This table exists specifically for
// business-identity-scoped short-window burst limits (Big Red Brain,
// Creative Studio, the video-upload-token route) that a network-edge
// firewall can't naturally express, since those limits key on
// admin_users.id, not just source IP.
//
// Deliberately the smallest possible shape — a pure, high-insert-rate
// event log, structurally closer to a metrics counter than a business
// entity, which is why `id` is `bigserial` here rather than this
// schema's usual `uuid`/text-prefix convention: nothing ever joins
// against this table's own id, and a uuid's random-insert index bloat is
// unnecessary overhead for a table with this row-churn profile.
//
// `key` is polymorphic by design, matching the exact accepted tradeoff
// `notes.entityId`/`audit_log.entityId` already make elsewhere in this
// schema: depending on `scope`, it holds either a real `admin_users.id`
// (as text) or an HMAC-SHA256 of a normalized IP address — NEVER a raw
// IP. A plain unsalted hash of an IPv4 address is trivially reversible
// (the entire IPv4 space is small enough to exhaustively pre-hash), so a
// keyed HMAC is the actual minimum needed for "a safer deterministic
// representation than raw IP" to mean anything — see
// src/server/rate-limit.ts (Phase 21A-1C, not yet built) for where that
// HMAC is actually computed. This table itself has no FK to admin_users
// for the same polymorphic-key reason notes/audit_log don't have one
// either — referential integrity here is an application-level guarantee,
// not a database-enforced one.
//
// No `updated_at` — append-only, matching audit_log's own convention.
// No automated cleanup job exists yet (documented, deliberately deferred
// per Phase 21A approval — at this business's real traffic scale, this
// table's growth is negligible for a long time; a future periodic
// `DELETE ... WHERE created_at < now() - interval '7 days'` is the
// natural eventual fix, not built this phase).
// ---------------------------------------------------------------------
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // e.g. "brain" | "creative_studio" | "video_token" — a closed
    // vocabulary enforced at the application layer (src/server/
    // rate-limit.ts), matching every other enum-shaped text column in
    // this schema.
    scope: text("scope").notNull(),
    // admin_users.id (as text) for admin-scoped limits, or
    // HMAC-SHA256(normalized IP) for the one IP-scoped application limit
    // (video-upload-token's secondary per-IP check) — never a raw IP,
    // never an email, never a prompt/request body.
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Column order matters: scope/key are always matched with `=`
    // (equality predicates), created_at is always matched with `>` (a
    // range predicate) — Postgres B-tree best practice is equality
    // columns first, range column last, so a query can seek straight to
    // the exact (scope, key) prefix and then do one efficient forward
    // scan through created_at within it, rather than scanning a much
    // wider slice of the index. Every real query this table serves is
    // `WHERE scope = ? AND key = ? AND created_at > ?` — this is the one
    // index that shape needs.
    index("rate_limit_events_scope_key_created_at_idx").on(table.scope, table.key, table.createdAt),
  ],
);
