# Big Red Creative Productions — website

Guidance for Claude Code (and any future AI-assisted session) working in this repo.

## The business

- **Name:** Big Red Creative Productions (legal name: Big Red Creative Productions LLC)
- **Positioning:** a full-service creative production agency, not a generic tech/SaaS company
- **Services:** branding, graphic design, packaging, print production, promotions, event management, and websites
- **Brand style:** premium, urban, modern, editorial, hip-hop influenced, lightly gritty, high-end, professional — polished enough for a boardroom, real enough for the block
- **Primary colors:** red, black, and white (plus a warm off-white/cream background and a small acid-yellow accent — see `src/app/globals.css` `:root`)

**Avoid:** cheesy graffiti fonts, excessive comic-book/spray-paint effects, generic corporate-agency design, or any change to the established visual identity without being explicitly asked for a redesign. This site already reflects the intended brand direction — the default assumption is "preserve," not "reinvent."

## Project structure

```
src/
  app/
    page.tsx        — assembles homepage sections only, no content or business logic
    layout.tsx        — root HTML shell + metadata (sourced from config/site.ts)
    globals.css         — all CSS, plain stylesheet (no Tailwind/CSS Modules), design tokens in :root
    work/[slug]/page.tsx — dynamic, statically-generated project detail pages (see "Portfolio system")
    store/page.tsx       — the /store catalog index (see "Store (storefront UI)")
    store/[slug]/page.tsx — dynamic, statically-generated product detail pages (see "Store (storefront UI)")
    cart/page.tsx        — the /cart route (see "Cart (transactional foundation)")
    checkout/page.tsx      — the /checkout route (see "Checkout + Order foundation")
    api/orders/route.ts     — POST /api/orders Route Handler, see "Backend + database foundation"

  components/
    Header.tsx, Hero.tsx, Ticker.tsx, Manifesto.tsx, Statement.tsx,
    Services.tsx, Portfolio.tsx, Studio.tsx, Process.tsx, ContactForm.tsx, Footer.tsx
      — one component per homepage section; presentation + structure only
    ProjectHero.tsx, ProjectDetails.tsx, ProjectGallery.tsx, ProjectResults.tsx, ProjectNavigation.tsx
      — sections used only on /work/[slug] project detail pages
    ServiceHero.tsx, ServiceCapabilities.tsx, ServiceDeliverables.tsx, ServiceProcess.tsx, ServiceCTA.tsx
      — sections used only on /services/[slug] service detail pages
    ProductHero.tsx, ProductMedia.tsx, ProductDetails.tsx, ProductPricing.tsx,
    ProductOptions.tsx, ProductPackages.tsx, ProductAddOns.tsx, ProductCTA.tsx, ProductPurchasePanel.tsx
      — sections used only on /store/[slug] product detail pages; optional ones only
        rendered by the page when the product actually has that data. ProductOptions/
        ProductPackages/ProductAddOns accept optional controlled-selection props so
        ProductPurchasePanel can reuse them interactively — see "Cart"
    PortfolioGrid.tsx
      — client component: renders the homepage project grid + the category filter row
    StoreGrid.tsx
      — client component: renders the /store product grid + the category filter row
    CartProvider.tsx, CartView.tsx, CartItemRow.tsx, CartSummary.tsx, CartEmptyState.tsx,
    CartQuantityControl.tsx, CartNavLink.tsx
      — the cart's Context/reducer provider + its UI, see "Cart (transactional foundation)"
    CheckoutView.tsx, CheckoutCustomerForm.tsx, OrderReview.tsx
      — the checkout flow's reducer/session-persistence + its UI, see "Checkout + Order foundation"

  components/ui/
    Button.tsx, SectionHeading.tsx, ProjectCard.tsx, ServiceCard.tsx, ProductCard.tsx, Badge.tsx
      — shared, generic UI primitives with zero hardcoded business content

  data/
    homepage.ts    — all homepage copy (hero, ticker, manifesto, statement, studio,
                       process, contact form labels, footer wording)
    services.ts      — the services list (title/description/tags)
    services.validate.ts — runtime validation for service data, run automatically on import
    projects.ts        — the full portfolio data model + helpers (see "Portfolio system" below)
    projects.validate.ts — runtime validation for project data, run automatically on import
    project.template.ts    — copy-paste starter template for a new project (not used by the app)
    media.ts         — shared Media type (image/video) for the catalog system
    products.ts        — the catalog/product data model + helpers (see "Catalog system" below)
    products.validate.ts — runtime validation for product data, run automatically on import
    product.template.ts    — copy-paste starter template for a new product (not used by the app)
    money.ts          — centralized Money (integer-cent) formatting, see "Store (storefront UI)"
    store.ts            — copy for the /store index page only (heading, intro, empty state)
    cart.ts            — CartItem/CartOptionSelection/CartPackageSelection/CartAddOnSelection
                          types, isCartEligible(), buildCartItem(), getConfigurationSignature()
    cart-pricing.ts       — centralized cart total calculations, see "Cart (transactional foundation)"
    orders.ts           — OrderDraft/OrderLine types, buildOrderDraft(), cartItemToOrderLine(),
                          the mailto order-request builders — see "Checkout + Order foundation"
    orders.validate.ts     — RUNTIME validateOrderDraft() (returns errors, does not throw —
                          different in kind from the build-time *.validate.ts files above)
    navigation.ts        — header nav links + CTA (hrefs derived from config/sections.ts and products.ts).
                          The live Cart (N) indicator is NOT in this file — see "Cart navigation"

  config/
    site.ts     — business identity: name, legal name, url, email, location, social links
    theme.ts      — TypeScript mirror of the CSS design tokens in globals.css
    sections.ts     — homepage section order, anchor IDs, enabled/disabled flags

  db/
    schema.ts   — Drizzle table/sequence definitions (products, customers, orders, order_lines,
                   order_number_seq) — see "Backend + database foundation"
    index.ts      — getDb(): lazy, server-only Neon/Drizzle client, throws only when actually called

  server/
    product-source.ts     — getAuthoritativeProduct(): the one swappable product-lookup boundary
    verify-configuration.ts — strict server-side package/option/add-on verification for API requests
    create-order.ts       — the atomic Customer+Order+OrderLine transaction, idempotency handling
```

drizzle.config.ts (project root) and drizzle/ (generated, versioned migration SQL) are Drizzle Kit's
CLI-only files — see "Backend + database foundation" → "Database migrations".

## Where to edit things

- **Homepage text** (headlines, taglines, body copy, button labels, contact form labels) → `src/data/homepage.ts`
- **Services list** → `src/data/services.ts`
- **Portfolio projects** → `src/data/projects.ts`
- **Catalog products** (public at `/store` once `status: "published"` — see "Catalog system" and "Store (storefront UI)") → `src/data/products.ts`
- **Store index page copy** (heading, intro, empty state) → `src/data/store.ts`
- **Nav links / header CTA** → `src/data/navigation.ts`
- **Business info** (name, email, location, social links) → `src/config/site.ts`
- **Colors, spacing, shadows, borders, durations** → `src/app/globals.css` `:root` custom properties (mirrored for reference in `src/config/theme.ts`, but globals.css is the source of truth the browser actually uses)
- **Section order / anchor IDs / enabling-disabling a section** → `src/config/sections.ts`, then keep `src/app/page.tsx`'s JSX order in sync

Most content edits should only ever touch `src/data/*.ts` or `src/config/*.ts` — not the component files.

## Portfolio system

Every project lives as one object in the `projects` array in `src/data/projects.ts`, typed by the `Project` type defined at the top of that file. Adding a **published** project to that array automatically:

- generates a static page at `/work/[slug]` (via `generateStaticParams`)
- generates that page's `<title>`/meta description (via `generateMetadata`, from the project's `seo` field)
- adds it to the homepage "Selected work" grid, **if** `featured: true` (up to `MAX_FEATURED_PROJECTS`)
- wires up Previous/Next navigation on every project's detail page, in array order (wraps around)
- makes it filterable by category in the homepage grid

### Validation

`src/data/projects.ts` calls `validateProjects()` (from `src/data/projects.validate.ts`) on the `projects` array as soon as the module loads — so any `npm run dev` or `npm run build` fails immediately, listing **every** problem at once, if project data is invalid. It checks: unique slugs, non-empty titles, no duplicate titles, `featured` is a real boolean, `category`/`status` are valid enum values, `seo.title`/`seo.description` are present, image paths are local (not external URLs) and live under that project's own `/images/projects/[slug]/` folder, and gallery images have no duplicates within a project. This has no dependency beyond plain TypeScript — no validation library was added.

### Categories and services

`category` is a single value from the fixed `PROJECT_CATEGORIES` list in `src/data/projects.ts`: Branding, Packaging, Print Production, Events, Promotions, Web Design, Graphic Design. It drives the homepage filter and the category kicker on the project's detail page. `services` stays a free-form string array describing the actual disciplines used on that project (unchanged from before) — it is not restricted to the category list.

### Portfolio filtering (homepage)

`src/components/PortfolioGrid.tsx` (a client component) renders an "All" + one button per category actually present among the featured projects, and filters the grid client-side with no page reload. It only shows a filter row when there's more than one category to filter by, so a category never appears as a dead-end button with nothing behind it. Filters are plain `<button>` elements (native keyboard support, `aria-pressed` for state) inside a `role="group"` — no animation library, no custom keyboard-handling code.

### How featured projects are selected

The homepage renders published projects where `featured: true`, capped at `MAX_FEATURED_PROJECTS` (currently 3, matching the grid's current visual rhythm — see the constant in `src/data/projects.ts`) in their `projects` array order. Mark more than that many as featured to build a rotation; only the first `MAX_FEATURED_PROJECTS` in array order will actually render — the layout never breaks no matter how many are flagged. A project with `featured: false` still gets its own `/work/[slug]` page and still appears in Previous/Next navigation — it just doesn't show up in the homepage grid.

### Draft vs. published projects

Set `status: "draft"` while preparing a project. Draft projects:
- stay in `src/data/projects.ts` (so you can work on the data ahead of time)
- are **excluded** from `generateStaticParams`, so `/work/[slug]` is never generated for them and the URL 404s
- are excluded from the homepage grid, even if `featured: true`
- are excluded from Previous/Next navigation on other projects' pages

Omit `status` (or set `status: "published"`) to make a project public. `getPublishedProjects()` in `src/data/projects.ts` is the single choke point every public-facing list/lookup goes through — there's no separate place that needs to remember to filter drafts out.

### Rules against inventing project facts

**Never invent a client name, year, result, or credit.** `client`, `year`, `results`, and `credits` are all optional fields — leave them `undefined` until you have the real, confirmed information. The same goes for `thumbnail`, `heroImage`, and `gallery`: if a real project photo doesn't exist yet, leave the image field undefined rather than pointing it at a placeholder/stock image. The UI already has a built-in fallback for this (see below) — it is not a gap that needs to be filled with a fake photo.

### Where project images go

```
public/images/projects/[project-slug]/
  hero.jpg          → heroImage
  thumbnail.jpg       → thumbnail
  gallery-1.jpg          → gallery[0]
  gallery-2.jpg              → gallery[1]
```

Use `projectImagePath(slug, filename)` from `src/data/projects.ts` to build these paths instead of typing them by hand — it just builds the string (`/images/projects/${slug}/${filename}`) and never touches the file system, so it's safe to call at build time. All project images use `next/image`, and every image field is `{ src, alt }` — the type system will not let you add an image without alt text, and the validator will flag any image path that isn't local or doesn't live under that project's own folder.

**If a project has no real photography yet:** leave `thumbnail`/`heroImage`/`gallery` undefined. `ProjectHero` automatically falls back to the same bold typographic treatment already used for every card in the homepage grid (the big split-word `.project-art` display) — this is the site's actual placeholder pattern, not a generic gray box, and it's what all three current projects use today.

### How to add a new portfolio project

1. Open `src/data/project.template.ts` and copy `minimalProjectTemplate` (bare minimum) or `fullProjectTemplate` (every optional field shown) into the `projects` array in `src/data/projects.ts`.
2. Fill in real fields only. Set `status: "draft"` while you're still working on it if you don't want it public yet.
3. If you have real photos, drop them in `public/images/projects/[slug]/` and reference them with `projectImagePath(slug, filename)`. Otherwise leave those fields out entirely.
4. Set `featured: true` if it should appear on the homepage (remove/flip `status` to publish it, or leave `status: "draft"` until it's ready).
5. Run `npm run build` — the new `/work/[slug]` route, its metadata, its category filter button, and Previous/Next links all generate automatically. No other file needs to change. If something's wrong with the data, the build will fail and list exactly what.

### Branded portfolio placeholders (in use for Crash the Stove)

When a project's case study is ready before real photography/artwork is, it's acceptable to use **hand-built, clearly-labeled branded placeholder graphics** instead of leaving `heroImage`/`gallery` undefined — useful when the gallery layout itself needs to be demonstrated, not just the copy. Rules for these:

- They must look like intentional design-system placeholders (bold typography, on-brand color/texture, a visible "PORTFOLIO PLACEHOLDER" stamp) — never like real event/product photography.
- Alt text must say outright that the image is a placeholder (see the Crash the Stove entries in `src/data/projects.ts` for the pattern), never described as if it were real photography.
- No stock imagery, no AI-generated photorealistic images, no invented event/product facts baked into the graphic.
- Each placeholder file keeps a **stable filename** so a real asset can replace it later by overwriting the same path — no `projects.ts` change required when the swap happens, exactly like the SP Juices `hero.png`/`logo.png` overwrites.

**Crash the Stove replacement map** (`public/images/projects/crash-the-stove/`) — when real assets arrive, replace the file at each path in place; no code changes needed unless the final asset count/roles differ from this list:

| Current placeholder file | Replace with |
|---|---|
| `hero-placeholder.png` | Final hero artwork or photo |
| `main-event-campaign-placeholder.png` | Main event flyer/campaign graphic |
| `artist-promotion-placeholder.png` | Artist campaign graphics |
| `vendor-networking-placeholder.png` | Vendor/networking campaign graphics |
| `vip-ticket-placeholder.png` | Ticket/VIP artwork |
| `event-day-placeholder.png` | Signage/setup/location graphics |
| `photography-placeholder.png` | Real event photography |
| `video-placeholder.png` | Future event recap media — **still image only today**; the portfolio architecture is image-only and would need to expand to support mixed image/video galleries before this can hold an actual video |

**Mental Town Exotics replacement map** (`public/images/projects/mental-town-exotics/`) — same one-for-one file-overwrite pattern:

| Current placeholder file | Replace with |
|---|---|
| `hero-placeholder.png` | Final hero artwork |
| `brand-identity-placeholder.png` | Final logo/identity presentation |
| `packaging-system-placeholder.png` | Final packaging lineup |
| `label-design-placeholder.png` | Final label designs |
| `product-mockups-placeholder.png` | Real product mockups/photos |
| `brand-details-placeholder.png` | Typography/colors/details |
| `print-applications-placeholder.png` | Real print applications |
| `social-media-placeholder.png` | Real campaign graphics |
| `photography-placeholder.png` | Real photography |
| `video-placeholder.png` | Future video content — still image only today, same architecture note as above |

## Services system

Every service lives as one object in the `services` array in `src/data/services.ts`, typed by the `Service` type defined at the top of that file. Adding a service to that array automatically:

- generates a static page at `/services/[slug]` (via `generateStaticParams`)
- generates that page's `<title>`/meta description (via `generateMetadata`, from the service's `seo` field)
- adds a linked row to the homepage "What we bring" list, if `featured: true`

There is no `/services` index/hub page by design — this mirrors the portfolio's existing pattern (no `/work` index page either). The homepage service rows are the discovery path to each dedicated service page, and the primary nav's "Services" item continues to point at the homepage `#services` section, not a new route.

### Schema

`Service` fields: `slug`, `title`, `shortTitle`, `summary` (homepage row copy), `fullDescription` (detail-page overview copy), `featured`, `serviceNumber`, `capabilities` (string list — the first three are used as the homepage row's/hero's tag chips), `deliverables` (string list), `process` (`ServiceProcessStep[]`, each `{ title, description }`), `ctaLabel`, optional `heroImage`/`gallery` (`ServiceImage: { src, alt }`).

### Commerce extension fields (not active yet)

`Service` also declares optional scalar fields for a future commerce phase: `startingPrice`, `pricingNote`, `turnaround`, `revisions`, `depositAmount`, `purchasable`, `intakeFormSlug`, `cartEligible`. **None of these are populated or rendered anywhere today** — every current entry leaves them `undefined`. They exist on the type now so the commerce phase can start filling in real values without a data-model migration. Deliberately **not** built yet: `ServicePackage`/`ServiceAddOn` types, any pricing/package/tier UI, deposits, an intake-form flow, or cart/checkout. Add those types and that UI only when the commerce phase actually starts — don't pre-model structures nothing consumes.

### Validation

`src/data/services.ts` calls `validateServices()` (from `src/data/services.validate.ts`) on the `services` array at module load, so `npm run dev`/`npm run build` fails immediately and lists every problem at once if service data is invalid. It checks: unique slugs, unique `serviceNumber`s, non-empty titles, non-empty summaries, no duplicate titles, `seo.title`/`seo.description` present, and (if `heroImage`/`gallery` are ever populated) that image paths are local and live under that service's own `/images/services/[slug]/` folder with no duplicate gallery images.

### Rules against inventing service facts

**Never invent pricing, turnaround guarantees, revision counts, client numbers, awards, team size, revenue/results, years of experience, or manufacturing/production capabilities.** Event Management copy specifically avoids claiming full-service event production, venue management, talent booking, or financial management — it's scoped to creative support and promotional coordination. Websites copy avoids claiming backend/application development. If a claim isn't verified, leave it out rather than writing around it.

### CTA behavior

Every service page's CTA (`ServiceCTA`) links to the homepage contact section (`/#contact`) — inquiry-only. No cart, checkout, payment integration, package picker, or intake workflow exists yet.

### How to add or edit a service

1. Edit or add an entry directly in the `services` array in `src/data/services.ts`. There's no separate template file (unlike portfolio's `project.template.ts`) since the schema is small enough to copy an existing entry.
2. If you have real images, drop them in `public/images/services/[slug]/` and reference them with `serviceImagePath(slug, filename)`. Otherwise leave `heroImage`/`gallery` undefined — `ServiceHero` falls back to the same typographic `.project-art` treatment used by projects without photography.
3. Run `npm run build` — the new `/services/[slug]` route, its metadata, and its homepage row all generate automatically.

## Catalog system (commerce foundation)

**Status: data model + read-only storefront UI. No cart, no checkout, no payments, no admin dashboard exist yet.** This section documents the data model built in the commerce-foundation phase; see "Store (storefront UI)" below for the public `/store` UI built on top of it in the following phase.

### Purpose and scope

The catalog (`src/data/products.ts`) is a separate system from the portfolio (`projects.ts`) and services (`services.ts`) — it exists to eventually support **purchasable offerings**: both physical products (stickers, labels, printed materials, merchandise) and purchasable creative-service packages (e.g. a priced "Packaging Design — Standard" offering). `products.ts` ships with an intentionally **empty** `products` array — no live products exist yet, and none should be added without real, confirmed content and pricing.

### id vs. slug — read this before adding a product

Every `Product` has two identifiers with different jobs:

- **`id`** — the permanent internal identity. Never derive it from the title or slug, never change it once assigned, never reuse a retired one. A future order/admin/database system will reference `product.id`, not `product.slug`.
- **`slug`** — the editable public URL identity (`/store/[slug]`, once that route exists). A product can be renamed/re-slugged later without breaking anything that already referenced it by `id`.

This split exists specifically so a future rename doesn't silently break historical order references once real orders exist. For the current TypeScript-file phase, `id` can be any human-readable stable string (e.g. `prod_packaging_design_standard`) or a UUID-style string — it just has to be unique and never regenerated from other fields. Both `id` and `slug` are validated for uniqueness independently.

### Schema

`Product` fields: `id`, `slug`, `productType` (`"physical" | "service"`), `title`, `shortTitle`, `summary`, `fullDescription`, `status` (**required**, see below), `featured`, `category` (one of `PRODUCT_CATEGORIES`), `media` (ordered `Media[]`, see below), optional `options`/`packages`/`addOns`, `pricing` (`ProductPricing`), optional `relatedServiceSlug`, `ctaLabel`, `seo`.

- **`PRODUCT_CATEGORIES`**: Design Services, Printing, Stickers & Labels, Event & Promotional, Merchandise, Other. Kept as a single fixed, centralized list (like `PROJECT_CATEGORIES`) specifically so it can be migrated into an admin-managed table later without touching every product.
- **`ProductOption`** (`key`, `label`, `values: ProductOptionValue[]`, `required`) models generic configurable choices — size, quantity, finish, material, package tier, turnaround, etc. It is intentionally not sticker-specific. Each `ProductOptionValue` (`label`, `value`, optional `priceDelta`) may carry a *signed* price adjustment in cents (a smaller size can legitimately cost less than the base).
- **`ProductPackage`** (`slug`, `label`, `description`, optional `price`/`startingPrice`/`deliverables`/`turnaround`) models tiered offerings like Basic/Standard/Premium under a single product.
- **`ProductAddOn`** (`slug`, `label`, optional `description`/`price`, required `chargeType: "per-line" | "per-unit"`) models optional extras (e.g. an extra revision round, rush production). `chargeType` is required specifically so add-on pricing is never ambiguous: `"per-line"` charges once for the whole cart line regardless of quantity; `"per-unit"` multiplies by quantity. See "Cart" below for how this is actually applied.
- **`ProductPricing`** (`mode: PurchaseMode`, optional `basePrice`/`startingPrice`/`depositAmount`/`salePrice`/`pricingNote`) — the product's top-level/summary pricing, independent of any per-package pricing.
- **`Money`** is `type Money = number` — **always integer cents**, never a float dollar amount. There is no currency field yet; USD is implied site-wide.

### Media model

`src/data/media.ts` defines a `Media` type shared only by the catalog — deliberately **not** retrofitted onto `ProjectImage`/`ServiceImage`, which stay exactly as they are on the existing, content-approved portfolio and services systems.

```ts
type Media = {
  type: "image" | "video";
  src: string;
  alt: string;      // required for both image and video
  poster?: string;   // required by validation when type is "video"
  caption?: string;   // optional, distinct from alt (accessibility text vs. display caption)
};
```

`Product.media` is a single **ordered array**, not a hero/gallery split — `media[0]` is the primary/hero item by convention. This is a deliberate departure from the Project/Service pattern, chosen because a future admin needs to let someone drag-and-drop reorder media directly; a flat ordered array maps onto that far more naturally than a fixed hero+gallery shape. No video player exists yet — the type only needs to be correct, not renderable.

### Status lifecycle — required, not optional

```ts
type ProductStatus = "draft" | "published" | "archived";
```

Unlike `Project.status` (optional, where omission means published), **`Product.status` is a required field with no implicit default.** A product object that omits `status` is a TypeScript error, not a silent "published" default. This is intentional: it prevents a newly created product from accidentally going public because someone forgot to set a field. A future admin should always default a newly created product to `"draft"`.

- `draft` — never appears in any public listing or route, once those exist.
- `published` — the only status that will generate a public `/store/[slug]` route.
- `archived` — also excluded from public listings/routes, but distinct from `draft` for a future admin's sake (was live and got retired, vs. never went live). `getProductById()` still finds archived (and draft) products by their permanent `id`, since a future order could still reference one.

### Pricing consistency rules

Structural checks (integer, non-negative, valid enum) always apply. "Must eventually have a real price" checks apply **only once a product is `published`** — drafts can freely omit real numbers while an offering is still being defined:

- `inquiry` — never requires a price.
- `fixed-price` / `full-payment` — a published product in this mode requires `pricing.basePrice`.
- `starting-price` — a published product in this mode requires `pricing.startingPrice`.
- `deposit` — a published product in this mode requires `pricing.depositAmount` and at least one of `basePrice`/`startingPrice`.

### Validation

`src/data/products.validate.ts` exports `validateProducts()`, called at module load in `products.ts` exactly like `validateProjects()`/`validateServices()` — a bad entry fails `npm run dev`/`npm run build` immediately, listing every problem at once, not just the first. It checks (non-exhaustive): unique `id`, unique `slug`, valid `productType`/`status`/`category`/`pricing.mode`, non-empty `title`/`summary`, required `seo.title`/`seo.description`, the pricing-consistency rules above, non-negative integer-cent values on every money field (`priceDelta` is the one exception — it may be negative, but must still be a whole integer), image/video `alt` required, video `poster` required, local-only media paths scoped under that product's own `/images/products/[slug]/` folder, no duplicate media `src` within a product, no duplicate `options[].key`/`packages[].slug`/`addOns[].slug` within a product, valid `addOns[].chargeType`, and — if set — `relatedServiceSlug` must match a real `Service.slug`. An empty `products` array is valid; the catalog is allowed to start empty.

`PRODUCT_TYPES`/`PRODUCT_STATUSES`/`PRODUCT_CATEGORIES`/`PURCHASE_MODES` are passed into `validateProducts()` as parameters rather than imported by `products.validate.ts`, mirroring `projects.validate.ts`'s pattern — this avoids a circular import, since `products.ts` calls `validateProducts()` with its own data at module load. `services` **is** imported directly into `products.validate.ts` (safe: `services.ts` never imports from `products.ts`, so there's no cycle) to check `relatedServiceSlug` against real service slugs.

### Service ↔ Product relationship

`Service` (the informational, inquiry-oriented marketing page at `/services/[slug]`) and `Product` (a purchasable catalog entry) are **fully separate systems** — this phase makes zero changes to `services.ts` or any service page component. A `Product` with `productType: "service"` may optionally set `relatedServiceSlug` to point at a real `Service.slug` (e.g. a future "Packaging Design — Standard" product would set `relatedServiceSlug: "packaging"`). This is a one-directional reference — `Service` has no knowledge of which products link to it — resolved on demand via `getProductsByServiceSlug(slug)` in `products.ts`. Rendering that relationship anywhere on an actual service page (e.g. a "View packages" link) is future work, not part of this phase; existing service pages remain exactly as they were in Phase 6.

### Public route

```
/store            — catalog index, see "Store (storefront UI)" below
/store/[slug]      — individual product detail page
```

`/store/[slug]/page.tsx` mirrors `work/[slug]/page.tsx` and `services/[slug]/page.tsx` exactly: `generateStaticParams` from `getPublishedProducts()`, `generateMetadata` from `product.seo`, `notFound()` + `dynamicParams = false` so anything outside the static param list 404s instead of rendering on demand. `productHref(slug)` in `products.ts` returns `/store/${slug}`; `STORE_INDEX_HREF` (also in `products.ts`) is the single source of truth for the `/store` index path, used by both the primary nav and the route itself.

### How to add a product (once real content exists)

1. Copy `physicalProductExample` or `serviceProductExample` from `src/data/product.template.ts` into the `products` array in `products.ts` and fill in real fields only. Leave `status: "draft"` until it's actually ready.
2. Never invent pricing, deposits, turnaround guarantees, or client facts — leave those fields `undefined` until confirmed, exactly like the portfolio and services rules.
3. If real media exists, drop it in `public/images/products/[slug]/` and reference it with `productImagePath(slug, filename)`; otherwise leave `media: []` rather than using a stock/placeholder photo (the hand-built branded-placeholder pattern documented under "Portfolio system" is the one sanctioned exception, if it's ever needed here).
4. Run `npm run build` — the validator will fail loudly and list every problem if something's wrong with the data. Note that once a product is `status: "published"`, the validator additionally requires it to have at least one `media` item and a real price appropriate to its `pricing.mode` (see "Pricing consistency rules" above) — keep it as `"draft"` until those are ready.
5. Setting `status: "published"` makes the product publicly visible immediately: it appears in the `/store` grid and generates a real `/store/[slug]` page on the next build.

### Future database/admin migration notes

This model is deliberately shaped so it can move from flat TypeScript arrays into persistent database records managed through a future **Big Red Admin** without a redesign:

- Every entity uses explicit, structured fields (no nested functions/closures, no `Map`/`Set` in the data itself) — a straightforward shape for JSON serialization or a relational table.
- `id` is the stable primary-key candidate; `slug` is a renameable, independently-unique secondary field — exactly the split a real database and a real admin "change slug without changing ID" feature need.
- `PRODUCT_CATEGORIES` is centralized in one place specifically so it can become an admin-managed table (or a seeded lookup table) instead of a hardcoded list.
- `media` being a flat ordered array (not hero/gallery) is specifically meant to survive a future "upload media / drag to reorder" admin UI without a shape change.
- Planned future admin capabilities this model is already compatible with: Add Product, Edit Product, Duplicate Product, change `slug` without changing `id`, Upload images/video, Reorder media, Set pricing, Set deposits, Manage packages, Manage options, Manage add-ons, Feature/unfeature, Publish, Archive. None of that UI exists yet — only the data shape it will eventually operate on.
- Future cart/checkout integration points: `Product.pricing.mode` is what a future cart would branch on (inquiry → contact form, fixed-price/full-payment → direct checkout, deposit → partial payment flow, starting-price → likely routes to inquiry/quote first). None of that logic exists yet.

## Store (storefront UI)

**Status: public, read-only browsing UI. Still no cart, checkout, payments, or admin.** Built on top of the catalog system above — this section documents the UI layer specifically.

### Route behavior

- **`/store`** (`src/app/store/page.tsx`) — a plain static page (not a `[slug]` route), heading + intro from `src/data/store.ts`, then `StoreGrid` rendering **every published product** (not a featured-only subset — this is the full browse page, unlike the homepage's capped teaser sections).
- **`/store/[slug]`** (`src/app/store/[slug]/page.tsx`) — statically generated only for published products, via the same `generateStaticParams`/`generateMetadata`/`notFound()`/`dynamicParams = false` pattern as `/work/[slug]` and `/services/[slug]`. Draft and archived products are never in the static param list, so their slugs 404 — there is no other gate to remember.

### ProductCard

`src/components/ui/ProductCard.tsx` — the whole card is one accessible link (the same stretched-link technique as `ProjectCard`/`ServiceCard`), always derived from `productHref(product.slug)`, never a hardcoded URL. It shows: `media[0]` as the primary image (or a video's `poster`, with a small rotated "VIDEO" badge — see below), category, a "Featured" badge when `product.featured` is true, title, a "Product"/"Service" label from `productType`, and a pricing summary from `formatPricingSummary()`. With no media at all, it falls back to the same typographic split-word treatment (`.project-art`) already used by `ProjectHero`/`ServiceHero` for content without photography — never a stock or generated photo.

### Primary media convention

`product.media[0]` is always the primary/hero item — used by both `ProductCard` and `ProductHero`. `ProductMedia` (the detail page's gallery section) renders `media.slice(1)` and is only rendered by the page when that slice is non-empty.

### Video poster behavior

No video player or playback exists anywhere in the app. Any `media` item with `type: "video"` renders its `poster` image (falling back to `src` only if `poster` is somehow missing, though the Phase 7 validator already requires a poster on every video item) with a small on-brand "VIDEO" badge overlaid (`.media-video-badge`, styled like the existing rotated sticker/stamp badges) so it's clear video content exists without pretending to play it.

### Money formatting

`src/data/money.ts` is the **only** place in the app that divides a `Money` (integer cents) value by 100. `formatMoney(cents)` uses `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` (e.g. `50000 → "$500.00"`). `formatPricingSummary(pricing)` and `getPurchaseModeLabel(mode)` centralize every purchase-mode-aware pricing string (e.g. "Starting at $X", "$X deposit to start", "Inquire for pricing") so that branching on `pricing.mode` happens in exactly one file, not separately inside `ProductCard`, `ProductHero`, and `ProductPricing`.

### Category filtering

`StoreGrid.tsx` mirrors `PortfolioGrid.tsx` exactly: derives the distinct categories actually present among the products it received, renders "All" + one button per present category (only when there's more than one to filter by), filters client-side with no page reload, using plain `<button>`s with `aria-pressed` inside a `role="group"` — reuses the existing `.portfolio-filters`/`.portfolio-filter` CSS verbatim, since that pattern is already category-agnostic.

### Empty catalog state

With zero published products, `/store` shows a deliberately designed empty state (`.store-empty` — a bordered, on-brand block with a heading and message from `store.ts`), not a blank page or a bare "no results" line. No fake/seed products are ever added just to make the page look populated.

### CTA behavior (inquiry-only for every purchase mode)

Every product's CTA (`ProductCTA`) links to `/#contact` and uses `product.ctaLabel` directly from the data — the component never invents or branches on CTA copy itself. This is true regardless of `pricing.mode`: `inquiry`, `fixed-price`, `starting-price`, `deposit`, and `full-payment` all currently render the same non-transactional, contact-form-bound CTA. No cart, checkout, or payment integration exists yet.

### Navigation anchor fix

`src/data/navigation.ts`'s homepage-section links (`Services`, `Work`, `Studio`, `Contact`) now use an absolute `/#anchor` href instead of a bare `#anchor`. A bare `#services` only works while already on the homepage — clicked from `/store`, `/store/[slug]`, `/work/[slug]`, or `/services/[slug]`, it would just look for that id on the *current* page and silently fail. `/#services` always navigates to `/` first (a normal absolute link, no JavaScript involved), and the browser's native hash-scroll takes it from there. The `Store` nav item (added between `Work` and `Studio`) uses `STORE_INDEX_HREF` from `products.ts` instead of a literal string.

### Future cart/checkout integration point

Unchanged from the Phase 7 plan: `Product.pricing.mode` is what a future cart/checkout flow will branch on (`inquiry` → contact form as today, `fixed-price`/`full-payment` → direct checkout, `deposit` → partial-payment flow, `starting-price` → quote/inquiry first). `ProductCTA` is the single component that will need to grow that branching logic later — today it deliberately does not have it.

## Cart (transactional foundation)

**Status: a real, working client-side cart. Still no `/checkout`, no payments, no orders, no accounts, no admin.** This is the layer between the read-only storefront above and a future checkout — it lets a shopper configure and add eligible products/packages, see accurate running totals, and persist that cart across a refresh, entirely client-side.

### Architecture

React Context + `useReducer` (`src/components/CartProvider.tsx`) — no state-management dependency was added; none was needed. `CartProvider` wraps the whole app from `src/app/layout.tsx`, so `useCart()` is available anywhere. All cart math is centralized in `src/data/cart-pricing.ts` — components never do their own `unitPrice * quantity` arithmetic.

### `CartItem` schema (`src/data/cart.ts`)

```ts
type CartItem = {
  cartLineId: string;      // crypto.randomUUID() — identifies this LINE, not the product
  productId: string;       // Product.id — permanent identity, never slug
  productSlug: string;      // frozen display snapshot, for linking back
  productTitle: string;      // frozen display snapshot
  productType: ProductType;
  purchaseMode: PurchaseMode;  // snapshot of pricing.mode at add-time
  quantity: number;         // positive integer, >= 1

  selectedPackage?: CartPackageSelection;   // { packageSlug, label, price?, startingPrice? }
  selectedOptions: CartOptionSelection[];   // { optionKey, optionLabel, value, valueLabel, priceDelta }
  selectedAddOns: CartAddOnSelection[];    // { addOnSlug, label, price?, chargeType }

  unitPrice: number;       // cents — resolved once at add-time, see below
  depositAmount?: number;    // cents snapshot, only when purchaseMode === "deposit"
  addedAt: string;         // ISO timestamp
};
```

The cart **never** stores a full `Product` object — only this frozen, transaction-relevant snapshot. `productSlug`/`productTitle` are captured once and never re-read from the live product, so a later rename or copy change doesn't alter what an already-added cart line shows.

### `Product.id` vs slug in the cart

Every cart operation (lookup, merge-detection, future order linkage) keys off `productId`, never `productSlug`. This is the same `id`/`slug` split documented under "Catalog system," now actually put to use: a product can be renamed or re-slugged later without touching any cart line that already references it by `id`.

### Price snapshots — resolved once, never re-derived

`unitPrice` is computed **once**, when an item is added, by `buildCartItem()` in `cart.ts`: the selected package's price (or the product's `basePrice`/`startingPrice` if no package), plus the sum of every selected option's `priceDelta`. It is never recalculated from the live product afterward — a price change on the product later does not retroactively change an existing cart line. Add-ons are priced **separately**, not folded into `unitPrice` — see below.

### Add-on `chargeType` — per-line vs per-unit

`ProductAddOn.chargeType` (`"per-line" | "per-unit"`, required) is snapshotted onto `CartAddOnSelection.chargeType` when added, and is what `calculateLineSubtotal()` in `cart-pricing.ts` branches on:

```ts
addOnsTotal = sum of: addOn.chargeType === "per-unit" ? addOn.price * quantity : addOn.price
lineSubtotal = unitPrice * quantity + addOnsTotal
```

A `"per-line"` add-on (e.g. an extra revision round) charges once no matter the quantity; a `"per-unit"` add-on (e.g. an extra print color) scales with it.

### Centralized cart math (`src/data/cart-pricing.ts`)

`calculateLineSubtotal(item)`, `calculateCartSubtotal(items)`, `calculateCartItemCount(items)` (sum of quantities — a line with quantity 2 and a line with quantity 1 show as `Cart (3)`, not `Cart (2 lines)`), `calculateCartDepositDue(items)`, `cartHasEstimatedPricing(items)`. Nothing on `CartItem` stores a redundant total — every total is derived on demand, so a quantity change can never leave a stale stored number behind. This is deliberately different from a future **Order**, which will freeze a real `lineTotal` permanently once created (mutable cart derives; immutable order freezes).

### Cart line identity and merging

`getConfigurationSignature()` builds a deterministic, order-safe string from `productId` + selected package slug + sorted option key:value pairs + sorted add-on slugs (never including `cartLineId`, quantity, or `addedAt`). `ADD_ITEM` in the reducer compares this signature against existing lines: an identical configuration **increments the existing line's quantity**; any different configuration (different package, different option, different add-on selection) becomes its own separate line, even for the same product.

### Quantity rules

Positive integers only, minimum 1, no decimals (`UPDATE_QUANTITY` floors and clamps), no invented maximum. The quantity stepper's "−" button clamps at 1 and never removes the line — removing a line is always the explicit "Remove" action (`REMOVE_ITEM`). Not hardcoded to 1 for `productType: "service"`.

### Purchase-mode behavior

- **`inquiry`** — never enters the cart, under any circumstance. `isCartEligible()` returns `false` unconditionally for it; the product page keeps rendering the original inquiry-only `ProductCTA` exactly as in Phase 8.
- **`fixed-price` / `full-payment`** — fully cart-eligible once `basePrice` is set (already guaranteed for any published product by the Phase 7 validator).
- **`deposit`** — cart-eligible once `depositAmount` and a base/starting price are set. The cart snapshots both `unitPrice` (full/base price) and `depositAmount` separately, so `CartItemRow`/`CartSummary` can show "Total" and "Deposit due now" as distinct numbers. No payment collection of any kind exists.
- **`starting-price`** — cart-eligible (Option B) once either `pricing.startingPrice` or a package with its own `price`/`startingPrice` exists. Every cart line built from a `starting-price` product keeps `purchaseMode: "starting-price"` regardless of whether a specific package resolved a concrete number, and `CartItemRow`/`CartSummary` always label these lines/totals as estimated ("Est. $X", "Estimated subtotal", "final price subject to confirmation") rather than distinguishing "resolved" from "unresolved" starting-price lines. This is a deliberate simplification in favor of never understating uncertainty — a future checkout phase is what actually resolves/confirms a final number before payment.

`isCartEligible(product)` in `cart.ts` is the **one** place this logic lives — no component re-implements these checks.

### Product configuration (`ProductPurchasePanel`)

For eligible products, `/store/[slug]/page.tsx` renders `ProductPurchasePanel` (a client component) instead of the informational options/packages/add-ons blocks + `ProductCTA`. It owns local configuration state (selected package, selected option values, selected add-on slugs, quantity), computes a live price preview using the same `buildCartItem()` the real "Add to Cart" action uses (so the number shown while configuring always matches what gets added), and disables "Add to Cart" until every required option has a value and a package is selected whenever the product has packages.

`ProductOptions`, `ProductPackages`, and `ProductAddOns` were **extended**, not duplicated: each now accepts optional controlled-selection props (e.g. `ProductOptions`'s `selectedValues`/`onSelectValue`). Omitted (as on non-eligible product pages), they render exactly as they did in Phase 8 — read-only chips/cards/list. Provided (by `ProductPurchasePanel`), the same components render native `<input type="radio">`/`<input type="checkbox">` controls instead. None of the three needs a `"use client"` directive itself — they have no hooks of their own, so they work correctly whether imported from a server-rendered product page or from the client `ProductPurchasePanel`.

### Persistence (`localStorage`)

**Temporary pre-account persistence, not the order database.** A future accounts/checkout phase will migrate live cart state server-side; until then, the cart survives navigation and refresh via a versioned envelope in `localStorage`:

```ts
{ version: 1, items: CartItem[] }   // CART_SCHEMA_VERSION in cart.ts
```

Hydration-safe by construction: cart state starts **empty** on both the server render and the very first client render (so there's no hydration mismatch), then a `useEffect` — which only ever runs in the browser, after mount — reads and validates `localStorage`. Any shape mismatch, version mismatch, or JSON parse failure discards the **whole** persisted cart rather than trusting a partially-corrupt one; this is logged via `console.warn`, never thrown. `window`/`localStorage` are never touched outside effects or event handlers, so nothing runs during server rendering. `cartReducer`, `isValidCartItem`, and `loadPersistedCart` are exported from `CartProvider.tsx` specifically so this logic can be (and was) unit-tested directly.

### Cart navigation

A small client component, `CartNavLink`, renders `Cart (N)` (N = summed quantity across all lines) and is appended after the existing `primaryNav` map in `Header.tsx` — `navigation.ts` was **not** changed, since a live count can't live in a static data array. This was the one necessary, narrow touch to `Header.tsx`; nothing else about it changed.

### `/cart` route

`src/app/cart/page.tsx` (server component, for its `metadata` export) renders `Header`, a heading, a client `CartView`, and `Footer`. `CartView` shows `CartEmptyState` when there are no items, or `CartItemRow` per line (title/link back to the product, selected package/options/add-ons, quantity control, per-line price, Remove) plus `CartSummary` (item count, subtotal — labeled "Estimated subtotal" whenever any line is a `starting-price` line, deposit due if applicable, and the checkout control).

### Checkout — now built (see "Checkout + Order foundation" below)

`CartSummary`'s "Continue to Checkout" is a real link to `/checkout`, active whenever the cart has at least one item (the button/link only ever renders alongside a non-empty cart — `CartView` shows `CartEmptyState` instead when there's nothing to check out). The full checkout/order flow is documented in its own section below.

## Checkout + Order foundation

**Status: a real checkout flow backed by a durable database order path — see "Backend + database foundation" below for the full server-side architecture.** Orders are now permanently stored with real, human-readable `BRCP-####` order numbers. Still no payment collection, no customer accounts, no admin. This section documents the checkout UI and the `OrderDraft`/`OrderLine` client-side value objects; the section below documents what actually persists them.

### Core principle: Cart is mutable, Order data is frozen

`OrderDraft`/`OrderLine` (`src/data/orders.ts`) are the checkout-and-beyond counterpart to `CartState`/`CartItem`: where a cart always re-derives its totals from live snapshots, an `OrderLine` freezes everything the moment it's created from a `CartItem`, including the line subtotal itself. Order rendering never depends on the current `Product` record — in fact `cartItemToOrderLine()`/`buildOrderDraft()` don't import `products.ts` at all, only `cart.ts`, which is a structural guarantee (not just a convention) that historical order data can't accidentally read live catalog state.

### `OrderLine` schema

```ts
type OrderLine = {
  orderLineId: string;      // crypto.randomUUID() — distinct from the CartItem's cartLineId
  productId: string;        // permanent — never slug
  productSlug: string;
  productTitle: string;
  productType: ProductType;
  purchaseMode: PurchaseMode;
  quantity: number;

  // Reused directly from cart.ts — CartOptionSelection/CartPackageSelection/
  // CartAddOnSelection are already frozen, Product-independent value
  // shapes, so there are no separate Order-specific selection types.
  selectedPackage?: CartPackageSelection;
  selectedOptions: CartOptionSelection[];
  selectedAddOns: CartAddOnSelection[];

  unitPrice: number;
  depositAmount?: number;
  lineSubtotal: number;      // FROZEN here via calculateLineSubtotal() — unlike CartItem, which never stores this

  // Service-intake handoff — always undefined today, see below.
  intakeRequired?: boolean;
  intakeFormSlug?: string;
  intakeStatus?: "not-started" | "in-progress" | "complete";
};
```

### `OrderDraft` schema and status lifecycle

```ts
const ORDER_STATUSES = ["draft", "submitted", "needs-review", "confirmed", "cancelled"] as const;
```

No `paid`/`fulfilled`/`refunded` states exist yet — those belong to a future payment phase. `buildOrderDraft(items, customer, notes)` in `orders.ts` is the single place a `CartItem[]` + customer input becomes an `OrderDraft`, and it decides `status` itself: **any `starting-price` line makes the whole draft `"needs-review"` instead of `"submitted"`** — an unresolved estimate must never be presented as a confirmed, ready request. `OrderDraft` also carries `id` (permanent, `crypto.randomUUID()`), `createdAt`/`updatedAt`, `customer` (`OrderCustomer`), optional `billingAddress`/`shippingAddress` (`OrderAddress` — typed now, collected by **no** Phase 10 UI), `lines`, `pricingSummary` (`{ subtotal, depositDue, hasEstimatedPricing }`, all frozen at build time), and optional `notes`.

**What "submitted"/"needs-review" mean today:** the client-side `OrderDraft` built by `buildOrderDraft()` is a **preview only** — what actually determines the persisted order's status is the server, which independently recomputes the same decision from server-verified data (see "Backend + database foundation" below). Once `POST /api/orders` returns success, the order is genuinely, permanently stored with a real order number, and the UI says so plainly ("Order BRCP-#### received" — see "Honest wording," updated below).

### Order numbers — now real, generated server-side

`OrderDraft.id` (the permanent UUID) is still the value this client-side layer works with — `orders.ts` has no knowledge of the human-readable order number at all, and still never derives one from a timestamp, email, or client-side counter. The real `BRCP-####` number is generated server-side by a Postgres sequence at persistence time and only reaches the client in `POST /api/orders`'s response — see "Order numbering" under "Backend + database foundation" below.

### Customer fields

`OrderCustomer`: `firstName`, `lastName`, `email` (all required), `phone`, `company` (both optional). No passwords, no accounts — `validateOrderDraft()` enforces the required three plus a lightweight email-shape check, nothing more.

### Runtime validation — different in kind from the build-time validators

`src/data/orders.validate.ts` exports `validateOrderDraft(draft): string[]`. This is **not** the same pattern as `projects.validate.ts`/`services.validate.ts`/`products.validate.ts`, which throw at module load against a static, hardcoded array. An `OrderDraft` is constructed at runtime from checkout form input plus live cart state, so `validateOrderDraft` is called imperatively at submission time and **returns** every problem found (same "collect everything, not just the first" philosophy) for inline UI display — it never throws. It checks: required customer names, email shape, at least one line, required IDs and product-title snapshots per line, positive-integer quantities, non-negative integer-cent money fields, a valid `status`, deposit consistency (`depositAmount` only valid when `purchaseMode === "deposit"`), and estimated-pricing consistency (a `starting-price` line requires `pricingSummary.hasEstimatedPricing`).

### Starting-price at checkout — Option A, tagged `needs-review`

A cart containing unresolved `starting-price` items can still produce an order request — blocking submission outright didn't fit how a creative agency actually works (most engagements start as an estimate). Instead the resulting draft is tagged `"needs-review"` rather than `"submitted"`, and `OrderReview`/the submitted-state screen always visibly label estimated totals ("Estimated subtotal," "final price subject to confirmation") — never blended into a plain, confirmed-looking total.

### Deposit handling

Exactly mirrors the cart: `OrderLine.depositAmount` and `OrderPricingSummary.depositDue` are frozen snapshots. The UI distinguishes "Order value" (or "Estimated subtotal") from "Deposit expected later" — no "Pay Deposit" wording anywhere, no collection of any kind.

### Service intake — prepared, not built

`OrderLine.intakeRequired`/`intakeFormSlug`/`intakeStatus` exist on the type and are **always `undefined`** in this phase — nothing populates them, since neither `Product` nor the `Product`↔`Service` relationship currently declares an "intake required" concept. A future phase must decide whether that originates from `Product`, `Service`, or an explicit offering-to-intake relationship. Never duplicate actual questionnaire answers into an `OrderLine` — these three fields are a reference/status only.

### `/checkout` route — one route, three in-page states

`src/app/checkout/page.tsx` (server component, for `metadata`) renders `Header`, a heading, a client `CheckoutView`, and `Footer`. There is no `/checkout/review` or `/checkout/confirmation` — `CheckoutView` manages `"details" | "review" | "submitted"` as in-page state, exactly like the architecture report recommended. If the cart is empty (and the flow isn't already in the `"submitted"` state — a successful submission's confirmation must keep showing even if the cart is later emptied), `CheckoutView` shows an intentional empty state linking back to `/store` instead of building any `OrderDraft`.

- **`details`** — `CheckoutCustomerForm`: native `<fieldset>`/`<label>`/`<input>`/`<textarea>`, `required`/`type="email"` for native browser validation as a first pass, plus `validateOrderDraft()` as the authoritative second pass. Validation errors render in a `role="alert" aria-live="assertive"` block.
- **`review`** — `OrderReview` (see below) plus "Back" (returns to `details`, keeping entered values) and "Submit Order Request."
- **`submitted`** — the honest confirmation screen (see below).

### `OrderReview` — presentational only, frozen data only

A dedicated component, not a reuse of `CartItemRow` (which carries live quantity/remove controls wired to `useCart()` — the wrong affordances for a historical review). It renders exclusively from `OrderDraft.lines`: title, package/options/add-ons, quantity, line subtotal (estimate-labeled when applicable), deposit context, and the order-level pricing summary — no live `Product` lookup anywhere in it.

### Submission — `POST /api/orders` is primary, mailto is now a secondary fallback

`CheckoutView`'s "review" step submits by calling `POST /api/orders` (a real `fetch`, not a link) with the raw cart configuration — see "Server order creation" under "Backend + database foundation" below for what happens server-side. A persistent, always-visible secondary link — *"Prefer email? You can send this request to [email] instead"* — reuses the same `mailto:` mechanism `ContactForm.tsx` and Phase 10's checkout relied on (`buildOrderRequestMailto()` in `orders.ts`, built from the client-side preview draft), so a customer always has a way to reach the business even if the API call fails. On a failed submission, the error message explicitly points at this fallback.

### Honest wording — no false confirmation, ever

The `"submitted"` step is now only ever reached after a real `201` response from `POST /api/orders` — it displays the actual returned order number ("Order BRCP-#### received"), tells the customer what email they'll be contacted at, and still states plainly **"No payment has been collected yet."** A `"needs-review"` order additionally notes that starting-price items mean final pricing isn't confirmed yet. On failure, the error is shown inline, the cart/session are left untouched, and the mailto fallback is offered — never a fake success screen.

### Persistence — `sessionStorage`, deliberately different from the cart's `localStorage`

`CheckoutView` persists `{ version, step, customer, notes, clientRequestId }` to `sessionStorage` under a versioned envelope (`CHECKOUT_SCHEMA_VERSION`), using the exact same hydration-safe pattern as `CartProvider`: state starts at its deterministic default on both the server render and the first client render, a post-mount effect restores whatever was persisted (minting a fresh `clientRequestId` via `crypto.randomUUID()` if none existed yet), and a "skip the first persist run" ref guard (the same fix `CartProvider` uses) stops that restore from being immediately overwritten by stale initial state. Any shape mismatch, version mismatch, or parse failure discards the whole persisted state — logged via `console.warn`, never thrown. This is **session-scoped on purpose**, unlike the cart: an in-progress checkout shouldn't silently reappear days later the way the cart is meant to. `clientRequestId` is the one thing that deliberately *does* need to survive a mid-checkout refresh — see "Idempotency" below for why. Once a real order is confirmed, the persisted draft is cleared entirely rather than kept around (there's no need to restore a "submitted" screen after a refresh — the order itself is now durably stored server-side, refresh or not). `checkoutReducer`, `isValidPersistedState`, and `loadPersistedCheckout` are exported from `CheckoutView.tsx` for the same reason `CartProvider`'s equivalents are — direct testability independent of React.

### Cart clearing — now happens, but only after confirmed server success

The cart is **not** cleared when `/checkout` opens, not on validation failure, not while a submission is in flight, and not if `POST /api/orders` fails — only once the endpoint returns a real `201` with an order id/number does `CheckoutView` call `clearCart()` and wipe the persisted checkout draft. A failed or abandoned checkout always leaves the cart exactly as the customer left it.

### What's still not built

The following still require work beyond this phase and are not faked anywhere in this codebase: customer accounts/login, secure staff-only order-status transitions (moving an order to `"confirmed"` is not exposed anywhere), transactional email delivery (the mailto fallback is a real email client handoff, not a delivery guarantee), payment sessions, and admin retrieval/search of orders. See "Backend + database foundation" below for what *is* now real.

### Future admin panel (documentation only)

`OrderDraft`/`OrderLine` are shaped so a future **Big Red Admin** can eventually show, without a data-model migration: order lines, customer, per-line intake status, order status, deposit/payment context, and (once built) attached files and internal notes — mirroring exactly how `Product`/`Service` were shaped for the same future admin in earlier phases. Planned path: `Order → Customer → Order Lines → Intake → Files → Internal Notes → Payment → Status`. No admin UI exists yet.

### Big Red Brain / Obsidian boundary (documentation only — no implementation)

The long-term system separates:

- **Public** — website, services, store, cart, checkout (everything documented in this file so far).
- **Private operational data** — customers, orders, intake, payments, internal notes, once any of that is built.
- **Big Red Brain** — a future AI layer that may eventually access only explicitly authorized data.
- **Obsidian Vault** — a separate, private business-knowledge source.

Customer email, phone, address, order history, payment information, and private intake responses must never automatically become public-facing AI context. No AI or Obsidian integration exists in this codebase yet.

## Backend + database foundation

**Status: a real, durable order-persistence backend, live-tested against a real Neon database. Still no payments, no customer accounts/login, no admin dashboard UI, no file uploads, no transactional email service, no intake forms, no rate limiting.** This is the server-side layer beneath the checkout UI documented above — nothing in this section changes what a shopper sees; it documents what actually happens once "Submit Order Request" is clicked.

### 1. Database stack

- **Neon PostgreSQL** — a pooled connection (`DATABASE_URL`) for normal application queries and a direct/unpooled connection (`DATABASE_URL_UNPOOLED`) for migration tooling.
- **Drizzle ORM**, specifically `drizzle-orm/neon-serverless` (not `neon-http`) — the plain HTTP driver can't run multi-statement transactions, and atomic Customer+Order+OrderLine creation requires a real `db.transaction()`. `neon-serverless` is WebSocket-backed (via the `ws` package) and supports it.
- **Zod** at the `POST /api/orders` request boundary — the first phase in this codebase with a real, untrusted external payload, which is the specific justification for introducing a validation library only now rather than earlier.
- **A Next.js Route Handler**, `src/app/api/orders/route.ts` (not a Server Action) — chosen so order creation has a normal HTTP request/response shape or general reuse.

### 2. Database tables

Defined in `src/db/schema.ts`, applied via versioned Drizzle migrations (see below):

- **`products`** — mirrors the `Product` type field-for-field (JSONB for `pricing`/`seo`/`media`/`options`/`packages`/`addOns`, deliberately not normalized into separate tables — see "Authoritative product source" below for why this table currently holds **zero rows**).
- **`customers`** — `firstName`, `lastName`, a normalized `email`, optional `phone`/`company`, timestamps. No password/auth fields — no accounts exist.
- **`orders`** — permanent UUID `id`, human-readable `orderNumber`, `status`, FK to `customerId`, frozen `pricingSummary` JSONB, `notes`, `source` (`"checkout"` today), and `clientRequestId` (the idempotency key).
- **`order_lines`** — FK to `orderId`, a `productId` reference field (see below), and a full frozen snapshot of everything needed to render the line without ever consulting live product data (see "Order snapshots").

### 3. Order numbering

Human-readable order numbers are generated by a real Postgres sequence, `order_number_seq` (`src/db/schema.ts`), starting at `1001` and incrementing by 1 — **never `SELECT MAX()+1`**, which is unsafe under concurrent inserts. `src/server/create-order.ts` calls `nextval('order_number_seq')` inside the same transaction that creates the order row and formats the result as `BRCP-####` (e.g. `BRCP-1001`). The order's permanent internal identity remains the UUID `id` — `orderNumber` is a separate, renameable-in-spirit, human-facing field, exactly mirroring the `id`/`slug` split already established for `Product`.

### 4. Customer behavior

`create-order.ts` matches customers by **normalized** email (`.trim().toLowerCase()`) — enforced at the database level too via the `customers_email_unique` index, so `"Jane.Doe@Example.com"` and `"  JANE.DOE@EXAMPLE.COM  "` resolve to the same row. A repeat order from a known email links to the **existing** customer rather than creating a duplicate. Matching is **non-destructive**: an existing customer's populated `phone`/`company` is never overwritten by a new order's values — only currently-blank fields get filled in. No passwords, no login, no accounts.

### 5. Order snapshots — historical data is frozen, never recalculated

Every `order_lines` row freezes, at creation time, everything needed to render that line correctly forever, independent of the live `Product`:

`productId` (reference only, see below), `productSlug`, `productTitle`, `productType`, `purchaseMode`, `quantity`, `selectedPackage`, `selectedOptions`, `selectedAddOns`, `unitPrice`, `depositAmount`, and `lineSubtotal`.

**A historical order must never be recalculated from live `Product` data.** If a product's price, title, or configuration changes — or the product is deleted entirely — every existing order line that referenced it keeps showing exactly what was true when the order was placed. This was directly verified during live testing (see "Live database testing" below): changing a test product's price after an order existed left that order's `unit_price` untouched, while a *new* order for the same product correctly picked up the new price.

**`order_lines.product_id` — nullable reference, no active foreign-key constraint.** This column stores the `Product.id` value at order time, but it is a plain nullable `text` column with **no enforced foreign key to `products.id`**, unlike `order_lines.order_id → orders.id` and `orders.customer_id → customers.id`, which are real, enforced FKs. This is intentional, not an oversight: the live, authoritative product catalog is still `src/data/products.ts` (see "Authoritative product source" below), and the database's `products` table currently holds zero rows. A hard FK from `order_lines.product_id` to `products.id` would reject *every* real order, since no product it referenced would ever have a matching row to point to. A real FK may be added in a later phase once the storefront/catalog actually migrates to database-backed products — at that point `product_id` would gain a `references()` constraint via a new migration (see `drizzle/0001_amazing_hammerhead.sql`, which is what dropped this FK after it briefly existed in the first-generated migration). Until then, order history remains fully, independently renderable from the frozen snapshot fields alone — `product_id` is reference-only, never a rendering dependency.

### 6. Idempotency

`clientRequestId` (a UUID, generated once client-side via `crypto.randomUUID()` and persisted across a checkout session — see "Persistence" above) is the idempotency key. `orders.client_request_id` carries a real, persisted unique database constraint (`orders_client_request_id_unique`) — that constraint, not application logic, is the final authority. `create-order.ts` also does an optimistic pre-transaction lookup by `clientRequestId` as a fast path (avoids an unnecessary transaction on a plain retry), and separately catches a `23505` unique-violation on the insert itself and recovers by returning the order that already exists, in case two requests race past the fast-path check simultaneously. A duplicate submission — whether a page refresh, a double-click, or a retried request after a flaky network response — returns the **existing** order rather than creating a second one. This same pattern (a persisted, client-generated idempotency key with a database-level unique constraint as the source of truth) is exactly what a future payment/webhook integration will need, and nothing about this design is payment-specific — it's ready to be reused as-is.

**Honesty about what was actually tested:** live testing exercised the **sequential** duplicate-submission path (the fast-path lookup) and confirmed it works correctly end-to-end. The **true simultaneous-race branch** — two requests hitting the unique-constraint catch inside the transaction at nearly the same instant — was not directly exercised, since that requires genuine concurrency that sequential test requests can't produce. The code path exists and was written specifically to handle that case, but it has not been live-verified under real concurrency.

### 7. Server order creation — the full flow

```
Cart
  → Checkout (review step)
  → POST /api/orders
  → Zod request validation (src/app/api/orders/route.ts)
  → per line: resolve the authoritative product (src/server/product-source.ts)
  → verify status is "published" and the product is cart-eligible
  → verify the requested package/options/add-ons are real (src/server/verify-configuration.ts)
  → recompute price server-side via buildCartItem() — the client never sends a price
  → createOrder() (src/server/create-order.ts) — one database transaction:
      → find-or-create customer (normalized email)
      → generate the order number (order_number_seq)
      → insert the order row
      → insert the frozen order_lines rows
  → response: { id, orderNumber, status }
  → CheckoutView clears the cart and the checkout session draft
    ONLY after this response confirms success
```

The client never computes or transmits a price at any point in this flow — only raw configuration (`productId`, `quantity`, `selectedPackageSlug`, `selectedOptionValues`, `selectedAddOnSlugs`). Every dollar amount that ends up on the order was computed server-side, in this request, from the authoritative product definition.

### 8. Authoritative product source

**Current:** `src/data/products.ts` (the same TypeScript catalog the public `/store` reads from).
**Future:** the database `products` table, once a real content/admin workflow exists to populate it.

`src/server/product-source.ts` exports one function, `getAuthoritativeProduct(productId)`, and is the **only** place order creation resolves "what is this product, really." It is deliberately `async` even though today's implementation (`getProductById()` from `products.ts`) is synchronous, specifically so the swap to a database query later requires changing this one function's body — not any of its callers, and not the request/response shape of `/api/orders`. Order creation must always go through this boundary, never reach directly into `products.ts` or the database `products` table itself. The database `products` table exists (see "Database tables" above) but is not populated with any real catalog data in this phase — it is schema-only, prepared for that future migration.

### 9. Transactions

Customer creation, order creation, and every order line are created **atomically**, inside a single `db.transaction()` in `src/server/create-order.ts`. A partial order — for example, an order row that exists with no corresponding order lines because a line insert failed — must never be left behind, and the code is structured so that's true even if the failure happens after the customer and order rows were already written within that same transaction.

This was **live-verified**, not just asserted: a temporary, env-gated fault was injected between the order insert and the order-line insert, a real request was sent through the running server against the real Neon database, and the resulting failure was confirmed to leave **zero** trace — no customer row, no order row — for that attempt. The fault injection was removed immediately after the test; it does not exist in the shipped code.

### 10. Database migrations

Versioned, generated via `npx drizzle-kit generate` (or `npm run db:generate`), applied via `npm run db:migrate`:

- **`drizzle/0000_lame_gwen_stacy.sql`** — the initial schema: `order_number_seq`, `products`, `customers`, `orders`, `order_lines`, all three unique indexes, and (at the time) a foreign key from `order_lines.product_id` to `products.id`.
- **`drizzle/0001_amazing_hammerhead.sql`** — a single-statement follow-up migration, `ALTER TABLE "order_lines" DROP CONSTRAINT "order_lines_product_id_products_id_fk"`, applied to fix the issue described under "Order snapshots" above (that FK would have rejected every real order). Generated and reviewed *before* being applied — the diff was confirmed to touch nothing else.

**Already-applied migrations are never rewritten.** Any future schema change — including a real FK on `order_lines.product_id` once the catalog migrates to the database — must be a new migration file generated by `drizzle-kit generate` against the current schema, never a hand-edit of `0000_lame_gwen_stacy.sql` or `0001_amazing_hammerhead.sql`.

### 11. Environment variables

Two variable **names** (values are never committed anywhere):

- `DATABASE_URL` — the pooled Neon connection string, used by the application at request time (`src/db/index.ts`).
- `DATABASE_URL_UNPOOLED` — the direct/unpooled connection string, used by Drizzle Kit for migrations (`drizzle.config.ts`) — migration tooling behaves better against a direct connection than through a pooler.

`.env.example` documents both variable names only, with an explanatory comment — never real values. Local development: copy `.env.example` to `.env.local` and fill in real values from your own Neon project dashboard; `.env.local` is gitignored (`.gitignore`'s `.env*` rule, with an explicit `!.env.example` exception so the example file itself can still be committed — see the note under "Drizzle env loading" below for why that exception was necessary). **Never** prefix a database credential with `NEXT_PUBLIC_` — that prefix ships the value into the client bundle. Production/deployment: set both variables as real Vercel environment variables (or your hosting provider's equivalent) — never hardcoded, never committed.

### 12. Drizzle env loading

Drizzle Kit (`db:generate`/`db:migrate`/`db:studio`) runs as a standalone CLI, outside Next's own request pipeline, so it does not automatically pick up `.env.local` the way `next dev`/`next build`/`next start` do. `drizzle.config.ts` fixes this by calling `loadEnvConfig()` from **`@next/env`** before reading `process.env` — this is Next.js's own internal env-loading package, already present as a transitive dependency of `next` itself, so **no new package was installed** to make this work (deliberately not `dotenv`, to avoid adding an explicit new dependency for something Next already ships).

### 13. Security

- All database access is **server-only** — `src/db/index.ts` and every module under `src/server/` import the `server-only` package, which throws a build error if any of that code is ever imported into a client bundle.
- The client **never** sends a price; the server recomputes every dollar amount from the authoritative product on every request (see "Server order creation" above) — client-submitted totals are never trusted, because there aren't any.
- Every line is independently verified: real product, `published` status, cart-eligible purchase mode, real package/option/add-on selections. A stale or no-longer-available product (e.g. since reverted to draft, or never published) is rejected with a safe 409, never silently accepted.
- Database failures return a **safe, generic** client-facing error (`"We couldn't create your order. Please try again."`) — never a raw driver error or stack trace. This was specifically live-verified: `createOrder()`'s try/catch originally didn't wrap `getDb()` itself, so a missing `DATABASE_URL` produced an uncaught exception and an empty response body; this was caught during testing and fixed by widening the try block to cover the whole function body.
- Logging never includes a complete customer/order payload — failures log a `clientRequestId` and the error object only, never full PII.
- **Rate limiting is not implemented.** `POST /api/orders` should **not** be considered abuse-hardened for public production traffic until a real rate limiter is added in front of it — this is a known, documented gap, not an oversight.

### 14. Checkout integration

`POST /api/orders` is now the **primary** submission path from `/checkout` (see "Submission" under "Checkout + Order foundation" above). A successful order shows the real, durably-persisted `BRCP-####` number. The cart and the checkout session draft are cleared **only** after the server confirms success — never optimistically, never on a failed or in-flight request. The Phase 10 `mailto:` mechanism remains available as an always-visible **secondary** fallback, not the primary method.

### 15. Live database testing — what was genuinely verified

All of the following were tested against a **real** Neon database (not simulated, not assumed), using temporary throwaway test products and real requests through the running `/api/orders` endpoint, then fully cleaned up afterward:

- Migrations applied successfully (`0000_lame_gwen_stacy.sql`, then `0001_amazing_hammerhead.sql`).
- Every schema object confirmed present via `information_schema`/`pg_indexes` queries: the sequence, all four tables, all three unique indexes, and exactly the two intended foreign keys (`order_lines.order_id → orders.id` CASCADE, `orders.customer_id → customers.id`).
- Real customer row creation.
- Real order row creation.
- Real order-line row creation.
- Real `BRCP-####` sequence generation (`BRCP-1001` through `BRCP-1005` across the test run).
- **Sequential** idempotency: resubmitting the same `clientRequestId` returned the same order, with no duplicate row created.
- Customer deduplication by normalized email (differing case and whitespace resolved to one customer row).
- Frozen historical snapshots: a live product's price was changed after an order existed; the existing order line's stored price was unaffected, and a new order for the same product correctly picked up the new price.
- A `starting-price` order received `"needs-review"`.
- `fixed-price` and `deposit` orders received `"submitted"`.
- A draft (no longer published) product and an inquiry-mode (never cart-eligible) product were both correctly rejected with a 409, neither creating any order/customer row.
- Transaction rollback on a mid-transaction failure — verified with a temporary, env-gated fault injection, removed immediately after.
- All test data (5 orders, their cascaded order lines, 2 customers) was deleted afterward; every table was confirmed back at zero rows.

**Not tested:** true simultaneous-concurrency idempotency (the unique-constraint-catch race branch — see "Idempotency" above). This is an honest, documented gap, not a claim of completeness.

### 16. Future admin panel (documentation only)

`products`, `customers`, `orders`, and `order_lines` are shaped so a future **Big Red Admin** can eventually power, without a data-model migration: order listing/search/filtering, customer records and history, per-line intake status (once that concept exists — see `OrderLine.intakeRequired`/`intakeFormSlug`/`intakeStatus`, still always `undefined`), payment status (once a payment phase exists), and attached files/internal notes (schema not yet defined for these — will need new tables when built). No admin UI exists yet; this phase only built the data layer it will eventually read and write.

### 17. Big Red Brain / Obsidian boundary (documentation only — no implementation, unchanged from Phase 10)

The privacy boundary described under "Checkout + Order foundation" above applies without exception to everything this phase added: `customers`, `orders`, and `order_lines` are **private operational data**, exactly like the future intake/payment/internal-notes data that will join them. Nothing in this phase changes that boundary — it just means there is now a real database on the private side of it, not just a documented intention. Public-facing AI must never automatically receive customer, order, payment, or internal-note data; **Big Red Brain** remains a future, explicitly permission-controlled layer, and the **Obsidian Vault** remains a separate, private business-knowledge source. No AI or Obsidian integration exists in this codebase.

### 18. Future product/catalog migration

The public storefront (`/store`, `/store/[slug]`) remains entirely TypeScript-backed by `src/data/products.ts` — **this phase does not migrate it to database reads.** The database `products` table exists purely as groundwork (schema-only, zero rows) for a future phase that builds a real content/admin workflow. Order creation already goes through the swappable `getAuthoritativeProduct()` boundary (see "Authoritative product source" above) specifically so that future migration changes one function's implementation, not the storefront, the cart, or the order-creation flow.

## Rules for creating new components

- One component per homepage section, placed in `src/components/`.
- Pull all copy from `src/data/homepage.ts` (or a dedicated data file) — do not hardcode business content, labels, or links inside a component.
- Reuse `components/ui/Button`, `SectionHeading`, `ProjectCard`, `ServiceCard`, `ProductCard`, `Badge` for patterns that already exist; only add a new `ui/` primitive if a visual pattern repeats and isn't covered yet.
- If the component needs a page anchor, add it to `src/config/sections.ts` and reference `sectionAnchors` rather than hardcoding an `id`/`href` string.
- Preserve existing CSS class names when reusing a visual pattern — the stylesheet is class-driven, not component-scoped.

## Rules for updating existing components

- Don't rewrite a working section unless the task specifically calls for it. Small, targeted edits over rewrites.
- If a change is "update some text," it almost always belongs in a data/config file, not a JSX edit.
- Never introduce Tailwind, CSS Modules, or a CSS-in-JS library into this project — it's intentionally a single plain stylesheet.
- Don't add new npm dependencies unless the task explicitly requires one.

## Required before finishing any task

1. Run `npm run lint` and fix any errors.
2. Run `npm run build` and fix any errors.
3. Preserve mobile responsiveness — check that changes don't break the `@media(max-width:900px)` / `@media(max-width:560px)` rules in `globals.css`.
4. Preserve accessibility — keep `aria-label`s, alt text, and semantic elements (`nav`, `header`, `footer`, `label`) intact.
5. Don't change visible design, copy, or layout unless the task explicitly asks for it.
