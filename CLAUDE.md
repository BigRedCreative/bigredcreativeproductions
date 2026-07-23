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

  components/
    Header.tsx, Hero.tsx, Ticker.tsx, Manifesto.tsx, Statement.tsx,
    Services.tsx, Portfolio.tsx, Studio.tsx, Process.tsx, ContactForm.tsx, Footer.tsx
      — one component per homepage section; presentation + structure only
    ProjectHero.tsx, ProjectDetails.tsx, ProjectGallery.tsx, ProjectResults.tsx, ProjectNavigation.tsx
      — sections used only on /work/[slug] project detail pages
    PortfolioGrid.tsx
      — client component: renders the homepage project grid + the category filter row

  components/ui/
    Button.tsx, SectionHeading.tsx, ProjectCard.tsx, ServiceCard.tsx, Badge.tsx
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
    navigation.ts        — header nav links + CTA (hrefs derived from config/sections.ts)

  config/
    site.ts     — business identity: name, legal name, url, email, location, social links
    theme.ts      — TypeScript mirror of the CSS design tokens in globals.css
    sections.ts     — homepage section order, anchor IDs, enabled/disabled flags
```

## Where to edit things

- **Homepage text** (headlines, taglines, body copy, button labels, contact form labels) → `src/data/homepage.ts`
- **Services list** → `src/data/services.ts`
- **Portfolio projects** → `src/data/projects.ts`
- **Catalog products** (not yet public — see "Catalog system") → `src/data/products.ts`
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

**Status: data/validation foundation only. No store UI, no `/store` route, no cart, no checkout, no payments, no admin dashboard exist yet.** This section documents the data model built in the commerce-foundation phase so later phases (store routes, then cart/checkout, then an admin) can build on it without another data migration.

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
- **`ProductAddOn`** (`slug`, `label`, optional `description`/`price`) models optional extras (e.g. an extra revision round, rush production).
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

`src/data/products.validate.ts` exports `validateProducts()`, called at module load in `products.ts` exactly like `validateProjects()`/`validateServices()` — a bad entry fails `npm run dev`/`npm run build` immediately, listing every problem at once, not just the first. It checks (non-exhaustive): unique `id`, unique `slug`, valid `productType`/`status`/`category`/`pricing.mode`, non-empty `title`/`summary`, required `seo.title`/`seo.description`, the pricing-consistency rules above, non-negative integer-cent values on every money field (`priceDelta` is the one exception — it may be negative, but must still be a whole integer), image/video `alt` required, video `poster` required, local-only media paths scoped under that product's own `/images/products/[slug]/` folder, no duplicate media `src` within a product, no duplicate `options[].key`/`packages[].slug`/`addOns[].slug` within a product, and — if set — `relatedServiceSlug` must match a real `Service.slug`. An empty `products` array is valid; the catalog is allowed to start empty.

`PRODUCT_TYPES`/`PRODUCT_STATUSES`/`PRODUCT_CATEGORIES`/`PURCHASE_MODES` are passed into `validateProducts()` as parameters rather than imported by `products.validate.ts`, mirroring `projects.validate.ts`'s pattern — this avoids a circular import, since `products.ts` calls `validateProducts()` with its own data at module load. `services` **is** imported directly into `products.validate.ts` (safe: `services.ts` never imports from `products.ts`, so there's no cycle) to check `relatedServiceSlug` against real service slugs.

### Service ↔ Product relationship

`Service` (the informational, inquiry-oriented marketing page at `/services/[slug]`) and `Product` (a purchasable catalog entry) are **fully separate systems** — this phase makes zero changes to `services.ts` or any service page component. A `Product` with `productType: "service"` may optionally set `relatedServiceSlug` to point at a real `Service.slug` (e.g. a future "Packaging Design — Standard" product would set `relatedServiceSlug: "packaging"`). This is a one-directional reference — `Service` has no knowledge of which products link to it — resolved on demand via `getProductsByServiceSlug(slug)` in `products.ts`. Rendering that relationship anywhere on an actual service page (e.g. a "View packages" link) is future work, not part of this phase; existing service pages remain exactly as they were in Phase 6.

### Planned public route (not built yet)

```
/store            — catalog index (planned; not built this phase)
/store/[slug]      — individual product detail page (planned; not built this phase)
```

When approved, `/store/[slug]/page.tsx` should mirror `work/[slug]/page.tsx` and `services/[slug]/page.tsx` exactly: `generateStaticParams` from `getPublishedProducts()` (or an equivalent published-only getter), `generateMetadata` from `product.seo`, `notFound()` + `dynamicParams = false` so anything outside the static param list 404s instead of rendering on demand. `productHref(slug)` in `products.ts` already returns `/store/${slug}` so route code has a single source of truth to import once it exists.

### How to add a product (once real content exists)

1. Copy `physicalProductExample` or `serviceProductExample` from `src/data/product.template.ts` into the `products` array in `products.ts` and fill in real fields only. Leave `status: "draft"` until it's actually ready.
2. Never invent pricing, deposits, turnaround guarantees, or client facts — leave those fields `undefined` until confirmed, exactly like the portfolio and services rules.
3. If real media exists, drop it in `public/images/products/[slug]/` and reference it with `productImagePath(slug, filename)`; otherwise leave `media: []` rather than using a stock/placeholder photo (the hand-built branded-placeholder pattern documented under "Portfolio system" is the one sanctioned exception, if it's ever needed here).
4. Run `npm run build` — the validator will fail loudly and list every problem if something's wrong with the data.
5. Setting `status: "published"` will do nothing publicly visible until a `/store/[slug]` route is built and approved in a later phase — it only changes what a future public route/listing would include.

### Future database/admin migration notes

This model is deliberately shaped so it can move from flat TypeScript arrays into persistent database records managed through a future **Big Red Admin** without a redesign:

- Every entity uses explicit, structured fields (no nested functions/closures, no `Map`/`Set` in the data itself) — a straightforward shape for JSON serialization or a relational table.
- `id` is the stable primary-key candidate; `slug` is a renameable, independently-unique secondary field — exactly the split a real database and a real admin "change slug without changing ID" feature need.
- `PRODUCT_CATEGORIES` is centralized in one place specifically so it can become an admin-managed table (or a seeded lookup table) instead of a hardcoded list.
- `media` being a flat ordered array (not hero/gallery) is specifically meant to survive a future "upload media / drag to reorder" admin UI without a shape change.
- Planned future admin capabilities this model is already compatible with: Add Product, Edit Product, Duplicate Product, change `slug` without changing `id`, Upload images/video, Reorder media, Set pricing, Set deposits, Manage packages, Manage options, Manage add-ons, Feature/unfeature, Publish, Archive. None of that UI exists yet — only the data shape it will eventually operate on.
- Future cart/checkout integration points: `Product.pricing.mode` is what a future cart would branch on (inquiry → contact form, fixed-price/full-payment → direct checkout, deposit → partial payment flow, starting-price → likely routes to inquiry/quote first). None of that logic exists yet.

## Rules for creating new components

- One component per homepage section, placed in `src/components/`.
- Pull all copy from `src/data/homepage.ts` (or a dedicated data file) — do not hardcode business content, labels, or links inside a component.
- Reuse `components/ui/Button`, `SectionHeading`, `ProjectCard`, `ServiceCard`, `Badge` for patterns that already exist; only add a new `ui/` primitive if a visual pattern repeats and isn't covered yet.
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
