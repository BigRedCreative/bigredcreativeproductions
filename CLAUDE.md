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
    navigation.ts        — header nav links + CTA (hrefs derived from config/sections.ts and products.ts).
                          The live Cart (N) indicator is NOT in this file — see "Cart navigation"

  config/
    site.ts     — business identity: name, legal name, url, email, location, social links
    theme.ts      — TypeScript mirror of the CSS design tokens in globals.css
    sections.ts     — homepage section order, anchor IDs, enabled/disabled flags
```

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

### Checkout boundary — explicitly not built

No `/checkout` route exists. `CartSummary` renders a visibly **disabled** "Continue to Checkout" button (`disabled`, `aria-disabled="true"`, styled at reduced opacity) with adjacent "Checkout coming soon" text — it does not navigate anywhere and does not pretend payment is available. This was a deliberate choice over creating an empty placeholder route, which could be bookmarked/crawled and look like a broken page.

### Future Order conversion (documented boundary, no types built)

```
CartState → Checkout (resolves/confirms any starting-price estimates, collects customer info)
         → OrderDraft (temporary, in-progress)
         → Payment
         → Order (final, frozen, DB-backed)
```

No `Order`/`OrderDraft`/`OrderLine` type exists yet, and none was needed for the cart architecture itself — `CartItem`'s snapshot shape is already order-ready by design. When a real Order system is built, it should freeze: customer, cart lines, product snapshots, configuration, final resolved prices, deposit/payment context, and line totals — and historical orders must never depend on the live `Product` record for their own accuracy, exactly like `CartItem` doesn't today.

### Big Red Brain / Obsidian boundary (documentation only — no implementation)

The long-term system separates:

- **Public Website / Store / Cart** — the public commerce interface (everything documented above).
- **Orders / Customers / Admin** — private operational data, once built.
- **Big Red Brain** — a future AI layer operating only over explicitly-permitted business knowledge.
- **Obsidian Vault** — a private business-knowledge source, never automatically public.

Customer, cart, and order information must never automatically become public-facing AI context. No AI or Obsidian integration exists in this codebase yet.

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
