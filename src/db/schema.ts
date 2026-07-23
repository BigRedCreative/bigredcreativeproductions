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
// productId is nullable and deliberately has NO foreign key constraint to
// `products`, even though it stores a Product.id value. The `products`
// table above is schema-only — no rows are inserted into it in this phase,
// since the authoritative catalog is still src/data/products.ts (see
// CLAUDE.md "Catalog system"). A real FK here would reject every order for
// any real product, since it would never have a matching `products` row to
// reference. Every field needed to render this row is already frozen
// directly on it, so this column is reference-only (useful once the
// catalog actually migrates into `products`), never a rendering
// requirement or an enforced relationship today.
// ---------------------------------------------------------------------
export const orderLines = pgTable("order_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id"),
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
