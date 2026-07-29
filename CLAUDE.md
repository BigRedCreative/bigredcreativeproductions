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
    store/page.tsx       — the /store catalog index, ISR — see "Product admin + database-backed catalog"
    store/[slug]/page.tsx — product detail pages, ISR + on-demand revalidation — see "Product admin + database-backed catalog"
    cart/page.tsx        — the /cart route (see "Cart (transactional foundation)")
    checkout/page.tsx      — the /checkout route (see "Checkout + Order foundation")
    api/orders/route.ts     — POST /api/orders Route Handler, verifies against Neon — see "Product admin + database-backed catalog"
    api/auth/[...nextauth]/route.ts — Auth.js's own GET/POST handlers, re-exported from src/auth.ts
    admin/               — the protected admin system, see "Admin foundation", "Product admin + database-backed
                          catalog", and "Website content admin" below

  components/
    Header.tsx, Hero.tsx, Ticker.tsx, Manifesto.tsx, Statement.tsx,
    Services.tsx, Portfolio.tsx, Studio.tsx, Process.tsx, ContactForm.tsx, Footer.tsx
      — one component per homepage section; presentation + structure only. As of Phase 14,
        Header/Footer/Hero/ContactForm are async server components reading their content from
        Neon (site_settings/navigation_items/homepage_content/contact_content, via
        src/server/queries/site-content.ts) instead of importing static data/config constants
        directly — see "Website content admin". Hero.tsx accepts an optional `content` override
        prop, reused by the admin draft preview, the same pattern ProductHero already established.
        As of Phase 16, Header/Footer also accept an optional `brandVariant` prop
        ("published" | "draft") controlling which brand_settings row their rendered logo
        resolves against — see "Brand Controls".
    BrandTokens.tsx
      — Phase 16: a server component wrapping page content in a styled `<div>` that sets the
        resolved brand colors as real CSS custom properties, plus explicitly redeclares its own
        `background`/`color` (necessary since `body`'s own background/color in globals.css is
        fixed at an ANCESTOR element this wrapper can't reach upward). Imported per public
        top-level page (never the root layout — see "Brand Controls" for why) and by the one
        admin brand-preview page with `variant="draft"`.
    ProjectHero.tsx, ProjectDetails.tsx, ProjectGallery.tsx, ProjectResults.tsx, ProjectNavigation.tsx
      — sections used only on /work/[slug] project detail pages
    ServiceHero.tsx, ServiceCapabilities.tsx, ServiceDeliverables.tsx, ServiceProcess.tsx, ServiceCTA.tsx
      — sections used only on /services/[slug] service detail pages
    ProductHero.tsx, ProductMedia.tsx, ProductDetails.tsx, ProductPricing.tsx,
    ProductOptions.tsx, ProductPackages.tsx, ProductAddOns.tsx, ProductCTA.tsx, ProductPurchasePanel.tsx
      — sections used on /store/[slug] product detail pages (ProductHero/ProductMedia
        also reused, unmodified, by the admin draft preview — see "Product admin +
        database-backed catalog"); optional ones only rendered by the page when the
        product actually has that data. ProductOptions/ProductPackages/ProductAddOns
        accept optional controlled-selection props so ProductPurchasePanel can reuse
        them interactively — see "Cart"
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

  components/admin/
    AdminSidebar.tsx, AdminHeader.tsx, AdminPagination.tsx, StatusBadge.tsx,
    OrdersFilterBar.tsx, CustomersFilterBar.tsx, ProductsFilterBar.tsx
      — the admin shell + read-only list/filter UI, see "Admin foundation"
    ProductForm.tsx
      — the create/edit product form (client component — every <select> is a
        controlled component; see "Product admin + database-backed catalog" →
        "A controlled-select bug, and why every admin <select> is controlled now")
    ProductOptionsEditor.tsx, ProductPackagesEditor.tsx, ProductAddOnsEditor.tsx, ProductMediaEditor.tsx
      — repeatable array-field sub-editors used inside ProductForm, each serializing its
        local state into one hidden JSON form field on submit. As of Phase 15,
        ProductMediaEditor.tsx also renders a "Choose from Media Library" picker alongside its
        original manual-path input — see "Media Library" → "Product integration"
    SiteSettingsForm.tsx, NavigationForm.tsx, ContactContentForm.tsx, HeroContentForm.tsx, PublishHeroButton.tsx,
    SocialLinksEditor.tsx
      — Phase 14 website-content forms, see "Website content admin". SiteSettingsForm is shared by
        both the General/Branding and SEO pages (one underlying site_settings row, two field
        subsets — see that section for why). NavigationForm/SocialLinksEditor are repeatable-list
        editors following the exact same add/remove/serialize-to-hidden-field pattern as
        ProductOptionsEditor. HeroContentForm edits the DRAFT homepage_content row only;
        PublishHeroButton is a separate, fieldless action that copies draft → published.
    MediaUploadForm.tsx, MediaFilterBar.tsx, MediaEditForm.tsx, MediaStatusToggle.tsx, MediaReplaceForm.tsx
      — the Phase 15 Media Library admin UI, see "Media Library". MediaFilterBar mirrors
        ProductsFilterBar's native-GET-form pattern exactly. MediaStatusToggle is a single
        fieldless button bound to either "archive" or "unarchive" depending on current status.
        MediaReplaceForm uploads a new file under the SAME permanent asset id.
    BrandForm.tsx, ColorField.tsx, LogoPickerField.tsx, PublishBrandButton.tsx
      — the Phase 16 Brand Controls admin UI, see "Brand Controls". ColorField pairs a native
        <input type="color"> with a readable hex text field, kept in sync — the admin never
        types or sees a CSS variable name. LogoPickerField is a single-slot "Choose from Media
        Library" picker, the same toggle-panel/grid pattern ProductMediaEditor established,
        sized down to one selection. BrandForm computes live, non-blocking WCAG contrast
        warnings client-side (src/data/contrast.ts, no new dependency). PublishBrandButton
        mirrors PublishHeroButton's fieldless draft-to-published copy pattern exactly.
    StringListEditor.tsx, ProcessStepsEditor.tsx, ServiceHeroField.tsx, ServiceGalleryEditor.tsx,
    ServiceForm.tsx, PublishServiceButton.tsx, ServiceArchiveToggle.tsx, ServiceMoveButtons.tsx
      — the Phase 17 Services Admin UI, see "Services + Portfolio Admin". StringListEditor is a
        generic repeatable-string editor (capabilities/deliverables); ProcessStepsEditor the
        title+description-pair equivalent; both plain add/remove/move-up-down, no drag-and-drop.
        ServiceHeroField/ServiceGalleryEditor mirror ProductMediaEditor's dual manual-path/Media-
        Library-picker pattern, sized for ServiceImage's simpler {src, alt, mediaAssetId?} shape
        (no type/poster/caption). PublishServiceButton/ServiceArchiveToggle mirror
        PublishBrandButton/MediaStatusToggle's exact fieldless-button patterns; ServiceMoveButtons
        is the up/down sortOrder-swap control.
    ResultsEditor.tsx, CreditsEditor.tsx, PortfolioHeroField.tsx, PortfolioGalleryEditor.tsx,
    PortfolioExternalLinkField.tsx, PortfolioForm.tsx, PublishPortfolioButton.tsx,
    PortfolioArchiveToggle.tsx, PortfolioMoveButtons.tsx
      — the Phase 17 Portfolio Admin UI, see "Services + Portfolio Admin". A direct mirror of the
        Services Admin UI: ResultsEditor/CreditsEditor are ProcessStepsEditor's exact
        add/remove/move-up-down pattern applied to {label, value}/{role, name} pairs;
        PortfolioHeroField/PortfolioGalleryEditor mirror ServiceHeroField/ServiceGalleryEditor for
        ProjectImage's shape, with PortfolioGalleryEditor additionally exposing a lightBackground
        checkbox per item (a real, rendered field ProjectGallery.tsx uses that ServiceImage has no
        equivalent of); PortfolioExternalLinkField is a single optional {label, url} pair, not
        repeatable. StringListEditor.tsx (already generic) is reused unmodified for
        Project.services — no Portfolio-specific version needed.

  data/
    homepage.ts    — homepage copy (hero, ticker, manifesto, statement, studio, process, contact
                       form labels, footer wording). As of Phase 14, the `hero` and `contact`
                       exports are the FALLBACK for homepage_content/contact_content, not the
                       live source — see "Website content admin". ticker/manifesto/statement/
                       studio/process/footer.backToTopLabel are still the live, direct source
                       (not migrated to the database this phase).
    services.ts      — the services list (title/description/tags)
    services.validate.ts — runtime validation for service data, run automatically on import
    projects.ts        — the full portfolio data model + helpers (see "Portfolio system" below)
    projects.validate.ts — runtime validation for project data, run automatically on import
    project.template.ts    — copy-paste starter template for a new project (not used by the app)
    media.ts         — shared Media type (image/video) for the catalog system. As of Phase 15,
                          each Media item may optionally carry a `mediaAssetId` linking it to a
                          Media Library asset — see "Media Library" for the full model
    media-path.ts       — isLocalMediaPath(): the local-vs-external-URL check, extracted in Phase 14 out
                          of products.validate.ts so website-content validation reuses the exact same
                          rule instead of a second copy
    products.ts        — Product TYPES, constants, and pure helpers only (id/slug helpers, slugify()).
                          No product data and no query functions live here as of Phase 13 — see
                          "Product admin + database-backed catalog" for why, and src/server/queries/catalog.ts
                          for the real, database-backed reads
    products.validate.ts — collectProductValidationErrors(): the one product validator, reused by both
                          admin mutations (runtime) and, historically, build-time array checks
    money.ts          — centralized Money (integer-cent) formatting, see "Store (storefront UI)"
    contrast.ts         — contrastRatio(): pure WCAG relative-luminance contrast math, no
                          dependency — used client-side by BrandForm for non-blocking warnings,
                          see "Brand Controls"
    store.ts            — copy for the /store index page only (heading, intro, empty state)
    cart.ts            — CartItem/CartOptionSelection/CartPackageSelection/CartAddOnSelection
                          types, isCartEligible(), buildCartItem(), getConfigurationSignature()
    cart-pricing.ts       — centralized cart total calculations, see "Cart (transactional foundation)"
    orders.ts           — OrderDraft/OrderLine types, buildOrderDraft(), cartItemToOrderLine(),
                          the mailto order-request builders — see "Checkout + Order foundation"
    orders.validate.ts     — RUNTIME validateOrderDraft() (returns errors, does not throw —
                          different in kind from the build-time *.validate.ts files above)
    navigation.ts        — the FALLBACK for navigation_items as of Phase 14 (was the live source through
                          Phase 13) — hrefs derived from config/sections.ts and products.ts. The live
                          Cart (N) indicator is NOT in this file — see "Cart navigation"

  config/
    site.ts     — business identity: name, legal name, url, email, location, social links.
                  As of Phase 14, this is the FALLBACK for site_settings, not the live source
                  — see "Website content admin"
    theme.ts      — TypeScript mirror of the CSS design tokens in globals.css
    sections.ts     — homepage section order, anchor IDs, enabled/disabled flags

  db/
    schema.ts   — Drizzle table/sequence definitions (admin_users, audit_log, products, customers,
                   orders, order_lines, order_number_seq, site_settings, navigation_items,
                   homepage_content, contact_content, media_assets, brand_settings, services,
                   service_versions, portfolio_projects, portfolio_project_versions) — see
                   "Backend + database foundation", "Product admin + database-backed catalog",
                   "Website content admin", "Media Library", "Brand Controls", and
                   "Services + Portfolio Admin"
    index.ts      — getDb(): lazy, server-only Neon/Drizzle client, throws only when actually called

  server/
    product-source.ts     — getAuthoritativeProduct(): resolves from Neon (src/server/queries/catalog.ts)
    verify-configuration.ts — strict server-side package/option/add-on verification for API requests
    create-order.ts       — the atomic Customer+Order+OrderLine transaction, idempotency handling
    require-admin-user.ts   — requireAdminUser(): the one real admin authorization boundary
    is-uuid.ts             — shared route-param validation, used before any uuid-typed DB lookup
    is-unique-violation.ts   — shared Postgres 23505 detection, used by create-order.ts and mutate-product.ts
    dollars-to-cents.ts      — the one place an admin-entered dollar string becomes authoritative integer cents
    build-product-form.ts    — parses admin product-form FormData into a candidate Product (shape only,
                          not business validation — see "Product admin + database-backed catalog")
    mutate-product.ts       — createProductAction()/updateProductAction(): the only place a product row
                          is written; each independently calls requireAdminUser(), writes a transactional
                          audit_log entry, and revalidates the affected storefront routes
    audit-log.ts           — recordAuditEvent(): the one place any admin write records who/what/when
    validate-website-content.ts — Phase 14's shared href/email/canonical-URL/media-path validators, reused
                          across every website-content mutation — see "Website content admin"
    build-website-content-form.ts — parses admin website-content FormData (site settings, navigation,
                          contact, hero) into candidate shapes; shape parsing only, mirrors
                          build-product-form.ts's split from business validation
    mutate-website-content.ts — updateSiteSettingsAction()/updateNavigationAction()/
                          updateContactContentAction()/saveHeroDraftAction()/publishHeroAction(): the
                          only place site_settings/navigation_items/homepage_content/contact_content
                          rows are written — see "Website content admin"
    queries/orders.ts        — server-only, read-only admin order queries (list/detail/status counts)
    queries/customers.ts       — server-only, read-only admin customer queries (list/detail/count)
    queries/catalog.ts        — server-only, database-backed product reads: getPublishedProducts(),
                          getProductBySlug(), getProductById(), listProducts() (admin), etc. — the
                          ONE place anything in the app reads a Product from Neon
    validate-media-upload.ts   — validateImageUpload(): byte-sniffs real PNG/JPEG/WebP magic bytes,
                          cross-checks against image-size's own format detection, enforces the
                          8 MB cap on actual bytes read — see "Media Library"
    media-storage.ts        — buildStorageKey()/uploadImageBlob()/deleteBlob(): the ONE place this
                          app talks to Vercel Blob (OIDC-authenticated); storage keys are always
                          server-generated UUIDs, never the client's filename
    mutate-media.ts        — uploadMediaAction()/updateMediaAssetAction()/setMediaAssetStatusAction()/
                          replaceMediaAssetAction(): the only place a media_assets row is written
                          — see "Media Library"
    queries/site-content.ts     — server-only, database-backed website-content reads: getSiteSettings(),
                          getNavigation(), getPublishedHeroContent(), getContactContent(), plus
                          admin-only raw-row variants — the ONE place anything in the app reads
                          Phase 14 website content from Neon; every public read is field-level-
                          fallback-safe against the matching src/config or src/data constant
    queries/media.ts        — server-only, database-backed media reads: listMediaAssets() (admin,
                          paginated/filtered/searched), getMediaAssetById(), getMediaAssetsByIds()
                          (batch, used by catalog.ts's resolution step), getActiveImageAssetsForPicker(),
                          findProductsReferencingMediaAsset()/findServicesReferencingMediaAsset()/
                          findProjectsReferencingMediaAsset() (the query-time usage scans, the
                          latter two Phase 17 additions checking both draft and published version
                          rows) — the ONE place anything in the app reads a media_assets row — see
                          "Media Library" and "Services + Portfolio Admin"
    validate-brand-color.ts    — validateAndNormalizeColor(): accepts only #RGB/#RRGGBB, normalizes to
                          uppercase #RRGGBB, rejects everything else — see "Brand Controls"
    mutate-brand.ts        — saveBrandDraftAction()/publishBrandAction(): the only place a
                          brand_settings row is written — see "Brand Controls"
    queries/services.ts       — server-only, database-backed Service reads. Public:
                          getPublishedServices(), getServiceBySlug(), getFeaturedServices() (entity
                          status='published' JOINed to version_type='published' only). Admin:
                          listServicesForAdmin() (flat, every status, both version summaries),
                          getServiceEntityForAdmin() (full draft + published Service objects, no
                          fallback merge) — the ONE place anything in the app reads a Service from
                          Neon — see "Services + Portfolio Admin"
    queries/portfolio.ts       — server-only, database-backed Project reads. Public:
                          getPublishedProjects(), getProjectBySlug(), getFeaturedProjects(),
                          getAdjacentProjects() (prev/next, same wrap-around semantics as the old
                          array-backed version). Admin: listPortfolioForAdmin() (flat, every status,
                          both version summaries), getPortfolioEntityForAdmin() (full draft +
                          published Project objects, no fallback merge) — the ONE place anything in
                          the app reads a Project from Neon — see "Services + Portfolio Admin"
    build-service-form.ts     — parses admin Service-form FormData into a candidate version-row
                          content shape; shape parsing only, mirrors build-product-form.ts's split
                          from business validation — see "Services + Portfolio Admin"
    mutate-service.ts       — createServiceAction()/saveServiceDraftAction()/publishServiceAction()/
                          setServiceArchivedAction()/moveServiceAction(): the only place a
                          services/service_versions row is written — see "Services + Portfolio Admin"
    build-portfolio-form.ts    — parses admin Portfolio-form FormData into a candidate version-row
                          content shape; direct mirror of build-service-form.ts's shape-only split
                          from business validation — see "Services + Portfolio Admin"
    mutate-portfolio.ts      — createPortfolioAction()/savePortfolioDraftAction()/
                          publishPortfolioAction()/setPortfolioArchivedAction()/movePortfolioAction():
                          the only place a portfolio_projects/portfolio_project_versions row is
                          written — direct mirror of mutate-service.ts's exact architecture,
                          including the externalLink.url check via validateHref() (reused from
                          validate-website-content.ts rather than duplicated) — see
                          "Services + Portfolio Admin"
    queries/brand.ts        — server-only, database-backed brand reads: getPublishedBrandTokens(),
                          getDraftBrandTokens() (both field-level-fallback-safe against
                          globals.css's own :root defaults, and both resolve logo Media Library
                          selections against site_settings' existing paths as fallback),
                          getBrandSettingsRowForAdmin() — the ONE place anything in the app reads
                          brand_settings from Neon — see "Brand Controls"

  auth.ts                — Auth.js v5 config (Google OAuth, JWT sessions, no adapter tables)
  proxy.ts                — Next.js 16's proxy convention (not middleware.ts) — admin fast-path redirect only

next.config.ts (project root) — didn't exist before Phase 15; now configures images.remotePatterns
(the exact hostname for this project's Vercel Blob store, not a wildcard) and
experimental.serverActions.bodySizeLimit (see "Media Library" → "Upload transport limit vs.
application limit").
```

drizzle.config.ts (project root) and drizzle/ (generated, versioned migration SQL) are Drizzle Kit's
CLI-only files — see "Backend + database foundation" → "Database migrations".

## Where to edit things

- **Homepage hero content** (badges, headline, tagline, supporting copy, button) — edited through **Admin → Website → Homepage** (`/admin/website/homepage`, draft/preview/publish), never by editing source code — see "Website content admin". `src/data/homepage.ts`'s `hero` export is now the fallback only.
- **Site name, legal name, footer tagline, contact email/phone, location, logos, social links** — edited through **Admin → Website → General & Branding** (`/admin/website/general`) — see "Website content admin". `src/config/site.ts` is now the fallback only.
- **Nav links / header CTA** — edited through **Admin → Website → Navigation** (`/admin/website/navigation`) — see "Website content admin". `src/data/navigation.ts` is now the fallback only.
- **Contact section copy** (kicker, heading, description, submit button label) — edited through **Admin → Website → Contact** (`/admin/website/contact`) — see "Website content admin". The form's own field labels/placeholders/service options are still code-owned in `src/data/homepage.ts`.
- **SEO/meta title, meta description, canonical URL, social share description** — edited through **Admin → Website → SEO & Sharing** (`/admin/website/seo`) — see "Website content admin".
- **Other homepage text** (ticker, manifesto, statement, studio, process copy) → still `src/data/homepage.ts` directly — not migrated to the database this phase.
- **Services** — created/edited/published/archived through **Admin → Services** (`/admin/services`, draft/preview/publish workflow), never by editing source code — see "Services + Portfolio Admin". `src/data/services.ts`'s `services` array is now frozen seed/reference data only, no longer read by any public or admin runtime path.
- **Portfolio projects** — created/edited/published/archived through **Admin → Portfolio** (`/admin/portfolio`, draft/preview/publish workflow), never by editing source code — see "Services + Portfolio Admin". `src/data/projects.ts`'s `projects` array is now frozen seed/reference data only, no longer read by any public or admin runtime path.
- **Catalog products** — created/edited/published/archived through **Admin → Products → New Product** (`/admin/products`), never by editing source code — see "Product admin + database-backed catalog"
- **Product images/artwork** — uploaded and selected through **Admin → Media** (`/admin/media`) and the product edit form's "Choose from Media Library" picker — see "Media Library". Manually-typed local paths under `public/images/products/[slug]/` still work exactly as before; the two approaches coexist.
- **Brand colors, buttons, and logos** — edited through **Admin → Website → Branding** (`/admin/website/branding`, draft/preview/publish), never by editing `globals.css` directly — see "Brand Controls". `globals.css`'s `:root` values are now the fallback only.
- **Store index page copy** (heading, intro, empty state) → `src/data/store.ts`
- **Colors, spacing, shadows, borders, durations** → `src/app/globals.css` `:root` custom properties (mirrored for reference in `src/config/theme.ts`, but globals.css is the source of truth the browser actually uses)
- **Section order / anchor IDs / enabling-disabling a section** → `src/config/sections.ts`, then keep `src/app/page.tsx`'s JSX order in sync

Most remaining content edits should only touch `src/data/*.ts` or `src/config/*.ts` — not the component files. Business identity, navigation, homepage hero, and contact-section copy have moved to the database as of Phase 14; the matching `src/data`/`src/config` files remain only as the offline fallback.

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

**Status: Neon is the authoritative catalog, with a real admin UI to create/edit/publish/archive products — see "Product admin + database-backed catalog" below for the full architecture.** This section documents the `Product` **type** — schema, media model, status lifecycle, pricing rules — which hasn't changed shape since it was first introduced; only where the data actually *lives* has changed.

### Purpose and scope

The catalog (`Product` type, defined in `src/data/products.ts`) is a separate system from the portfolio (`projects.ts`) and services (`services.ts`) — it supports **purchasable offerings**: both physical products (stickers, labels, printed materials, merchandise) and purchasable creative-service packages. `src/data/products.ts` itself holds only types, constants, and pure helpers as of Phase 13 — no product data and no query functions live there anymore. See "Product admin + database-backed catalog" for where real product data actually lives and how it's read.

### id vs. slug — permanent identity vs. editable URL

Every `Product` has two identifiers with different jobs:

- **`id`** — the permanent internal identity. Never derive it from the title or slug, never changes once assigned, never reused once retired. Order/order-line history references `product.id`, not `product.slug` (see "Order snapshots" under "Backend + database foundation").
- **`slug`** — the editable public URL identity (`/store/[slug]`). A product can be renamed/re-slugged later without breaking anything that already referenced it by `id`.

This split exists specifically so a rename doesn't silently break historical order references. `id` is auto-generated (`prod_` + a random UUID) the moment a product is created through `/admin/products/new` — never chosen or typed by hand, never derived from the title/slug. Both `id` and `slug` are enforced unique — `id` by the database primary key, `slug` by a real unique database constraint (`products_slug_unique`), with a clean, specific "slug already in use" error surfaced back to the admin form rather than a raw database error.

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

`src/data/products.validate.ts` exports `collectProductValidationErrors()` — the **one** product validator, used everywhere a product needs checking. It checks (non-exhaustive): unique `id`/`slug` (within the array passed in — see below), valid `productType`/`status`/`category`/`pricing.mode`, non-empty `title`/`summary`, required `seo.title`/`seo.description`, the pricing-consistency rules above, non-negative integer-cent values on every money field (`priceDelta` is the one exception — it may be negative, but must still be a whole integer), image/video `alt` required, video `poster` required, local-only media paths scoped under that product's own `/images/products/[slug]/` folder, no duplicate media `src` within a product, no duplicate `options[].key`/`packages[].slug`/`addOns[].slug` within a product, valid `addOns[].chargeType`, and — if set — `relatedServiceSlug` must match a real `Service.slug`.

**Where this runs now:** every admin create/edit action (`src/server/mutate-product.ts`) calls `collectProductValidationErrors([candidate], {...})` as the authoritative server-side check before any database write — errors come back as a string array rendered inline in the admin form, the same "collect everything, not just the first" philosophy the build-time validators originally established. This is **not a second, competing validator** — it's the exact same function, just called at a different time (runtime, on an admin-submitted candidate) instead of the original build-time/module-load pattern `validateProjects()`/`validateServices()` still use for their own still-array-backed data. Cross-entry uniqueness (duplicate slug across the *whole* catalog, not just the one candidate) is enforced separately, at the database level, via the real `products_slug_unique` constraint.

`PRODUCT_TYPES`/`PRODUCT_STATUSES`/`PRODUCT_CATEGORIES`/`PURCHASE_MODES` are passed into `collectProductValidationErrors()` as parameters rather than imported by `products.validate.ts`, avoiding a circular import back to `products.ts`. `services` **is** imported directly into `products.validate.ts` (safe: `services.ts` never imports from `products.ts`, so there's no cycle) to check `relatedServiceSlug` against real service slugs.

### Service ↔ Product relationship

`Service` (the informational, inquiry-oriented marketing page at `/services/[slug]`) and `Product` (a purchasable catalog entry) are **fully separate systems** — this phase makes zero changes to `services.ts` or any service page component. A `Product` with `productType: "service"` may optionally set `relatedServiceSlug` to point at a real `Service.slug` (e.g. a future "Packaging Design — Standard" product would set `relatedServiceSlug: "packaging"`). This is a one-directional reference — `Service` has no knowledge of which products link to it — resolved on demand via `getProductsByServiceSlug(slug)` in `products.ts`. Rendering that relationship anywhere on an actual service page (e.g. a "View packages" link) is future work, not part of this phase; existing service pages remain exactly as they were in Phase 6.

### Public route

```
/store            — catalog index, see "Store (storefront UI)" below
/store/[slug]      — individual product detail page
```

`/store/[slug]/page.tsx` reads from `src/server/queries/catalog.ts` (Neon-backed) rather than an in-memory array — `generateStaticParams` is now `async`, and `dynamicParams` is `true` (not `false`): a product published since the last build still renders correctly on its first request rather than 404ing, because it isn't limited to only the slugs known at build time. See "Product admin + database-backed catalog" for the full ISR/revalidation writeup. `productHref(slug)` in `products.ts` returns `/store/${slug}`; `STORE_INDEX_HREF` (also in `products.ts`) is the single source of truth for the `/store` index path, used by both the primary nav and the route itself.

### How to add a product

**Admin → Products → New Product** (`/admin/products/new`) — never by editing source code. See "Product admin + database-backed catalog" for the full admin workflow (sections, validation, publishing rules, media). The old "copy a template object into a TypeScript array" workflow no longer exists — `src/data/product.template.ts` was deleted once the admin creation flow was proven end-to-end with a real product.

### Database/admin migration — now complete

The notes that used to live here (why the model was "shaped to move to a database later") described a *plan*; that plan is now executed — see "Product admin + database-backed catalog" below for the real, current architecture: Neon as the authoritative catalog, admin-driven CRUD, publish/archive lifecycle, transactional audit logging, and ISR-based storefront revalidation.

## Store (storefront UI)

**Status: public browsing UI backed by the real Neon catalog, with a working cart/checkout/order path and a full admin behind it.** This section documents the storefront UI layer specifically — see "Product admin + database-backed catalog" for how the data underneath it is now managed and kept fresh.

### Route behavior

- **`/store`** (`src/app/store/page.tsx`) — `async`, reads `getPublishedProducts()` from Neon (`src/server/queries/catalog.ts`), heading + intro from `src/data/store.ts`, then `StoreGrid` rendering **every published product** (not a featured-only subset — this is the full browse page, unlike the homepage's capped teaser sections). ISR with `revalidate = 3600` as a time-based fallback; the real freshness mechanism is `revalidatePath("/store")` called directly from every admin product mutation.
- **`/store/[slug]`** (`src/app/store/[slug]/page.tsx`) — `generateStaticParams` (now `async`) pre-renders currently-published slugs from Neon at build time; `dynamicParams = true` (not `false`) means a product published *since* the last build still renders correctly on its first request rather than 404ing. Draft and archived products are excluded from `generateStaticParams` and from `getProductBySlug()`'s `published`-only query, so their slugs 404 either way — there is no other gate to remember. Same `revalidate = 3600` fallback, same on-demand `revalidatePath()` from admin mutations.

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

- **`products`** — mirrors the `Product` type field-for-field (JSONB for `pricing`/`seo`/`media`/`options`/`packages`/`addOns`, deliberately not normalized into separate tables). **As of Phase 13, this table is the live, authoritative catalog** — see "Product admin + database-backed catalog" for the full read/write architecture built on top of it.
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

**`order_lines.product_id` — nullable reference, foreign-key constraint restored in Phase 13.** This column stores the `Product.id` value at order time. It was deliberately built with **no** enforced foreign key in Phase 11 (`drizzle/0001_amazing_hammerhead.sql` dropped one that briefly existed in the first-generated migration), because the database `products` table was permanently empty while `src/data/products.ts` stayed authoritative — a hard FK would have rejected every real order. That reason no longer applies: now that Neon is the authoritative catalog and `products` holds real rows, `drizzle/0003_fluffy_synch.sql` restored the FK, `order_lines.product_id → products.id`, **`ON DELETE SET NULL`** (not `CASCADE`, not the default `NO ACTION`) — deleting a product can never delete or block deletion of its order history; every field needed to render a historical line is already frozen directly on the row regardless of whether `product_id` still resolves to anything. In practice this is close to moot day-to-day, since Phase 13's admin deliberately has **no hard-delete product action** — archive is the only removal state, and archiving doesn't touch `order_lines` at all.

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

**As of Phase 13: the Neon `products` table**, via `src/server/queries/catalog.ts`'s `getProductById()`. This was originally `src/data/products.ts`'s in-memory array; the swap is complete — see "Product admin + database-backed catalog" for the full architecture.

`src/server/product-source.ts` still exports one function, `getAuthoritativeProduct(productId)`, and is still the **only** place order creation resolves "what is this product, really." It was deliberately `async` from the start even when the original implementation (`getProductById()` from the in-memory array) was synchronous, specifically so this swap would only ever require changing this one function's body — not any of its callers, and not the request/response shape of `/api/orders`. That design paid off exactly as intended: the Phase 13 cutover touched this file's internals and nothing else in the order-verification pipeline.

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

### 18. Product/catalog migration — completed in Phase 13

This section originally documented why the public storefront stayed TypeScript-backed while the database `products` table sat empty as groundwork. That migration is now done — see "Product admin + database-backed catalog" below for the complete, current architecture: Neon as the sole authoritative catalog, the public storefront and order verification both reading from it, and a real admin UI as the only supported way to create/edit/publish/archive a product.

## Admin foundation

**Status: a real, working admin system with real Google-account authentication, database-backed authorization, and read-only operational views — live-tested end to end, including a real sign-in.** Still no order-status editing, no audit log, no product/service/portfolio/media/website content admin, no Big Red Brain, no Obsidian integration. This is the first phase to add anything under `/admin`.

### Auth.js v5 + Google OAuth

Authentication is **Auth.js v5** (`next-auth@beta`, currently `5.0.0-beta.x` — Auth.js v5 has been in long-running beta and is still installed via the `beta` npm dist-tag, not `latest`, which is still v4), configured in `src/auth.ts`:

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
});
```

- **Google OAuth only** — no Credentials provider, no password of any kind is ever collected or stored by this codebase. `src/app/api/auth/[...nextauth]/route.ts` re-exports `{ GET, POST } = handlers` — this is the OAuth callback endpoint Google redirects back to (`/api/auth/callback/google`), verified directly against Auth.js's own docs rather than assumed.
- **JWT session strategy — no database adapter.** This is the default when no adapter is configured, and it's a deliberate choice: it avoids adding Auth.js's own `users`/`accounts`/`sessions`/`verification_tokens` tables entirely. The session cookie only ever carries basic Google identity (email, name) — **never a role or an `active` flag** (see "Authorization" below for why that matters).

### `admin_users` — authorization, not identity

A single new table (`src/db/schema.ts`), deliberately separate from anything Auth.js owns:

```ts
adminUsers {
  id: uuid, pk, default random
  email: text, unique, not null       // normalized: trim + lowercase
  displayName: text, not null
  role: text, not null                 // "owner" | "admin"
  active: boolean, not null, default true
  createdAt: timestamptz, not null, default now()
  updatedAt: timestamptz, not null, default now()
}
```

No `authProviderUserId` column — matching is by normalized email against the Google-verified identity, which is sufficient since Google OAuth only ever returns a verified mailbox. No password column, here or anywhere else in this schema. `role: "owner" | "admin"` currently grants **identical** permissions — the two-value union exists now purely so `staff`/`client` roles can be added later without a migration, not because anything branches on it yet.

### `requireAdminUser()` — the one real authorization boundary

`src/server/require-admin-user.ts`, `server-only`:

1. Gets the Auth.js session via `auth()`.
2. Requires an authenticated identity (`session.user.email`) — redirects to `/admin/login` if none.
3. Normalizes the email (`.trim().toLowerCase()`).
4. Queries `admin_users` by that email — **fresh, from the database, on every single call.**
5. Requires an existing row, `active: true`, and a role in `["owner", "admin"]` — redirects to `/admin/access-denied` if any of that fails.
6. Returns only `{ id, email, displayName, role }` — never the full row, never anything beyond what protected code needs.

**Role/active are never trusted from the session or JWT** — deactivating an `admin_users` row takes effect on that person's very next request, regardless of how long their Google session/JWT remains cryptographically valid. This was the specific reason JWT-only sessions (no adapter) were chosen: the practical security property people actually want from "database sessions" is achieved here at the authorization layer instead, with one table instead of four.

`requireAdminUser()` is called in `src/app/admin/(protected)/layout.tsx`, which means it runs on **every** request to `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/customers`, `/admin/customers/[id]` — a layout's server component body executes for every nested route. **This does not cover Server Actions or Route Handlers** — confirmed directly against Next.js's own `proxy.js` documentation, which states plainly: *"Server Functions are not separate routes in this chain... Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone."* Every future admin Server Action or Route Handler — starting with whatever eventually implements order-status editing — **must call `requireAdminUser()` itself**, independently, even though a page-level check already ran for whatever rendered the form/button that triggers it. This rule is written down now, in Phase 12, specifically because Phase 12 itself has no mutating actions yet to enforce it as an example — the next phase that adds one must not skip this.

### `src/proxy.ts` — not `middleware.ts`

Next.js 16 **renamed** the `middleware.ts` file convention to `proxy.ts` (exported function renamed `middleware` → `proxy`, or a default export) — confirmed directly against Next's own `v16.2.11` docs during this phase, not assumed from older examples. This matters more than a cosmetic rename: **a leftover `middleware.ts` is silently ignored at build time, with no error and no warning** — auth/redirect logic would simply stop running and protected routes would become reachable, with nothing in the build output flagging it. `src/proxy.ts` is the correctly-named file for this Next.js version; the build output's route summary confirms it's actually active (`ƒ Proxy (Middleware)` appears in `npm run build`'s output).

`src/proxy.ts` wraps `auth()` from `src/auth.ts` and does exactly one thing: if a request to `/admin/:path*` (matcher covers `/admin` and everything under it, `/admin/login` explicitly exempted to avoid a redirect loop) has no session at all, redirect to `/admin/login`. **This is a fast-path convenience redirect only, not the real security boundary** — it never touches the database, and per the point above, it doesn't cover Server Actions/Route Handlers at all. `requireAdminUser()` is the actual authorization decision.

### Protected admin routes

```
/admin/login             — public, no auth check — "Sign in with Google"
/admin/access-denied      — reachable by an authenticated-but-unauthorized session — no auth check itself
/admin                   — dashboard (protected)
/admin/orders             — orders list (protected)
/admin/orders/[id]          — order detail (protected)
/admin/customers            — customers list (protected)
/admin/customers/[id]         — customer detail (protected)
/admin/products             — products list (protected) — see "Product admin + database-backed catalog"
/admin/products/new           — create product (protected)
/admin/products/[id]           — product detail (protected)
/admin/products/[id]/edit        — edit product (protected)
/admin/products/[id]/preview       — admin-authenticated draft preview (protected)
/admin/website              — website content hub (protected) — see "Website content admin"
/admin/website/general         — General & Branding (protected)
/admin/website/homepage        — Homepage hero draft editor (protected)
/admin/website/homepage/preview    — admin-authenticated draft preview (protected)
/admin/website/navigation        — header navigation editor (protected)
/admin/website/contact         — contact section editor (protected)
/admin/website/seo            — SEO & sharing (protected)
/admin/website/branding        — Brand Controls: colors, buttons, logos — draft/preview/publish (protected) — see "Brand Controls"
/admin/website/branding/preview    — admin-authenticated draft preview (protected)
/admin/media               — media library grid: upload, search, filter, pagination (protected) — see "Media Library"
/admin/media/[id]             — media detail: preview, alt/caption edit, archive/unarchive, replace (protected)
/admin/services              — list: every entity, any status (protected) — see "Services + Portfolio Admin"
/admin/services/new           — create a service (draft only) (protected)
/admin/services/[id]           — detail: currently-live vs. private-draft, publish, archive/unarchive (protected)
/admin/services/[id]/edit        — edit the DRAFT version (protected)
/admin/services/[id]/preview       — admin-authenticated draft preview (protected)
/admin/portfolio              — list: every entity, any status (protected) — see "Services + Portfolio Admin"
/admin/portfolio/new           — create a project (draft only) (protected)
/admin/portfolio/[id]           — detail: currently-live vs. private-draft, publish, archive/unarchive (protected)
/admin/portfolio/[id]/edit        — edit the DRAFT version (protected)
/admin/portfolio/[id]/preview       — admin-authenticated draft preview (protected)
```

Route-group structure: `src/app/admin/layout.tsx` (top-level — imports the admin stylesheet, sets `robots: { index: false, follow: false }`, does **no** auth check) wraps everything, including `login/` and `access-denied/`, which sit as siblings outside the `(protected)` route group. `src/app/admin/(protected)/layout.tsx` is what actually calls `requireAdminUser()` and renders the sidebar/header shell — only routes inside that group are protected. Route groups (`(protected)`) don't appear in the URL, so `/admin/(protected)/orders/page.tsx` serves `/admin/orders` exactly as shown above.

**Reserved, not built:** `/admin/settings`, `/admin/brain` — listed in `src/config/admin-nav.ts`'s `adminNavItems` with `available: false`, rendered in the sidebar as plain disabled text with a "Coming later" badge, **never a real `<a>`/`<Link>`, never a working href.** Add a route here only when it actually exists. `/admin/products` (Phase 13), `/admin/website` (Phase 14), `/admin/media` (Phase 15), and `/admin/services`/`/admin/portfolio` (Phase 17) are all `available: true` now.

**No public navigation ever links to `/admin`** — reachable only by its direct URL, and excluded from search indexing via the layout's `robots` metadata.

### Admin shell

`src/components/admin/AdminSidebar.tsx` (the one client component in the shell — needed only for `usePathname()`-driven active-link highlighting) + `AdminHeader.tsx` (server component — current admin's `displayName`/`email`, a native `<form>` sign-out button posting to an inline `signOut()` server action, no client JS). Styled by `src/app/admin/admin.css` — a **separate stylesheet from `globals.css`**, imported only by the top-level admin layout so admin-only class names (`.admin-*`) can never collide with public-site ones. It reuses `globals.css`'s `:root` design tokens directly (same red/black/cream palette, same heavy borders, same uppercase/letter-spaced labels) but in a deliberately utilitarian dashboard register — no rotated CTAs, no split-word marketing typography. Responsive at the same `900px`/`560px` breakpoints already used sitewide (sidebar collapses to a horizontal scroll bar on narrow viewports).

### Admin dashboard

`/admin` shows real Neon counts only — total orders, submitted, needs-review, confirmed, customers — via `getOrderStatusCounts()`/`getCustomerCount()`. An empty database correctly shows zeros everywhere; nothing is seeded to make the page look populated, and no revenue metric exists (there's no payment data anywhere in this schema to compute one from).

### Orders and customers — read-only, server-only queries

`src/server/queries/orders.ts` and `customers.ts` — `server-only`, plain Drizzle, never imported by a client component, and **contain no `insert`/`update`/`delete` calls anywhere** (verified by direct grep, not just by intent). All admin data reads go through these two modules; nothing else queries `orders`/`customers`/`order_lines` directly.

- **`listOrders({ page, status, search })`** — joins `orders` + `customers` (for the list row), optional exact-match `status` filter (validated against the real `ORDER_STATUSES` union — an unrecognized value is silently ignored, never passed through to SQL), optional `ILIKE` search across order number and customer name/email, `ORDER BY created_at DESC`, `LIMIT 25 OFFSET`.
- **`getOrderById(id)`** — validates `id` looks like a real UUID *before* ever touching the database (see "Malformed IDs" below), then uses Drizzle's relational query API (`with: { customer: true, lines: true }`) to fetch the order, its customer, and its **frozen `order_lines` rows** in one call. **This function never joins against, or falls back to, `products` or `src/data/products.ts`** — every field the order detail page renders (title, quantity, package, options, add-ons, unit price, deposit, line subtotal, intake fields) comes directly off the frozen snapshot, exactly matching the same principle already established in "Backend + database foundation."
- **`listCustomers({ page, search })`** — `ILIKE` search across name/email/company, plus a `LEFT JOIN` + `GROUP BY` to compute each customer's order count and most recent order date in the same query.
- **`getCustomerById(id)`** — same UUID pre-validation, then the customer plus their full order list (via the `customers.orders` relation), sorted newest-first.

### Pagination and search

**Offset-based (`LIMIT`/`OFFSET`), URL-driven** — `/admin/orders?page=2&status=submitted&q=john`, `/admin/customers?page=2&q=acme`. Fixed at **25 rows per page**. No cursor/keyset pagination, no data-grid dependency — a plain server-rendered `<table>` plus `AdminPagination` (`Prev`/`Next` `<Link>`s that preserve the current filters). Search is plain **Postgres `ILIKE`**, not full-text search — adequate at this business's realistic scale; a `tsvector` upgrade is a natural future step if search ever gets slow, not something built preemptively.

The filter/search bar itself needs **no client JavaScript at all** — `OrdersFilterBar`/`CustomersFilterBar` are plain server components rendering a native `<form method="GET">`; submitting a GET form naturally encodes its inputs into the URL's query string, which is exactly the shape the page already reads from. This is a stricter version of the "native form, no client JS" pattern already used by `CheckoutCustomerForm`.

### Malformed or nonexistent admin IDs

`src/server/is-uuid.ts` exports `isValidUuid()` — a plain regex check. A `[id]` route param that isn't a well-formed UUID sent straight into a `uuid`-typed Postgres column comparison throws a raw driver error (`22P02`, invalid input syntax), not a clean "no rows found" result. Both `getOrderById()` and `getCustomerById()` check the shape first and return `null` immediately for anything malformed, exactly like a genuinely nonexistent (but well-formed) id — the page then calls `notFound()`. A garbage `/admin/orders/not-a-real-id` URL and a syntactically valid but nonexistent UUID both produce the same safe 404, never a raw database error.

### Order status — read-only in Phase 12, deliberately

The order detail page displays status (`StatusBadge`) but has **no editing control of any kind** — no dropdown, no form, no server action. This was an explicit decision, not an oversight: order-status changes are the first *operational write* the admin system would perform, and **an audit log (who changed what, when) is required before any admin action starts changing operational records** — that log doesn't exist yet. When status editing does ship, it must: call `requireAdminUser()` independently (see above), validate against a fixed, explicit transition table (never arbitrary status-to-status jumps), bump `updatedAt`, and be logged.

### First-owner bootstrap

There is no admin UI to create an `admin_users` row (correctly out of scope for Phase 12), and **the first owner is never auto-created from whichever Google account happens to sign in first** — that would let anyone with a Google account claim ownership. The one existing row was inserted via a single, manual, one-off SQL statement run directly against Neon (the same `node -e`/small-script pattern used for Phase 11's live verification), after confirming the exact real email with the site owner and showing the exact non-secret row (`email`, `displayName`, `role: "owner"`, `active: true`) for explicit approval before insertion. **No seed script exists, and no email is hardcoded anywhere in source** — the only place that email lives is the `admin_users` row itself. Adding a second admin later follows the same manual process until a real "invite an admin" UI exists.

### Environment variables

Three new variable **names** (values never committed):

- `AUTH_SECRET` — Auth.js's session signing/encryption secret.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from a Google Cloud OAuth 2.0 Client (Web application type), auto-inferred by Auth.js from this exact naming convention (`AUTH_{PROVIDER}_{ID|SECRET}`).

All three added to `.env.example` as names only. **A note on generating `AUTH_SECRET` safely:** `npx auth secret` (suggested by Auth.js's own docs) resolved, in this environment, to an unrelated package that printed a `BETTER_AUTH_SECRET`-named suggestion instead of Auth.js's own convention — a real mismatch, not a hypothetical one. Rather than use that output, the secret actually in use was generated with `node -e "require('fs').appendFileSync('.env.local', '\nAUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64') + '\n')"`, which writes a cryptographically random value directly into `.env.local` **without ever printing it** to any terminal output. `openssl rand -base64 32` is an equally good alternative if available. Real values live only in `.env.local` (gitignored) locally, and would go into Vercel's Environment Variables for deployment — same pattern as `DATABASE_URL`/`DATABASE_URL_UNPOOLED`.

### Security summary

- Every database module — `src/db/index.ts`, everything under `src/server/` — imports `server-only`.
- Authorization is a server-side database check on every protected request, never a client-side hide/show, never trusted from a JWT claim.
- No public route imports `src/server/queries/*`, `src/db/schema`, or `require-admin-user` — verified directly (no matches outside `src/app/admin`).
- `/api/orders` still only ever returns `{ id, orderNumber, status }` — no customer/order PII is exposed through any public route, admin or otherwise.
- Database failures still return safe, generic errors — nothing new in this phase changes that Phase 11 guarantee.
- **Audit logging is required before any operational admin write action ships** — this is the load-bearing reason order-status editing stayed out of Phase 12, and applies to every future admin mutation, not just that one.
- Rate limiting on `/admin/login` remains undone, same documented gap as `/api/orders` in Phase 11 — lower urgency here since a Google-authenticated admin surface has no password to brute-force, but not yet "abuse-hardened."

### Future admin expansion

`admin_users`, plus the existing `products`/`customers`/`orders`/`order_lines` tables, are shaped to eventually power — without a redesign — the reserved sidebar sections: **Products, Website, Portfolio, Services, Media, Settings**, each its own future admin surface once a real content workflow exists (see "Future product/catalog migration" under "Backend + database foundation" for the product-specific version of this). **Big Red Brain** and **Obsidian/Knowledge** stay exactly where the Phase 10/11 privacy boundary already put them: private operational data (`admin_users`, `customers`, `orders`, `order_lines`, and anything future intake/payment/notes tables add) must never automatically become public-facing or AI-accessible context. Big Red Brain remains a future, explicitly permission-controlled layer; the Obsidian Vault remains a separate, private business-knowledge source. Nothing in Phase 12 changes that boundary — it just means there's now a real, working front door (Google-authenticated, database-authorized) standing in front of it.

## Product admin + database-backed catalog

**Status: Neon is the sole authoritative product catalog, with a full create/edit/publish/archive admin workflow, live-tested end to end against a real product** (created, edited, the status/productType persistence bug found and fixed, media corrected, and published — see below). Still no hard delete, no media upload/library, no bulk actions. This is the phase that finally executes the "future database/admin migration" plan documented under "Catalog system" and "Backend + database foundation" above.

### Neon is the catalog — `src/data/products.ts` is types/helpers only

`src/data/products.ts` now holds **only** the `Product` type, its constants (`PRODUCT_CATEGORIES`, `PRODUCT_TYPES`, `PRODUCT_STATUSES`, `PURCHASE_MODES`, `ADD_ON_CHARGE_TYPES`), and pure helpers (`productImagePath()`, `productHref()`, `STORE_INDEX_HREF`, `isPublishedProduct()`, `slugify()`) — no product data, no query functions. `src/server/queries/catalog.ts` (`server-only`) is the one place anything reads a `Product` from Neon: `getPublishedProducts()`, `getProductBySlug()`, `getProductById()` (full catalog regardless of status — used by both admin and order verification), `getFeaturedProducts()`, `getProductsByServiceSlug()` (all mirroring the old array-backed functions' names/behavior so callers needed only an import-path change), plus the admin-only, paginated/filtered `listProducts()`. A small `mapProductRow()` narrows Drizzle's widened `string` columns (`productType`/`status`/`category` are plain `text`, not `.$type<T>()`-annotated) back to their real union types, and normalizes Postgres `null` → `Product`'s "absent means `undefined`" convention for optional fields.

**`src/data/product.template.ts` has been deleted.** It existed to support the old "copy this object into the array" workflow — with a real, proven admin UI, it no longer applies, and the file was removed only after a real product had been created, edited, and published through `/admin/products` successfully.

### Admin routes

```
/admin/products              — list: search, status filter, category filter, pagination
/admin/products/new           — create form
/admin/products/[id]           — read-only detail view
/admin/products/[id]/edit        — edit form (same ProductForm component as create)
/admin/products/[id]/preview       — admin-authenticated draft preview
```

All inside the existing `(protected)` route group — `requireAdminUser()` coverage via the layout is automatic for every page above. `src/config/admin-nav.ts`'s "Products" entry is now `available: true`.

### Permanent ID vs. editable slug — enforced, not just documented

A product's `id` (`prod_` + `crypto.randomUUID()`) is generated once at creation and never touched again by any edit — `updateProductAction(id, ...)` always operates on the id passed via the route (`/admin/products/[id]/edit`), never a value read from the form. The edit form's slug field is fully editable and, on save, only ever changes the `slug` column — this was directly exercised in the live regression harness (a slug rename left `id` provably unchanged) and in the real acceptance test (the product's slug changed from an initial placeholder to `custom-graphic-design` across edits while `id` stayed `prod_1f897ba0-...` throughout).

### Orders/products query and mutation split

Mirrors the read/write separation already established for orders/customers, now extended to products:

- **Reads:** `src/server/queries/catalog.ts` — `server-only`, zero `insert`/`update`/`delete` calls, never imported by a client component.
- **Writes:** `src/server/mutate-product.ts` — `"use server"`, the only place a `products` row is created or updated. `createProductAction()` and `updateProductAction()` **each independently call `requireAdminUser()`** as their first line — not relying on the protected layout, per the rule already written down in "Admin foundation": Server Actions aren't covered by a page-level check.
- **Form parsing:** `src/server/build-product-form.ts` — the one untrusted-input boundary, turning raw admin `FormData` into a candidate `Product` (shape/type parsing only — dollars→cents via `src/server/dollars-to-cents.ts`, JSON-array fields parsed with try/catch). It does **not** decide whether the candidate is valid.
- **Validation:** the exact same `collectProductValidationErrors()` documented under "Catalog system" — reused verbatim, never duplicated. `mutate-product.ts` calls it after parsing and before any database write; on failure, the raw error strings are returned to the form, nothing is written, nothing is logged.
- **Slug-collision handling:** the database's own `products_slug_unique` constraint is the real authority; a `23505` violation on that specific constraint (detected via the shared `src/server/is-unique-violation.ts`, also now used by `create-order.ts`) is caught and turned into a clean `"Slug "..." is already in use by another product."` message rather than a raw database error.

### Publishing lifecycle — archive-only, no hard delete

`status: "draft" | "published" | "archived"` is a normal field on the same create/edit form (a "Publishing" section with a status `<select>`) — there is no separate one-click "Publish" button; setting Published and saving *is* publishing. **There is no delete action anywhere in the admin UI** — archive is the only "remove from circulation" state, matching `ProductStatus` having had `"archived"` as a distinct value since Phase 7 specifically for this. `mutate-product.ts` compares the old and new status on every edit to choose the right audit `action` (`product.published` when moving *to* published from something else, `product.archived` moving *to* archived, `product.updated` otherwise) — this was confirmed correct via the real product's actual audit trail, not just the regression harness.

### Draft/archived stay private — no new logic needed

`getPublishedProducts()`/`getProductBySlug()` both filter to `status = 'published'` in SQL — the exact same single-choke-point principle the old array-backed `getPublishedProducts()` already established, just implemented as a `WHERE` clause instead of an array `.filter()`. `POST /api/orders`'s existing `product.status !== "published"` check (unchanged since Phase 11) now means something real: a request crafted against a draft or archived product id is rejected with a `409`, using the product's live title fetched from Neon — verified live, not just asserted, using temporary draft/archived test products during the pre-acceptance test.

### Storefront ISR + on-demand revalidation

See "Store (storefront UI)" above for the route-level detail. The short version: `generateStaticParams` pre-renders whatever's published at build time, `dynamicParams = true` means anything published later still renders on its first request, a `revalidate = 3600` fallback guards against a missed revalidation call, and — the actual mechanism that makes "publish in admin, no redeploy needed" true in practice — every product mutation calls `revalidatePath("/store")` and `revalidatePath(`/store/${slug}`)` (both the *old and new* slug, if a rename happened) immediately after its database write succeeds. This was proven live: the real product's `/store/custom-graphic-design` page went from `404` to a real, statically-generated `200` page purely by publishing through the admin form — no code change, no `next build`, no redeploy.

### Admin-authenticated draft preview

`/admin/products/[id]/preview` reuses the **exact same** public rendering components `/store/[slug]` uses (`ProductHero`, `ProductMedia`, `ProductDetails`, `ProductPricing`, `ProductOptions`, `ProductPackages`, `ProductAddOns`, `ProductCTA`) — sourced via the admin `getProductById()` (any status) instead of the public published-only path, so a preview is never a reconstruction, it's literally what the public page will render once published. No public secret-token preview mechanism exists or is planned — protected-admin-only is the permanent approach here, not a placeholder for something else later.

### Transactional audit logging

A small, general-purpose `audit_log` table (not product-specific — ready for any future admin write), added via `drizzle/0004_jittery_boomerang.sql`:

```
id, admin_user_id (→ admin_users.id, ON DELETE SET NULL), action, entity_type, entity_id, metadata (jsonb), created_at
```

Append-only — nothing ever updates or deletes a row, so there's deliberately no `updated_at`. `src/server/audit-log.ts`'s `recordAuditEvent(executor, event)` accepts either a live `db.transaction()`'s `tx` or the plain client, and `mutate-product.ts` always passes `tx` — the product write and its audit entry commit or roll back **together**, inside the same transaction, never as two separate steps that could drift apart. `metadata` stays small and non-sensitive (e.g. `{ slug, title, from, to }`) — never a full entity payload, never secrets, never customer/order PII. Confirmed against the real product: six real events (`product.created`, four `product.updated`, `product.published`), every one referencing the same permanent product id and the real owner's `admin_users.id`.

### `order_lines.product_id` FK restored

`drizzle/0003_fluffy_synch.sql` — see "Order snapshots" under "Backend + database foundation" for the full writeup. Short version: dropped in Phase 11 because `products` was permanently empty; restored now (`ON DELETE SET NULL`) because it's genuinely safe and meaningful now that `products` holds real rows.

### `POST /api/orders` — now genuinely verifying against Neon

No code changed in `/api/orders/route.ts` itself for this phase — only `src/server/product-source.ts`'s internals swapped, exactly as its own Phase 11 design comment predicted. The full published/eligible/configuration/pricing verification chain now runs against live database state instead of a static array that could never actually go stale. Live-verified: a real request against the real product (which is `purchaseMode: "inquiry"`, never cart-eligible) correctly returned `409 "not eligible for direct order"` with the product's real, live-fetched title — proving the Neon lookup succeeded without ever needing to create a test order.

### Media — path/reference editing only, no upload

Deliberately unchanged from the approved scope: the media section of the admin form (`ProductMediaEditor.tsx`) is a repeatable list of `{ type, src, alt, poster?, caption? }` rows — plain text inputs for a path, not a file picker or upload button. The admin places the real file under the product's own folder first (see canonical structure below), then types the path in. Validation reuses the exact media rules already in `products.validate.ts` (local-path-only, scoped to the product's own folder, video requires a poster) — no new rules were added. **A real Media Library/upload system is still a planned, separate future phase** — this is not a placeholder gap being papered over, it's the explicitly agreed boundary for Phase 13.

**Canonical local product media structure:**

```
public/images/products/[product-slug]/...
```

e.g. `public/images/products/custom-graphic-design/hero.png`. This was briefly violated during real usage (the real file ended up at `public/images/products/hero.png`, no slug subfolder, breaking the database's existing reference) and then corrected: confirmed byte-identical via SHA-256 before removing the duplicate, keeping only the canonical slug-scoped path. Worth remembering for any future manual file placement — the folder-per-slug convention is not automatically enforced by anything except the validator's path-prefix check at save time, which only fires on the *database* path, not on where a file actually ends up on disk.

### Store/product media presentation — contain, not cover

Product and service artwork spans wildly different aspect ratios (square logos, portrait flyers, wide packaging wraps, menus, product photography) and must never be cropped to force-fit one shape. Two CSS changes, both deliberately scoped to product-only classes so the portfolio/services presentation (which shares some of the same underlying class names) is completely unaffected:

- **`.product-card-media img`** (store grid cards, `src/components/ui/ProductCard.tsx`) — `object-fit: cover` → `contain`. This class was already product-only (never shared with `ProjectCard`), so this was a pure one-line change.
- **Product hero** (`src/components/ProductHero.tsx`) — moved off the shared `.project-hero-media` class (also used by `ProjectHero` and `ServiceHero`) onto a new, fully self-contained `.product-hero-media` class: no fixed `aspect-ratio` on the box, instead `height: clamp(320px, 45vw, 640px)` (fluidly responsive, no separate mobile media query needed), `object-fit: contain`, same border/shadow treatment preserved, `background: var(--black)` for the letterboxed space (matching the same on-brand letterboxing already used by the gallery).
- **Gallery** (`ProductMedia.tsx` / `.project-gallery-item`) — required **no change**. It already used `object-fit: contain` with a black letterboxed background; this was verified by inspection, not assumed.

Verified against the real product's actual artwork (1600×1200, 4:3) end to end: card, hero, and public page all render the complete image, uncropped. The aspect-ratio guarantee itself is structural (`object-fit: contain` always shows the complete image, letterboxed on whichever axis is limiting), not something that needed separate testing per shape.

### Options, packages, add-ons — same models, admin-editable now

`ProductOptionsEditor`, `ProductPackagesEditor`, `ProductAddOnsEditor` are client components rendering the exact same `ProductOption`/`ProductPackage`/`ProductAddOn` types documented under "Catalog system" — no new types, no sticker-specific assumptions, no new validation rules. Each manages local array state (add/remove/edit rows) and serializes into one hidden JSON form field (`optionsJson`/`packagesJson`/`addOnsJson`) that the surrounding native `<form>` submits normally — the same "one native form, one server action" pattern the rest of the admin already uses, with array editing as the one genuinely-interactive piece, mirroring how `ProductPurchasePanel` already blends server-rendered structure with client-side interactivity elsewhere in this codebase. Add-on `chargeType` is presented as an explicit radio choice with the exact semantic explanation in the UI ("Per unit — charged once for every quantity ordered" / "Per line — charged once for the configured cart line, regardless of quantity") — never silently defaulted, since it changes cart/order math (see `cart-pricing.ts`).

### Money — dollars in the admin UI, integer cents everywhere else

`src/server/dollars-to-cents.ts` is the **one** place an admin-entered dollar string (`"25.00"`) becomes authoritative integer cents (`2500`) — never client-side, never anywhere else. It returns `null` for blank/non-numeric/negative/unsafe input, and callers (`build-product-form.ts`) treat `null` as "no number entered," which `collectProductValidationErrors()` then either allows (draft, or a pricing mode that doesn't need it) or rejects (a published product in a mode that requires it) — exactly the existing pricing-consistency rules, unchanged. The admin form itself always displays and accepts dollars (`$25.00`), matching the existing site-wide rule that a float dollar amount is never the authoritative representation.

### A controlled-select bug, and why every admin `<select>` is controlled now

**What happened:** early real-world use of the create/edit form showed `status` and `productType` edits silently failing to persist — the value would appear to be selected in the browser, the save would succeed, but the database still showed the old value. Title, slug, and media edits persisted correctly in the same sessions.

**Root cause:** every `<select>` in `ProductForm.tsx` except Purchase mode was **uncontrolled** (`defaultValue` only, no `value`/`onChange`). React's `<select>` reconciliation can re-apply `defaultValue` on a re-render triggered by unrelated state elsewhere in the same component (e.g. typing in the controlled Title field triggers a re-render of the whole form) — silently reverting a user's just-made selection before the form was ever submitted. `<input>`/`<textarea>` `defaultValue` doesn't have this failure mode (confirmed); it's specific to `<select>`. Purchase mode was never affected because it was already built as a controlled component — that's exactly why the fix generalizes its pattern rather than inventing a new one.

**Proof, not just theory:** a temporary regression harness (Neon test product, real `buildProductFromFormData()`/`collectProductValidationErrors()`/Drizzle transaction, synthetic `FormData` built to look like a correctly-working browser submission) exercised draft↔published, physical→service, published→archived, a slug rename, invalid-value rejection, and audit-event correctness — **22/22 passed**, conclusively proving the server-side pipeline was never the problem and the break had to be client-side.

**The fix:** `category`, `productType`, `relatedServiceSlug`, and `status` in `ProductForm.tsx` are now all controlled (`useState` + `value` + `onChange`), matching `purchaseMode`'s existing pattern. **Rule for any future admin form work: every `<select>` must be a controlled component — never `defaultValue`-only.** `<input>`/`<textarea>` `defaultValue` remains fine as-is.

### Live acceptance test — what was genuinely verified

Using one real, admin-created product (not seeded, not synthetic) start to finish: created via `/admin/products/new` → appeared in `/admin/products` → did **not** appear publicly while draft → previewed correctly while authenticated → edited (title, slug, productType, media) → the status/productType bug found and fixed as above → media path mismatch found and corrected (byte-identical duplicate removed) → published → appeared on `/store` and `/store/custom-graphic-design` (`200`, statically generated) with no redeploy → card and hero both render the complete, uncropped artwork → `POST /api/orders` resolves the same product from Neon → exactly one product row throughout → six real, correctly-attributed audit events (`created`, four `updated`, `published`) → zero customer/order/order_line rows created merely by any of this → the real owner's `admin_users` row untouched throughout.

**Not built/planned for later:** bulk product actions, product duplication, a "quick publish" one-click control separate from the edit form, and — as already covered above — the Media Library/upload system.

## Website content admin

**Status: a real admin-controlled system for the routine website content most likely to change often — business identity/branding, homepage hero, header navigation, contact-section copy, and SEO/sharing metadata — backed by Neon, with the existing TypeScript config/data files retained as an offline fallback, never deleted.** This is the phase that executes the "content administration, not a redesign" plan: the homepage looks and behaves exactly as it did before, but its content now lives in the database and is editable through `/admin/website`.

### Four small, typed tables — not one JSON blob

`src/db/schema.ts`, added via `drizzle/0005_hot_echo.sql` (one migration for all four — they're a single coherent, purely-additive feature; see that migration's own inline commentary for why it wasn't split like Phase 13's FK-restore/audit-log pair):

- **`site_settings`** — a singleton row (`id = 'default'`, the app never creates a second one). Backs the admin UI's General/Branding **and** SEO groupings from one table — the admin UI's section layout is a presentation choice, not a database structure. Typed columns for everything except `socialLinks`, a small bounded JSONB array (`{ platform, url }[]`), mirroring the same "JSONB only for genuinely variable-length lists" rule already used for `Product.media`/`options`/`packages`. Includes two reserved, currently-unrendered columns: `contactPhone` (no phone field existed anywhere before Phase 14) and `ogImageSrc` (no `openGraph.images` wiring exists in `layout.tsx` yet).
- **`navigation_items`** — genuinely multi-row, fully scalar. One table covers both the header's primary menu (`placement: 'primary'`, ordered by `sortOrder`) and the single header button (`placement: 'header_cta'`), rather than two near-identical tables.
- **`homepage_content`** — exactly two rows, differentiated by `status: 'draft' | 'published'`, never more. This is the **one** Phase 14 table with a draft/publish split — see "Draft/publish model" below for why only this one. Four columns (`heroImageSrc`, `heroImageAlt`, `secondaryCtaLabel`, `secondaryCtaHref`) are reserved: the columns exist so a future phase doesn't need a migration to add them, but `Hero.tsx` renders neither an image nor a second CTA this phase — approved explicitly as "content administration, not a homepage redesign." `badgePrimary`/`badgeSecondary` (the two rotated sticker badges) are included as full editable fields even though they weren't in the original request list, since they're real content `Hero.tsx` renders unconditionally today.
- **`contact_content`** — a singleton row (same `id = 'default'` convention), scoped to exactly the four fields `ContactForm.tsx` renders as section copy (`kicker`, `heading`, `description`, `submitLabel`). The form's own field labels/placeholders/service dropdown options stay code-owned in `src/data/homepage.ts` — narrower scope than "every string in the component," matching "content likely to change often" rather than form microcopy.

No table has a foreign key to any other table (including `admin_users`) — "who edited what, when" is already fully covered by `audit_log`'s own `admin_user_id`, so nothing here duplicates it.

### Content fallback — the core safety principle

`src/config/site.ts`, `src/data/homepage.ts`'s `hero`/`contact` exports, and `src/data/navigation.ts` are **retained, unmodified, and undeleted** — Phase 14 does not touch or remove them, unlike `product.template.ts` in Phase 13 (which was only deleted after the admin flow was fully proven). They are now the **fallback**, read by `src/server/queries/site-content.ts`.

Every public read in that module merges the DB row against its matching TS constant **field by field** — `row.siteName || fallback.siteName`, not "if the row is missing, fall back entirely." A partially-populated row can never blank out unrelated content on the public site. Admin reads (used to prefill edit forms) deliberately skip this merge and return true, raw DB state instead — an editor needs to see what's actually stored, not a code-blended approximation.

The Phase 14 migration's seed `INSERT`s copied every value **verbatim** from the live TypeScript files at the moment of migration, so the first database-backed render was byte-identical to what was live immediately before cutover — verified directly against Neon before any admin edit was made.

### Public components now read from Neon

`Header.tsx`, `Footer.tsx`, `Hero.tsx`, and `ContactForm.tsx` are now `async` server components calling `getSiteSettings()`/`getNavigation()`/`getPublishedHeroContent()`/`getContactContent()` instead of importing `siteConfig`/`hero`/`navigation.ts`/`contact` directly. `layout.tsx`'s `export const metadata` (a static object) became `export async function generateMetadata()` reading `getSiteSettings()` — the change required for a DB-backed site name/meta title/description/canonical URL to take effect without a redeploy. Every one of these query functions is wrapped in React's `cache()`, so the several components that each need the same row within one request (e.g. `Header` + `Footer` + `generateMetadata` all need `site_settings`) share a single DB round trip per request instead of querying it redundantly per component.

`hero.cta.icon`/`hero.cta.ariaLabel` in `src/data/homepage.ts` remain code-owned, static, presentational/accessibility details — not part of the admin-editable content set, not requested, not moved to the database.

### Draft/publish model — one table gets it, three don't

- **`homepage_content`**: draft + published rows. This is the one piece of website content where "preview before it goes live" has real value — it's the first thing every visitor sees. `/admin/website/homepage` edits the **draft** row only (`saveHeroDraftAction`) and never touches the public site on save. `/admin/website/homepage/preview` renders the **exact same public `Hero` component** the homepage uses, passed the draft row's content via `Hero`'s optional `content` override prop — the same "reuse the real component, don't reconstruct it" principle Phase 13 established for product preview. Publishing (`publishHeroAction`) takes **no form fields of its own** — it reads whatever is currently saved in the draft row and copies it onto the published row inside one transaction, writes the audit event, and revalidates `/`. This is a deliberate three-step flow (Save Draft → Preview → Publish); clicking Publish without saving first publishes the last-saved draft, not unsaved form edits — the UI's help text says so.
- **`site_settings`, `navigation_items`, `contact_content`**: immediate/current, no draft state, save takes effect right away with immediate revalidation. These are corrective/mechanical settings (a typo'd email, a broken nav link, a stale contact heading) where instant-fix value outweighs staging value, and none carries the same first-impression risk as the hero.

### Admin routes and forms

```
/admin/website              — hub linking to the five sections below
/admin/website/general         — site name, legal name, tagline, contact email/phone, location, logos, social links
/admin/website/homepage        — hero draft editor + "Publish current draft"
/admin/website/homepage/preview    — admin-authenticated draft preview (reuses the real Hero component)
/admin/website/navigation        — header menu items (add/remove/reorder/enable) + header button
/admin/website/contact         — contact-section kicker/heading/description/submit label
/admin/website/seo            — meta title/description, canonical URL, social sharing description/image
```

All inside the existing `(protected)` route group — `requireAdminUser()` coverage via the layout is automatic for every page above. `src/config/admin-nav.ts`'s "Website" entry is now `available: true`. None of the admin UI ever says "site_settings," "navigation_items," or any other table name — section labels match the plain-language groupings above.

`SiteSettingsForm.tsx` is **shared** by the General/Branding and SEO pages, since both edit the same `site_settings` row: each page shows only its own fields visibly and carries the *other* section's current values forward as hidden inputs, so every submission always sends the complete settings shape — avoiding a partial-update codepath entirely, the same principle as `ProductForm` always submitting a complete candidate even though it's organized into fieldset sections. `NavigationForm.tsx`/`SocialLinksEditor.tsx` are repeatable-list editors following the **exact** add/remove/serialize-to-one-hidden-JSON-field pattern `ProductOptionsEditor.tsx` already established; reordering nav items is plain up/down buttons (array order becomes `sortOrder` on save), not drag-and-drop — proportionate to "a handful of menu items," not a general page-builder.

### Query/mutation split

Mirrors the read/write separation already established for products/orders/customers:

- **Reads:** `src/server/queries/site-content.ts` — `server-only`, zero `insert`/`update`/`delete` calls, never imported by a client component.
- **Form parsing:** `src/server/build-website-content-form.ts` — the untrusted-`FormData`-to-candidate-shape boundary, shape parsing only (mirrors `build-product-form.ts`'s split from business validation).
- **Validation:** `src/server/validate-website-content.ts` — small, composable validators (`validateRequiredText`, `validateEmailShape`, `validateHref`, `validateAbsoluteHttpsUrl`, `validateRequiredLocalMediaPath`/`validateOptionalLocalMediaPath`) reused across every mutation, same "collect everything, return inline, never partial-write" philosophy as `collectProductValidationErrors()`. `validateHref`/`validateAbsoluteHttpsUrl` are the actual security boundary for every admin-editable URL — see Security below.
- **Writes:** `src/server/mutate-website-content.ts` — `"use server"`, the only place any of the four tables is written. `updateSiteSettingsAction()`, `updateNavigationAction()`, `updateContactContentAction()`, `saveHeroDraftAction()`, and `publishHeroAction()` **each independently call `requireAdminUser()`** as their first line, exactly like `mutate-product.ts` — Server Actions aren't covered by the protected layout's own check. Each write is wrapped in a `db.transaction()` alongside its `recordAuditEvent(tx, ...)` call, so a content change and its audit entry can never drift apart.

### Audit events

`website.settings.updated`, `website.navigation.updated`, `website.contact.updated`, `website.hero.draft_saved`, `website.hero.published` — metadata stays small (e.g. `{ siteName, metaTitle }`, `{ itemCount }`, `{ headlineLead }`), never a full content dump, matching the exact rule already established for `product.*` events.

### Revalidation — and the Header/Footer duplication this phase inherits

- **`homepage_content` publish** → `revalidatePath("/")` only (the hero renders only on the homepage).
- **`site_settings` save** → `revalidatePath("/", "layout")`, since `generateMetadata()` now reads it and the root layout wraps every route.
- **`contact_content` save** → `revalidatePath("/")` (the contact section renders only on the homepage).
- **`navigation_items` save** → immediate `revalidatePath()` for a fixed, known list of major routes (`/`, `/store`, `/cart`, `/checkout`); the dynamic detail routes (`/store/[slug]`, `/work/[slug]`, `/services/[slug]`) are **not** individually revalidated on nav save — they pick up the change via their existing `revalidate = 3600` ISR fallback instead.

**Why the gap exists, and why it wasn't closed this phase:** `Header`/`Footer` are not rendered from a shared root layout — `src/app/layout.tsx` only wraps `{children}` in `CartProvider`. Every top-level page (`page.tsx`, `store/page.tsx`, `store/[slug]/page.tsx`, `work/[slug]/page.tsx`, `services/[slug]/page.tsx`, `cart/page.tsx`, `checkout/page.tsx`) imports and renders `Header`/`Footer` itself. This predates Phase 14 — it's inherited technical debt, not something this phase introduced. Moving `Header`/`Footer` into the root layout would let one `revalidatePath("/", "layout")` reach every route instantly, but that's a structural change touching every route's render tree, and was explicitly deferred rather than bundled into a content-admin phase. **Documented here as a candidate future cleanup, not a bug.**

### Security

- **Every href a website-content mutation can write** (`navigation_items.href`, `homepage_content.ctaHref`, social link URLs) is validated server-side by `validateHref()`/`validateAbsoluteHttpsUrl()` before any write: a relative path, a same-page `#hash`, a `mailto:` with a shape-checked address, or an absolute `https://` URL only. **Rejected outright:** `javascript:`, `data:`, `vbscript:`, any other non-https scheme, bare `http://`, and protocol-relative `//host` URLs. This is the actual security boundary — `Button.tsx`/`Header.tsx` render every href directly with zero runtime sanitization, exactly like every other href in this codebase, so safety comes entirely from what's allowed to be written, not from escaping at render time.
- `site_settings.canonicalUrl` is validated even more strictly (`validateAbsoluteHttpsUrl`) since it feeds `new URL(...)` as `metadataBase` — invalid input must never reach the database, since it would otherwise throw at request time.
- Email fields use the same lightweight shape check (`EMAIL_PATTERN`) already used by `validateOrderDraft()` — no new library.
- Logo/media path fields reuse `isLocalMediaPath()` (now extracted into `src/data/media-path.ts` so both `products.validate.ts` and `validate-website-content.ts` share one implementation instead of two copies).
- **No admin-editable website-content field is ever rendered via `dangerouslySetInnerHTML`** — none of `Header`/`Footer`/`Hero`/`ContactForm` use it, and Phase 14 introduces none. Every field is plain text, rendered through normal JSX interpolation, which is escaped by React by default. This is a standing rule for any future admin-content form, not just this phase's fields.
- Every mutation independently calls `requireAdminUser()`, per the rule established in "Admin foundation."

### Media — path/reference model, no upload

Same principle as Phase 13's product media: **path/reference editing only, no file upload.** `site_settings.logoHorizontalSrc`/`logoWhiteSrc` are plain text inputs in the General & Branding form — the admin places the real file under `public/brand/` first (the same folder the two seeded logos already live in), then types the path in. `site_settings.ogImageSrc` (reserved, unrendered) and `homepage_content.heroImageSrc` (reserved, unrendered) follow the same convention for whenever a future phase wires up their rendering. Validation reuses `isLocalMediaPath()` — now extracted into `src/data/media-path.ts` specifically so this phase's validator and `products.validate.ts` share one implementation instead of maintaining two copies of the same local-path rule. **A real Media Library/upload system remains a planned, separate future phase** — not a placeholder gap being papered over here, the same explicitly-agreed boundary Phase 13 already drew for product media.

### Live acceptance test — what was genuinely verified

Using your own real edit through `/admin/website` (not seeded, not synthetic): the homepage hero's `eyebrow` was changed to **"BRANDING • DESIGN • PRODUCTION"** via `/admin/website/homepage` → Save Draft → confirmed private (public homepage still showed the old eyebrow, draft row held the new text) → confirmed correct via `/admin/website/homepage/preview` (the real `Hero` component, rendering the draft) → Publish → the public homepage updated to the new eyebrow **with no source edit, no commit, and no redeploy** — the running dev server picked it up purely because `Hero.tsx` reads `getPublishedHeroContent()` from Neon on every request. Exactly one `website.hero.draft_saved` and one `website.hero.published` audit event were recorded, both correctly attributed to the real owner account, with small, safe metadata. A separate, real General/Branding or SEO save in the same session produced two legitimate `website.settings.updated` events, also correctly attributed — confirming the shared `SiteSettingsForm.tsx`/`updateSiteSettingsAction()` path works end to end, not just the hero path. Throughout: the real `Custom Graphic Design` product stayed untouched and published, the real owner `admin_users` row stayed untouched, and `customers`/`orders`/`order_lines` stayed at zero. This is the same "prove it against real usage, not just a regression harness" standard Phase 13's acceptance test set.

### Not built this phase

Dynamic favicon management (the existing static Next.js `favicon.ico` file-convention is untouched — making it DB-driven would require a dynamic `icon.tsx` route re-reading the database on every request, a real architecture change deferred as explicitly out of scope). Hero image/secondary CTA rendering (columns exist, reserved, unrendered). A shared root layout for `Header`/`Footer` (see Revalidation above). Portfolio/services editors, a Media Library/upload system, Stripe, AI, Obsidian, or a general page-builder — none of this is touched, same boundary already established by Phase 13.

### Future admin expansion (documentation only)

`site_settings`, `navigation_items`, `homepage_content`, and `contact_content` are shaped so a future phase can extend this same admin, without a redesign:

- **Media Library** — once a real upload/asset-management system exists, every path field this phase built as plain text (`logoHorizontalSrc`, `logoWhiteSrc`, `ogImageSrc`, `heroImageSrc`) becomes a picker over that library instead of a typed path — the underlying columns don't change shape, only how the admin fills them in.
- **Brand controls (colors, fonts, buttons)** — `src/app/globals.css`'s `:root` design tokens (documented under "Colors, spacing, shadows, borders, durations" above) remain code-only this phase. A future "Branding" expansion could move a curated subset (primary/accent colors, button styles) into `site_settings` or a dedicated table the same way logos moved here — deliberately not started this phase, since it risks the site's established visual identity if exposed to unrestricted admin editing without real guardrails.
- **Services Admin / Portfolio Admin** — `services.ts`/`projects.ts` remain fully code-owned, exactly as Phase 13 already documented as out of scope. This phase's query/mutation/validation/audit pattern (`queries/site-content.ts`, `build-website-content-form.ts`, `validate-website-content.ts`, `mutate-website-content.ts`) is the template a future Services/Portfolio Admin would most naturally follow, the same way Phase 13's product admin became this phase's own template.
- **Big Red Brain / Obsidian boundary** — unchanged from every prior phase's documentation of this boundary. `site_settings`/`navigation_items`/`homepage_content`/`contact_content` are all **public-facing content**, not private operational data — there is no privacy concern in a future AI layer reading *published* website content. The boundary that matters is unchanged: customer/order/payment/internal-note data stays private and must never automatically become AI-accessible context, exactly as documented under "Checkout + Order foundation" and "Backend + database foundation." No AI or Obsidian integration exists in this codebase yet.

## Media Library

**Status: a real, working Media Library — upload, browse, edit, archive, and select images for products — backed by Vercel Blob (the "BigRedMedia" store) and a new `media_assets` table, live-tested end to end with a real uploaded image attached to the real Custom Graphic Design product.** Still no video upload/processing, no AI alt-text generation, and no website-content (logo/hero/OG image) wiring yet — those remain either deferred or explicitly out of scope, see below.

### Storage: Vercel Blob, authenticated via OIDC — not a long-lived token

The store is named **BigRedMedia**, connected to this Vercel project. Authentication uses **Vercel's OIDC federation**, not the older `BLOB_READ_WRITE_TOKEN` pattern: `@vercel/blob` (2.x) auto-detects two environment variables —

- `VERCEL_OIDC_TOKEN` — a **short-lived** identity token. Expires; local development refreshes it by re-running `vercel env pull` (or restarting `vercel dev`). This is expected, ordinary behavior, not an error condition.
- `BLOB_STORE_ID` — the BigRedMedia store's stable id (`store_...`). Does not expire.

Both must be populated together — the SDK's own auth-resolution logic requires `VERCEL_OIDC_TOKEN` **and** either an explicit `storeId` or `BLOB_STORE_ID` before it will attempt OIDC auth at all; missing either produces a clean, generic auth error, never a leaked credential. `BLOB_READ_WRITE_TOKEN` is documented in `.env.example` only as a legacy/alternative fallback — **unused and unset** under this project's actual OIDC setup. Neither variable is ever `NEXT_PUBLIC_`-prefixed. `src/server/media-storage.ts` is the one place this app talks to Vercel Blob at all.

**Why Vercel Blob over Cloudinary/S3/Supabase Storage:** ties directly into the existing Vercel project/env (no new vendor account beyond what already exists), CDN delivery and public URLs out of the box, no IAM/CORS setup S3 would require, no vendor sprawl the way Supabase Storage would add (this project uses Neon for its database, not Supabase, anywhere). Full reasoning recorded in the Phase 15 architecture approval.

### `media_assets` — metadata/reference only, no binary data in Neon

```
id                    text PK          -- "media_" + crypto.randomUUID(), matching Product.id's "prod_" convention
storageProvider       text not null    -- "vercel-blob" today; exists so a future provider swap needs no schema change
storageKey            text not null    -- the Blob pathname, e.g. "media/<uuid>.png" — used for deletion
url                   text not null    -- the public CDN URL actually rendered
type                  text not null    -- "image" | "video" (MEDIA_ASSET_TYPES)
mimeType              text not null
filename              text not null    -- display filename (may differ from what's stored on disk)
originalFilename      text not null    -- as uploaded, for reference/audit
width / height        integer, nullable
sizeBytes             integer not null
alt                   text not null default ''   -- encouraged, editable; empty allowed for an
                                                     unattached asset, required once actually used
caption               text, nullable
status                text not null    -- "active" | "archived" (MEDIA_ASSET_STATUSES)
createdByAdminUserId  uuid references admin_users(id) on delete set null
createdAt / updatedAt timestamptz not null default now()
```

Added via `drizzle/0006_messy_rage.sql` — a single `CREATE TABLE` plus one FK, no changes to any existing table, no seed rows (starts empty, same as `audit_log` did). Migrations 0000–0005 remain untouched by this or any later Phase 15 migration.

### Upload validation — allowlist-based, never trusts the browser

`src/server/validate-media-upload.ts`'s `validateImageUpload()` is the one place an uploaded file's real bytes get inspected:

1. **Byte-sniffs real magic bytes** for PNG/JPEG/WebP — never trusts the browser's declared filename or `Content-Type`.
2. **Cross-checks** against `image-size`'s own independent format detection as defense in depth (and reads real width/height from it, wrapped in try/catch for a truncated/corrupt file).
3. Enforces the **8 MB application limit** (`MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024`) on the actual bytes read, never a client-reported size.

**SVG uploads are prohibited entirely.** SVG can carry `<script>`/event-handler attributes; the allowlist (PNG/JPEG/WebP only) rejects everything else — including SVG, executables, HTML — by construction, with no denylist to keep complete. The business's existing trusted SVGs (`public/brand/logo-horizontal.svg`, `logo-white.svg`, `monogram.svg`) are developer-placed, code-reviewed files, untouched by and unrelated to this system.

### Upload transport limit vs. application limit — two different numbers, on purpose

Next.js Server Actions default to a **1 MB** request-body limit, entirely independent of and unrelated to the application's own image policy — this was hit and fixed live: the first real acceptance-test upload failed with `Body exceeded 1 MB limit` before `uploadMediaAction()` ever ran. The fix, in `next.config.ts` (a file that didn't exist before Phase 15):

```ts
experimental: {
  serverActions: {
    bodySizeLimit: "9mb",
  },
},
```

**9 MB is the transport ceiling only** — just enough above the real 8 MB file limit to cover multipart/form-data overhead (boundary strings, headers, the alt/caption fields). `MAX_IMAGE_UPLOAD_BYTES` in `validate-media-upload.ts` is the actual, unchanged, authoritative 8 MB policy — raising the transport ceiling was never allowed to mean raising what the application actually accepts, and it doesn't. Confirmed live: a request that failed at the 1 MB transport limit left **zero** trace anywhere — no Blob object written, no `media_assets` row, no audit event, verified by directly listing the Blob store's `media/` prefix, not just by inspecting Neon.

`next.config.ts` also holds `images.remotePatterns`, scoped to the **exact** BigRedMedia hostname (not a wildcard) — required because `next/image`'s optimizer refuses to render any external hostname that isn't explicitly allow-listed. This hostname is a public CDN address, not a secret. Local `/public` images are completely unaffected — `remotePatterns` only ever applies to `http(s)://` sources.

### `/admin/media` — the library

```
/admin/media        — grid: thumbnail, filename, type, dimensions, size, status; upload form; search/filter/pagination
/admin/media/[id]      — preview, alt/caption edit, archive/unarchive, replace file, "Used by" list
```

Same plain server-rendered patterns already established elsewhere in this admin — no drag-and-drop library, no cropping tool, no heavy media-management dependency. `MediaFilterBar` mirrors `ProductsFilterBar`'s native `<form method="GET">` pattern exactly. `src/config/admin-nav.ts`'s "Media" entry is now `available: true`.

### Alt text, captions, archive/unarchive

`MediaEditForm` edits `alt`/`caption` directly (`updateMediaAssetAction`). `MediaStatusToggle` is a single fieldless button bound to whichever transition applies (`archived` or back to `active`) — **archiving never deletes the underlying Blob or breaks any live reference**; it only removes the asset from the picker's default (`active`) list and the library's default filtered view. No hard-delete action exists anywhere in the admin, mirroring the exact precedent already established for products.

### Replace — recoverability over immediate cleanup

`replaceMediaAssetAction` (`MediaReplaceForm`) preserves the **permanent `media_assets.id`**, uploads the new file under a **brand-new immutable storage key**, updates `url`/`storageKey`/dimensions/size to point at it, and revalidates every page the usage scan (below) finds currently referencing that asset. **The previous Blob is deliberately left in storage, not deleted** — this was an explicit Phase 15 decision favoring recoverability over immediate cleanup, not an oversight. `deleteBlob()` in `media-storage.ts` exists and is used only for rolling back a blob that was uploaded moments ago in the same failed request (nothing could reference that brand-new key yet) — never for a superseded "replace" blob. **Documented here as a known, intentional gap: cleaning up orphaned previous-version blobs is a future storage-maintenance task, not solved this phase.** No complicated version-history system was built to compensate — just this one documented follow-up.

### Product integration — `mediaAssetId`, resolved live, legacy paths untouched

`src/data/media.ts`'s `Media` type gained one optional field:

```ts
type Media = {
  type: MediaType;
  src: string;       // always populated — frozen at the moment an asset was chosen
  alt: string;
  poster?: string;
  caption?: string;
  mediaAssetId?: string;  // Phase 15 — optional link to a media_assets row
};
```

`ProductMediaEditor.tsx` now offers **"Choose from Media Library"** as a picker alongside — not replacing — the original manual-path text input. Selecting a thumbnail sets both `src` (so the entry works immediately, even before any live resolution) and `mediaAssetId`. **Legacy manually-typed entries — including the real product's original `hero.png` reference — are completely unaffected** and continue to validate exactly as before (`collectProductValidationErrors()`'s local-path/folder-scoping check now only runs when `mediaAssetId` is absent).

**Runtime resolution, not a frozen write-time snapshot:** `src/server/queries/catalog.ts`'s `resolveProductsMedia()` runs on every public product read (`getPublishedProducts()`, `getProductBySlug()`, `getProductById()`), batch-collects every `mediaAssetId` referenced across the product(s) being returned, and overrides each entry's `src` with the asset's **current** `media_assets.url` before the product ever reaches a page component. This is what makes a future "replace" meaningfully useful: replacing an asset's file updates **every product referencing it** with zero per-product edits — the whole reason Product.media didn't just freeze a URL forever the way `order_lines` intentionally does. `ProductHero`/`ProductCard`/`ProductMedia` needed **zero changes** — they still just receive `{ src, alt, ... }` the same as always.

### Usage scanning — query-time, no `media_usage` table

`findProductsReferencingMediaAsset()` in `queries/media.ts` uses Postgres's own JSONB containment operator (`products.media @> '[{"mediaAssetId": "..."}]'::jsonb`) rather than a separately-maintained tracking table — cheap, always accurate, and nothing to keep in sync at this business's realistic scale. Powers both the "Used by" list on `/admin/media/[id]` and `replaceMediaAssetAction`'s revalidation targeting. Only scans `products.media` — `site_settings`/`homepage_content` don't reference `media_assets` at all yet (see Website integration below).

### Transactional audit logging

`media.uploaded`, `media.updated` (alt/caption edits, and also what a "replace" logs — no separate `media.replaced` action), `media.archived` (only the transition *to* archived; unarchiving logs as a plain `media.updated`, matching the exact same "no separate unarchive action" convention Phase 14 established for its own draft/publish events). No `media.deleted` event exists, since hard delete isn't built. Every mutation independently calls `requireAdminUser()` as its first line and writes its audit event inside the same `db.transaction()` as the data change, exactly like every prior admin mutation in this codebase.

### Live acceptance test — what was genuinely verified

Using your own real upload (not seeded, not synthetic): uploaded a real image through `/admin/media` → saw its thumbnail in the grid → edited its alt text (hitting and then correcting a real duplicated-text glitch in your own editing, left untouched by me) → selected it via "Choose from Media Library" on the real Custom Graphic Design product → saved the product → confirmed the public `/store/custom-graphic-design` page rendered the Blob URL directly in its HTML → confirmed "Used by" on `/admin/media/[id]` correctly resolved back to that same product, verified against the actual usage-scan query, not just the UI. Along the way, the Server Action 1 MB body-size bug was found, root-caused, and fixed (see above) — confirmed to have left zero trace in either Neon or the Blob store before the fix shipped. Throughout: exactly one real `media_assets` row, exactly one real Blob object, the real product stayed `published` throughout, the real owner account attributed to every single audit event, and `customers`/`orders`/`order_lines` stayed at zero.

### Not built this phase

Video upload/processing/transcoding (the schema is video-ready — `type: "video"`, format-agnostic `mimeType`/`sizeBytes`/`storageProvider` — but no upload path or player exists). AI alt-text generation (alt text is admin-typed only, never invented). Website-content wiring — `site_settings`'s OG image and `homepage_content`'s reserved hero image field do **not** reference `media_assets` yet. `site_settings`'s logo fields specifically gained Media Library integration in Phase 16, but through `brand_settings`, not `site_settings` itself — see "Brand Controls" below. A dedicated legacy-local-file "represent without uploading" registration UI (deferred — existing local media continues working purely through the untouched manual-path input, needing no Media Library involvement at all). Orphaned-previous-blob cleanup tooling (see Replace, above). Portfolio/Services admin, a font editor, an arbitrary file manager, client-facing uploads, Big Red Brain, Obsidian — none of this is touched, same boundary already established by every prior phase.

### Future media expansion (documentation only)

`media_assets` is shaped so later work extends cleanly, without a redesign: a video upload phase adds validation/a player/poster handling on top of the same table; website-content wiring (logos, hero image, OG image) would apply the exact same optional-`mediaAssetId`-plus-live-resolution pattern already proven on products; a real orphaned-blob cleanup job would read `storageKey`s no longer referenced by any current `media_assets.url` and reconcile against a Blob listing; Portfolio/Services media could eventually route through this same library instead of `public/images/projects|services/`. None of this is scheduled — it's recorded so a future phase doesn't have to re-derive the shape from scratch.

## Brand Controls

**Status: a real, working admin-controlled system for the site's core visual identity — colors, the transactional-button palette, and logo selection — with a draft/preview/publish workflow, backed by a small, deliberately scoped preparatory CSS refactor that changed zero pixels on its own.** Still no typography control, no arbitrary CSS editor, no font upload — deliberately out of scope, see below.

### The CSS refactor — zero visual change, on purpose

Before any of this could be admin-controlled, `src/app/globals.css` needed three small, surgical splits — every new default is byte-identical to the value it was split from, so the refactor alone changed nothing a visitor could see:

1. **`--text` split from `--black`.** `--black` used to drive text color, borders, *and* shadows all at once — there was no way to change text color independently. Every genuinely-text usage of `var(--black)` (10 rules: `body`, `.hero-sticker`, `.portfolio-filter`, `.media-video-badge`, `.cart-item-remove`, `.cart-summary-deposit`, `.checkout-form label`, `.checkout-form input/textarea`, `.checkout-secondary-button`, `.checkout-fallback-note a`) now reads `var(--text)` instead. **`--black` keeps driving borders and shadows exactly as before** — and, worth knowing, it *also* still drives a handful of dark-surface backgrounds that were never split out into their own token (footer, ticker, `.header-cta`) because they weren't part of the requested field list — splitting those further would have started exposing "every CSS property," which was explicitly out of scope. The "Border color" admin field is honestly documented as also affecting those surfaces, not just borders.
2. **`--gray` activated.** It was declared in `:root` but never actually referenced anywhere in `globals.css` — real muted text used **hardcoded `#555` and `#777` literals in 18 separate rules**, found by direct inspection, not assumption. All 18 now read `var(--gray)`. One muted-gray literal, `#bbb` on `.statement p`, was deliberately **left untouched** — `.statement` has a black background, so `#bbb` is a *different*, dark-background-appropriate shade, not the same "muted text" concept at all; conflating them would have been a real, if subtle, design regression.
3. **`--button-bg`/`--button-text`/`--button-hover-bg` introduced**, applied to exactly the three buttons that already shared one consistent solid-background/red-hover pattern: `form button` (the contact form submit), `.cart-checkout-button`, `.checkout-submit-button` (including its `:disabled:hover` state). **`.round-button` (the hero CTA) and `.header-cta` (the nav button) are deliberately excluded** — they're visually distinct, intentional design choices, not part of this shared system; forcing them in would have been a redesign, not a refactor. `form button` itself has no hover state at all today — none was added, since adding one would be new behavior, not a like-for-like token swap.

Every one of these was verified with a real `npm run build` immediately after the refactor, before any database/admin code was written.

### Four small, typed tables become five — `brand_settings`

Mirrors `homepage_content`'s exact draft/published two-row shape (`drizzle/0007_friendly_scarecrow.sql`):

```
id                     uuid PK
status                 text not null   -- 'draft' | 'published'
primaryColor           text not null   -- validated, normalized "#RRGGBB"
accentColor            text not null
backgroundColor        text not null
surfaceColor           text not null
textColor              text not null
mutedTextColor         text not null
borderColor            text not null
buttonBackground       text not null
buttonText             text not null
buttonHoverBackground  text not null
logoHorizontalMediaAssetId  text, references media_assets(id) on delete set null
logoWhiteMediaAssetId       text, references media_assets(id) on delete set null
updatedAt              timestamptz not null default now()
```

**Logo references live on `brand_settings`, not `site_settings`** — a deliberate divergence from how `site_settings.logoHorizontalSrc`/`logoWhiteSrc` themselves work (those stay immediate/current, untouched). The reason: you wanted logo selection to participate in the *same* Save Draft → Preview → Publish workflow as colors, so it needed to live wherever that draft/published pair already exists. `site_settings`' existing static paths remain the safe fallback whenever a brand row has no Media Library selection — nothing about how those two columns work changed.

### Content fallback — two layers deep

Public reads (`src/server/queries/brand.ts`) are field-level-fallback-safe at **two levels**: first against `globals.css`'s own hardcoded `:root` defaults (byte-identical constants baked into `CSS_DEFAULTS`, so a missing/unreachable database never blanks a color), and for logos, against `site_settings`' existing immediate/current path fields (so a brand row with no Media Library selection still renders the real logo, not a broken image). The migration's seed `INSERT`s copied every color verbatim from `globals.css` at the moment of migration, so the first database-backed render was byte-identical to what was live immediately before cutover.

### Draft/publish — colors and logos together

`homepage_content`'s draft/published model, applied identically to the *entire* brand row (colors and logo selections as one unit, per your explicit choice): `/admin/website/branding` edits the **draft** row only (`saveBrandDraftAction`) and never touches the public site on save. `/admin/website/branding/preview` renders the **exact same public components** the live site uses — `Header`, `Hero`, `ContactForm` (specifically because its submit button is one of the three tokenized buttons), `Footer` — passed `brandVariant="draft"` and wrapped in `<BrandTokens variant="draft">`, the same "reuse the real component" principle Phase 13/14 already established for their own previews. Publishing (`publishBrandAction`) takes **no form fields of its own** — it copies whatever is currently saved in the draft row (all 10 colors + both logo selections, as one transactional unit) onto the published row, writes the audit event, and revalidates. Publish-without-saving-first publishes the last-saved draft, never unsaved form edits — same discipline as the homepage hero.

### `<BrandTokens />` — Option B, and why

`src/app/layout.tsx` is the **true root layout — it wraps `/admin/*` too** (`admin/layout.tsx` nests inside it), and `admin.css` deliberately reuses the exact same `--red`/`--black`/etc. custom-property *names* as `globals.css`. Injecting a brand override at the root layout would leak published/draft brand colors straight into your own admin dashboard. Per your approval, `<BrandTokens />` is instead imported **per public top-level page** — `page.tsx`, `store/page.tsx`, `store/[slug]/page.tsx`, `work/[slug]/page.tsx`, `services/[slug]/page.tsx`, `cart/page.tsx`, `checkout/page.tsx` — the exact same place `Header` is already imported (Phase 14 already established and accepted this per-page pattern for nav, for the same reason). No admin page ever imports it, so there's no leak path.

It renders a wrapping `<div>` — not `:root` — with the resolved colors set as real CSS custom properties, **and** its own `background: var(--cream)` / `color: var(--text)` explicitly redeclared. That second part is necessary, not decorative: `body`'s own `background`/`color` in `globals.css` are fixed at the `body` element itself, which is an *ancestor* of this wrapper — only descendants pick up a custom property redeclared here, so without re-declaring `background`/`color` directly on the wrapper, any section relying on the inherited default (most of them; `background` isn't an inherited CSS property) would still show `body`'s original, unoverridden color underneath.

Logos are **not** a CSS concern — `<img src>` can't be changed by a custom property — so `Header`/`Footer` independently call `getPublishedBrandTokens()` (or `getDraftBrandTokens()`, via their own new optional `brandVariant` prop, mirroring `Hero.tsx`'s existing `content`-override pattern) to get the actual resolved logo URL.

### Color validation

`src/server/validate-brand-color.ts` — the one place any brand color is checked, for every mutation. Accepts **only** `#RGB` or `#RRGGBB`; normalizes to uppercase 6-digit form before storage. Rejects everything else outright: `rgb()`/`hsl()`, color keywords, `var()`, `url()`, semicolons/braces, anything resembling a CSS expression. The database only ever stores a flat hex string; `<BrandTokens />` turns that string into a real custom property via React's own style-object serialization — never a hand-built CSS string — so there's no path from a stored value to arbitrary CSS injection.

### Contrast warnings — informational, never blocking

`src/data/contrast.ts` — a small, dependency-free WCAG relative-luminance contrast calculator (~30 lines, no library), run **client-side** in `BrandForm` as colors are picked. Checks text-on-background, muted-text-on-background, and button-text-on-button-background against the WCAG AA 4.5:1 threshold, showing an inline warning when a pair falls short. **Never blocks Save Draft or Publish** — a deliberate, low-contrast combination is still your call to make.

### Admin editor

```
/admin/website/branding        — colors (color-picker + hex pair, never raw CSS variable names),
                          buttons, logo pickers, "currently live" reference, Save Draft, Publish
/admin/website/branding/preview    — admin-authenticated draft preview
```

`ColorField.tsx` pairs a native `<input type="color">` with a free-typing hex text field, kept in sync — you never have to type or understand `--red`/`--black`/etc. `LogoPickerField.tsx` is a single-slot "Choose from Media Library" picker (the same toggle-panel/grid pattern `ProductMediaEditor.tsx` already established for repeatable product media, sized down to one selection) — selecting a thumbnail sets the `mediaAssetId` directly, no path ever typed; a "Use fallback instead" button clears the selection back to the `site_settings` path. `src/config/admin-nav.ts`'s existing "Website" entry already covers this — `/admin/website`'s hub page gained a sixth tile.

### Audit events

`website.brand.draft_saved`, `website.brand.published` — metadata stays small (`{ primaryColor, accentColor }`), never a full palette dump. `website.logo.updated` was proposed at the architecture stage but folded into `website.brand.draft_saved`/`published` instead, since logo selections save and publish as part of the same single brand-row transaction as colors — a separate event would have logged the same moment twice.

### Revalidation

On publish: immediate `revalidatePath()` for the known major routes (`/`, `/store`, `/cart`, `/checkout`) — the exact same fixed list and reasoning already established for Phase 14's navigation publish. Deep dynamic detail routes (`/store/[slug]`, `/work/[slug]`, `/services/[slug]`) rely on their existing `revalidate = 3600` ISR fallback, the same documented, accepted tradeoff — not a new gap Phase 16 introduces.

### Server Actions and session expiration — a discovered edge case, not a code bug

During real acceptance testing, Save Draft and Publish appeared to silently do nothing — no error, no success message, no database change. Investigation (full transcript: the flow was traced end to end, a standalone regression harness replicating `saveBrandDraftAction`'s/`publishBrandAction`'s validation/transaction/audit logic passed 17/17, and the dev server's own request log was inspected) found the actual cause: **the admin's session had gone stale between loading the page and clicking submit**, and `requireAdminUser()` — correctly, per its documented behavior since Phase 12 — called `redirect("/admin/login")` as the very first line of both actions, before any validation or database code ever ran. A page load only proves the session was valid *at that moment*; a Server Action independently re-checks `auth()` itself (Server Actions are not covered by `proxy.ts`'s fast-path redirect — see "Admin foundation"), so a session that expires while a form is being filled out produces exactly this symptom: the mutation silently never starts.

**This is the authorization boundary working as designed, not a defect** — nothing about brand-controls-specific code was ever at fault, confirmed by the regression harness passing cleanly in isolation. The real gap it exposed is a **UX one**: none of `saveBrandDraftAction`, `publishBrandAction`, or any other admin Server Action in this codebase currently distinguishes "your session expired, please sign in again" from "nothing happened" in what's shown back to the admin. **Documented here as a known, minor follow-up for a future phase** — not fixed this phase, since it would touch every existing admin mutation's error-rendering, not just Brand Controls. Signing in again and retrying resolves it immediately; no data is ever at risk, since the redirect happens strictly before any write.

### Live acceptance test — what was genuinely verified

Using your own real edit through `/admin/website/branding` (not seeded, not synthetic): the primary color was changed to **`#E70810`** and saved as a draft → confirmed private (`/admin/website/branding/preview` showed the new color; the public homepage still rendered the original `#D71920` default) → published → the public homepage updated to `#E70810` **with no source edit, no commit, and no redeploy** — verified directly in the rendered HTML (`--red:#E70810`), while `globals.css`'s own `:root` default stayed exactly `#d71920` throughout, proving the value reached the page exclusively through `<BrandTokens>` reading Neon. `/admin/login` was independently checked and shows no trace of the override, confirming admin isolation held. Exactly one `website.brand.draft_saved` and one `website.brand.published` audit event were recorded, both correctly attributed to the real owner account, with small, safe metadata (`{ primaryColor, accentColor }`). Throughout: `homepage_content`, the real `Custom Graphic Design` product, the one real Media Library asset, and the real owner `admin_users` row all stayed untouched, and `customers`/`orders`/`order_lines` stayed at zero. **`#E70810` is your genuine, live, currently-published primary color** — this is real acceptance-test history being documented, not a placeholder value to revert.

### Not built this phase

Typography/font control (exactly one `font-family` declaration exists in the whole site, no web font, no `@font-face` — there's no small, safe control available without building real font-loading infrastructure, confirming the brief's own instinct to leave it code-owned). An arbitrary CSS editor. Font upload. Portfolio/Services admin. AI styling. Obsidian. `.round-button`/`.header-cta` styling remains fully code-owned, by design. A clearer "your session expired" message on admin Server Action failures (see above — a real, minor, documented gap, not specific to Brand Controls).

### Future visual controls (documentation only)

`brand_settings` is shaped so a future phase can extend this same admin without a redesign: typography (a font picker plus real `@font-face`/web-font loading infrastructure would need to be built first — deliberately not started this phase, per the brief's own instinct); `.round-button`/`.header-cta` styling, if ever opened to admin control, would need their own explicit approval since they're intentional design-system outliers, not part of this shared token system; a version-history/rollback view over `brand_settings` (today only "current draft" and "current published" exist, no history log beyond `audit_log`'s own small metadata); and the same clearer session-expiration messaging noted above, generalized across every admin Server Action rather than solved brand-controls-specific. None of this is scheduled — recorded so a future phase doesn't have to re-derive the shape from scratch.

## Services + Portfolio Admin

**Status: Phase 17 is fully complete. Neon is the public runtime authority for both Services and Portfolio, and both have complete admin systems — create, staged draft/publish editing, preview, archive/unarchive, reorder, Media Library integration for hero and gallery — each live-tested against real content (the Branding service and the Product Packaging project). See "Portfolio Admin — complete, a direct mirror of Services Admin" below for the Portfolio-specific write-up.**

### Why this diverges from Product's model — a genuine staged draft/publish system

Product (Phase 13) uses a single row with a `status` field — editing an already-published product changes the live page immediately on save. Services/Portfolio deliberately use a different, richer model: **a permanent-identity entity table plus a versions table holding at most two rows per entity** (`draft`, `published`), so editing an already-published service is completely safe — the public site can never see a draft edit until it's explicitly published.

```
services                          service_versions
├── id (permanent, "service_" +   ├── id (internal row id, uuid)
│     crypto.randomUUID())        ├── serviceId → services.id
├── status: draft|published|      ├── versionType: 'draft' | 'published'
│     archived (ENTITY lifecycle) ├── slug, title, summary, capabilities,
├── sortOrder (immediate, not     │     deliverables, process, ctaLabel,
│     staged)                     │     heroMediaAssetId/heroImageSrc/Alt,
└── createdAt / updatedAt         │     gallery, seo, 8 dormant commerce fields
                                   └── updatedAt
```

`portfolio_projects` / `portfolio_project_versions` are the identical shape, field set matching `Project` (category, services tags, client, year, className, stamp, externalLink, results, credits, seo — `thumbnail` intentionally omitted, confirmed dead/unrendered before the schema was written).

**All editorial content lives on the version row; the entity row holds only what must never be staged: permanent id, lifecycle status, and sortOrder.** This is what makes editing an already-published entity safe by construction, not by convention: a draft save is an `UPDATE ... WHERE service_id = X AND version_type = 'draft'`, and the public site's read path only ever queries `version_type = 'published'` — there is no code path by which a draft edit can reach a live page.

### Permanent entity identity

`services.id` / `portfolio_projects.id` (`service_`/`project_` + `crypto.randomUUID()`) is generated once, at entity creation, and never touched again by any draft save or publish. Both version rows reference it by foreign key (`ON DELETE CASCADE` — a version row has no independent meaning without its parent). Renaming the slug only ever changes a `service_versions.slug`/`portfolio_project_versions.slug` value, never the parent id. Admin routes are ID-based internally (`/admin/services/[id]`, never the slug) for exactly this reason — verified live: Branding's real ID (`service_69d67a4b-8ab8-41da-ad85-c9fd077a7ac4`) stayed identical through a slug-preserving edit, and separately through the earlier cutover-phase regression test's slug-rename-and-publish case.

### Entity-level archive — never touches either version row

`status` on the parent table is the *only* place archived lives. Archiving flips that one column and touches zero version rows — whatever was in the published version row stays exactly as it was, untouched and unreadable publicly (the public query requires `status = 'published'` at the entity level, not just `version_type = 'published'` at the row level). Unarchiving restores public visibility of that same unmodified published content if a published row exists; if the entity was archived before ever being published, unarchiving restores `status = 'draft'` instead — **never accidentally publishing an unpublished draft**. `mutate-service.ts`'s `setServiceArchivedAction` implements exactly this branch, and it's the one place that decides which of the two restore targets applies. Audit events are explicit and distinct: `service.unarchived` is its own action, not folded into `service.updated` the way Phase 15's Media Library unarchive was — a deliberate choice for clearer audit history over copying that precedent.

### sortOrder — immediate, not staged

Lives on the entity table, editable via plain up/down buttons (`ServiceMoveButtons.tsx`), swapping `sortOrder` with the adjacent entity in one transaction. Takes effect immediately on click — reordering is not part of the draft/publish staging model, since staging a reorder alongside content edits was judged unnecessary complexity for a low-risk, easily-reversible action. `moveServiceAction` records `service.reordered` with small metadata (`{ direction, swappedWithId }`).

### Partial slug indexes, and why a global unique constraint doesn't work here

```sql
CREATE UNIQUE INDEX service_versions_slug_draft_unique
  ON service_versions (slug) WHERE version_type = 'draft';
CREATE UNIQUE INDEX service_versions_slug_published_unique
  ON service_versions (slug) WHERE version_type = 'published';
```
(and the `portfolio_project_versions` equivalents.) A single global `UNIQUE(slug)` would reject the seed's own draft+published pair for the same entity, since both start out with identical slugs by design. Two *partial* indexes — one scoped to each version state — solve that, but introduce a real gap: entity A's *published* slug and entity B's *draft* slug live in different partial indexes, so Postgres never compares them against each other. **The database alone does not guarantee a draft slug can never collide across states.**

### Cross-state slug collision — the three-layer answer

1. **DB uniqueness within each version state** — the two partial indexes above, real and enforced.
2. **Authoritative server validation across both states** — `findSlugCollision()` in `mutate-service.ts` queries `service_versions` for the requested slug belonging to any *other* entity (`serviceId <> excludeId`), checking both `draft` and `published` rows in one query. Called before create, before every draft save, and again *inside* the publish transaction immediately before the promote step (a draft can sit unpublished for a while; something else may have taken the slug since it was last saved).
3. **DB unique protection again at publication** — the published partial index is the final backstop if a genuine race slips past step 2; a caught `23505` violation is surfaced as a clean human-readable error, never a raw Postgres exception.

This is documented precisely because it would be inaccurate to claim the database alone prevents cross-state collisions — it doesn't, by design; server-side validation is what closes that gap.

### Seeding — one-time, already run, must not run again

`scripts/seed-phase17-services-portfolio.mts` imports `services`/`projects` directly from the TypeScript source (no hand-transcription) and, for each of the 7 services / 4 projects, inserted one entity row plus **identical** draft and published version rows — so the first DB-backed render was byte-identical to what was live immediately before cutover, and a private draft existed to edit from the very first moment. **This script has already run successfully once.** It refuses to run a second time by design — `assertDestinationTablesEmpty()` checks all four destination tables before opening any transaction, and all four now hold real rows (7/14/4/8), so that check fails immediately. The script is retained (not deleted) as migration/bootstrap history, matching how `drizzle/` migration files are kept permanently — but it is inert going forward, not part of the running application, and must not be run again.

### Neon is the public runtime authority; services.ts/projects.ts are frozen fallback

`src/data/services.ts`'s `services` array and `src/data/projects.ts`'s `projects` array are retained **unmodified**, but **no public or admin runtime path reads either array anymore** — verified by direct grep, not just intent. They keep their types, constants (`PROJECT_CATEGORIES`, `SERVICE_STATUSES`, etc.), and pure helpers (`serviceImagePath`, `projectImagePath`, `serviceHref`, `projectHref`, `slugify` reused from `products.ts`), all still genuinely used. The arrays themselves serve two purposes only: they were the seed script's literal source, and they remain a frozen historical reference. This is a deliberate, more conservative choice than Phase 13's product migration (which deleted `product.template.ts` in the same phase as cutover) — actual deletion of the arrays is deferred to a later cleanup phase, once the admin flow has had more real-world use.

Both `Service` and `Project` gained small, **purely additive** type extensions to support this: `id?: string`, `status?: "draft"|"published"|"archived"` (new for `Service`, which previously had no status concept at all; widened for `Project`, which previously only had `"published"|"draft"`), and `mediaAssetId?: string` on `ServiceImage`/`ProjectImage` (the same optional-field extension Phase 15 made to `Media`). Every field is optional, so all 7 existing service entries and all 4 existing project entries in the frozen arrays needed **zero edits** — the extension doesn't touch content, only widens the type.

### `/services` and `/work` runtime cutover

`src/server/queries/services.ts` and `src/server/queries/portfolio.ts` are the sole places anything in the app reads a Service/Project from Neon (public side) — they mirror `queries/catalog.ts` exactly: `INNER JOIN` entity to its `version_type = 'published'` row, `WHERE entity.status = 'published'`, ordered by `sortOrder`, widened `string` columns narrowed back to real union types. Both `/services/[slug]/page.tsx` and `/work/[slug]/page.tsx` switched `dynamicParams` from `false` to `true` (a service/project published since the last build now renders on first request instead of 404ing) and added the same `revalidate = 3600` time-based ISR fallback Product/Store already use — no admin mutation UI existed for Portfolio at cutover time to call `revalidatePath()` directly, so this fallback is what will pick up any direct-database Portfolio content change until Portfolio Admin ships; Services Admin's mutations *do* call `revalidatePath()` directly (see below), same as Product. `Services.tsx`/`Portfolio.tsx` (the homepage sections) became async server components reading the same query modules, mirroring the exact pattern Header/Footer/Hero already established in Phase 14. `getAdjacentProjects()` preserves the exact wrap-around prev/next semantics the old array-backed version had, walking the Neon-ordered (`sortOrder`) list instead of array order — identical behavior immediately after cutover since `sortOrder` was seeded directly from each array's original position.

`ProductDetails.tsx` (rendered on the public `/store/[slug]` page) is the one place outside `/services`/`/work` themselves that read the services array — it resolves a product's `relatedServiceSlug` to show a "related service" link — and is now an async component calling the Neon-backed `getServiceBySlug()`.

### Media Library resolution for Services/Portfolio

`resolveServicesMedia()`/`resolveProjectsMedia()` in the respective query files are direct copies of `resolveProductsMedia()`'s batch-lookup-and-override pattern, extended to also cover the separate `heroImageSrc`/`heroImageAlt`/`heroMediaAssetId` scalar-column shape (not just gallery JSONB arrays). Any `heroImage`/gallery item carrying a `mediaAssetId` has its `src` overridden with the asset's *current* `media_assets.url` before reaching a page component; items with no `mediaAssetId` (every current service/project, post-seed) pass through unchanged, preserving legacy local paths exactly.

### Media Library "Used by" — extended to services and portfolio

`findServicesReferencingMediaAsset()`/`findProjectsReferencingMediaAsset()` in `queries/media.ts` check both `heroMediaAssetId` (a plain column) and gallery (JSONB containment, same `@>` operator as `products.media`) — but unlike Product's single-row usage scan, these check **both** `draft` and `published` version rows and tag each result with which one it came from, since a private draft's media selection is real usage an admin should see before archiving an asset, even though it isn't public yet. `/admin/media/[id]`'s "Used by" block now merges product/service/portfolio results; a published service/project links to its real public page, while a draft-only match shows a label with no link (there's no `/admin/services/[id]` preview link surfaced from there yet, and a private draft has no public URL to link to regardless).

### Services Admin — routes and UX

```
/admin/services              — list: every entity, any status, plain unpaginated table (7 rows today)
/admin/services/new           — create (draft only, never public)
/admin/services/[id]           — detail: "Currently live" vs. "Private draft" side by side, Publish, Archive/Unarchive
/admin/services/[id]/edit        — edit the DRAFT version
/admin/services/[id]/preview       — admin-authenticated draft preview, reuses the real public components
```

No `<select>` elements anywhere in `ServiceForm.tsx` — Service has no category/status field exposed in the form (status is handled entirely by the separate archive/unarchive toggle) — so the Phase 13 "every `<select>` must be controlled" rule has nothing to apply to here. Repeatable arrays (`capabilities`, `deliverables`, `process`, `gallery`) use plain add/remove/move-up/move-down controls (`StringListEditor.tsx`, `ProcessStepsEditor.tsx`, `ServiceGalleryEditor.tsx`) — no drag-and-drop dependency, matching `NavigationForm.tsx`'s established precedent. Hero image (`ServiceHeroField.tsx`) is a single-slot Media Library picker plus manual-path fallback, mirroring `ProductMediaEditor.tsx`'s dual-path pattern. No raw JSON is ever shown to the admin.

### Create → draft → preview → publish → archive/unarchive — the full lifecycle

- **Create**: one permanent id, entity `status = 'draft'`, exactly one draft version row, **no published row** — never publicly visible. Slug checked against the cross-state collision rule before insert. Audit: `service.created`.
- **Save draft**: always writes only the `version_type = 'draft'` row. The published row (if any) and every public route are untouched by construction — verified in the real acceptance test: the published summary stayed exactly the original text through a Save Draft that changed the draft's summary. Audit: `service.draft_saved`.
- **Preview**: `/admin/services/[id]/preview` reuses the exact same public components (`ServiceHero`, `ServiceCapabilities`, `ServiceDeliverables`, `ServiceProcess`, `ServiceCTA`, plus `Header`/`Footer`/`BrandTokens`) the live `/services/[slug]` page renders, passed the draft data — not a reconstruction. Requires admin authentication (inside the protected route group); never a public/guessable URL.
- **Publish**: one transaction — re-check the slug collision, copy every content column from draft to published (creating the published row on first publish), flip entity `status` to `'published'`, audit `service.published`, then `revalidatePath()` for `/`, the old slug (if renamed), the new slug, and the admin list/detail pages.
- **Archive/Unarchive**: entity-level only, as described above. `ServiceArchiveToggle.tsx` mirrors `MediaStatusToggle.tsx`'s exact single-fieldless-button pattern.

Every mutation in `mutate-service.ts` independently calls `requireAdminUser()` as its first line — not relying on the protected layout's own check, per the rule established since Phase 12. Validation failures inside a transaction are thrown as a typed `ServiceMutationError` (guaranteeing rollback) and caught outside to produce a clean, human-readable error — never a raw Postgres exception reaching the admin form.

### Product Admin cleanup — `relatedServiceSlug` now checks Neon

`products.validate.ts`'s `ProductValidationOptions` gained `validServiceSlugs: readonly string[]`, passed in by the caller rather than importing `services.ts`'s array directly — the same "passed in, not imported" principle already used for every other enum list in that type (avoids a runtime dependency on any specific data source, live or frozen). `mutate-product.ts`'s `validateCandidate()` is now `async`, calling `getPublishedServices()` before validating — **only a currently-published service is a valid `relatedServiceSlug` target**. Both Product Admin dropdown pages (`/admin/products/new`, `/admin/products/[id]/edit`) now fetch `getPublishedServices()` instead of importing the frozen array. No other Product Admin behavior changed.

### Dormant commerce fields — preserved, never surfaced, never silently zeroed

`startingPrice`, `pricingNote`, `turnaround`, `revisions`, `depositAmount`, `purchasable`, `intakeFormSlug`, `cartEligible` do not appear anywhere in `ServiceForm.tsx` or `build-service-form.ts` — there is nothing in the admin form to read these from. `mutate-service.ts`'s `contentToColumns()`/`extractContentColumns()` never reference these 8 columns, so a draft save's `UPDATE` statement simply never touches them — whatever a row already holds (currently `NULL` for all 7 real services) stays exactly as it is. This is structural, not a validation rule: there's no code path that could zero them even by accident, since the columns never appear in any `.set({...})` call this admin makes.

### Real acceptance test — what was genuinely verified

Using your own real edit through `/admin/services` (not seeded, not synthetic): the Branding service's summary was changed to *"Bold brand identity systems built with purpose — from unforgettable logos and typography to signature color palettes and creative direction that keeps your brand consistent, recognizable, and impossible to ignore across every touchpoint."*, saved as a draft, confirmed private (public `/services/branding` still showed the original summary), previewed, and published — the public page updated to the new summary with no source edit, no commit, no redeploy. **A real bug was found and fixed along the way, and it wasn't a code defect**: the first Publish click produced no effect at all (no error, no audit event) — traced to the same session-staleness pattern documented under "Brand Controls" (`requireAdminUser()` correctly redirecting to `/admin/login` because the session had gone stale between page load and the Publish click, before any validation or write code ran). A second Publish click from a freshly-authenticated page succeeded immediately, with no code changes in between — confirming the mutation logic itself was never at fault. Exactly one `service.draft_saved` and one `service.published` audit event exist for this edit, both correctly attributed to the real owner account. **The published Branding summary above is your genuine, live, currently-published copy — real acceptance-test history, not a placeholder to revert.** Throughout: all other 6 services, all 4 portfolio projects, Brand `#E70810`, homepage content, the real Custom Graphic Design product, the one real Media Library asset, and the owner account all stayed untouched, and `customers`/`orders`/`order_lines` stayed at zero.

### Automated regression testing

Since `mutate-service.ts` imports `requireAdminUser()` (which pulls in `next/navigation`, needing live React Server render context unavailable to a standalone script — the same constraint documented under "Brand Controls"), the regression harness combined the *real* read layer (`queries/services.ts`, imported directly — safe, since it has no `next/navigation` dependency) with faithful replications of the mutation layer's exact transaction/audit logic, plus real HTTP requests against a running dev server for every public-visibility claim. 28/28 checks passed: draft-only 404, save-draft leaves published untouched, preview resolves draft, cross-state collision detection, invalid-content rejection, own-entity rename correctly not a false positive, publish copies complete content, first-publish creates the published row, permanent ID stability, old-slug-404/new-slug-200 after a rename, archive/unarchive (including the never-published draft-only case correctly not auto-publishing), reorder swap, Media Library hero/gallery resolution, and correct audit attribution. All temporary entities, versions, and audit rows were deleted immediately after.

## Portfolio Admin — complete, a direct mirror of Services Admin

**Status: a complete Portfolio Admin exists — create, staged draft/publish editing, preview, archive/unarchive, reorder, Media Library integration for hero and gallery — live-tested against a real project (Product Packaging). Phase 17 (database foundation, public runtime cutover, Services Admin, Portfolio Admin) is now fully complete.**

```
/admin/portfolio              — list: every entity, any status (protected)
/admin/portfolio/new           — create (draft only, never public) (protected)
/admin/portfolio/[id]           — detail: currently-live vs. private-draft, publish, archive/unarchive (protected)
/admin/portfolio/[id]/edit        — edit the DRAFT version (protected)
/admin/portfolio/[id]/preview       — admin-authenticated draft preview (protected)
```

Every architectural decision Services Admin made was reused verbatim rather than re-derived: permanent `project_` + `crypto.randomUUID()` identity (never the slug) for admin routing; `portfolio_projects` (entity — permanent id, lifecycle `status`, immediate non-staged `sortOrder`) + `portfolio_project_versions` (draft/published content rows, `UNIQUE(projectId, versionType)`); Save Draft writes only the `version_type = 'draft'` row, so the published row and every public route are untouched by construction; Publish is one transaction that re-checks the slug collision, copies the complete draft content onto the published row (creating it on first publish), flips entity `status` to `'published'`, audits, and revalidates; archive/unarchive is entity-level only, never touching either version row, with the same never-published-draft-doesn't-auto-publish unarchive branch Services established; reorder is immediate, entity-level, plain up/down buttons swapping `sortOrder`.

### Three-layer slug collision protection — identical strategy

`findSlugCollision()` in `mutate-portfolio.ts` is a direct copy of `mutate-service.ts`'s version: checks both `draft` and `published` `portfolio_project_versions` rows belonging to any *other* project, called before create, before every draft save, and again inside the publish transaction. The two partial unique indexes (`portfolio_project_versions_slug_draft_unique`, `portfolio_project_versions_slug_published_unique`) remain the final database-level backstop. Live-verified during Product Packaging's real acceptance test and exhaustively covered in automated regression testing (cross-state collision correctly rejected; an entity's own matching draft/published slug correctly does not false-positive).

### Fields — the complete Project content model, admin-editable

`slug`, `title`, `shortTitle`, `summary`, `fullDescription`, `client`/`year` (plain optional text, never fabricated if blank), `featured` (staged — draft-only until publish), `stamp` (free text), SEO title/description — all plain inputs/textareas, same shape as Services. Three fields get dedicated treatment:

- **`category`** — a controlled `<select>` over `PROJECT_CATEGORIES` (Branding, Packaging, Print Production, Events, Promotions, Web Design, Graphic Design).
- **`className` ("Card style")** — a controlled `<select>` limited to exactly three options (labeled "Red"/"Dark"/"Cream" in the admin, mapping to `project-red`/`project-dark`/`project-cream`) — the complete, exhaustive set of real CSS variants defined in `globals.css`. Never free text; a typo'd class name would silently break styling with nothing to catch it. Both `category` and `className` follow the Phase 13 "every `<select>` must be controlled" rule.
- **`services`** — a free-form descriptive-tag list (e.g. "Brand identity development"), reusing `StringListEditor.tsx` completely unmodified. Deliberately **not** a link to the Services catalog — matches the existing, pre-Phase-17 behavior documented under "Categories and services" exactly.

`thumbnail` is **not exposed anywhere in the admin** — confirmed dead/unrendered before the schema was even written (see "Portfolio Admin — Architecture Report"), intentionally excluded from `portfolio_project_versions`.

### Media — hero, gallery, and the fields that don't exist

`PortfolioHeroField.tsx` (single-slot Media Library picker + manual-path fallback) and `PortfolioGalleryEditor.tsx` (repeatable, same picker per item, plus add/remove/move-up-down) are direct mirrors of `ServiceHeroField.tsx`/`ServiceGalleryEditor.tsx`, adapted for `ProjectImage`'s shape. One real difference: `PortfolioGalleryEditor.tsx` exposes a **`lightBackground` checkbox** per gallery item — a genuine, rendered field (`ProjectGallery.tsx` uses it to switch a gallery tile off the default dark background) that `ServiceImage` has no equivalent of, so it wasn't part of the Services mirror. `ProjectImage` has **no `caption` field** — confirmed by inspection before building anything, not assumed — so the gallery editor exposes exactly what exists (alt text, light-background toggle, Media Library selection) and nothing invented.

`externalLink` (optional, single `{label, url}` pair — `PortfolioExternalLinkField.tsx`, not repeatable), `results` (repeatable `{label, value}` — `ResultsEditor.tsx`), and `credits` (repeatable `{role, name}` — `CreditsEditor.tsx`) all follow the same plain add/remove/move-up-down pattern, no drag-and-drop, no raw JSON ever shown. `externalLink.url` is validated server-side by `validateHref()` — reused directly from `src/server/validate-website-content.ts` (the exact same function protecting every other admin-editable href in this codebase) rather than duplicated, since `projects.validate.ts` deliberately stays free of any `server-only` import (it's still used to guard the frozen fallback array at module load) — the URL-safety check lives in the mutation layer instead, alongside the Neon-specific slug-collision check.

### Validator fix — the same Media Library bypass Services already needed

`projects.validate.ts`'s `checkImagePath()` previously rejected *any* non-local `src`, which would have incorrectly rejected a Media Library selection's `https://` Blob URL. Fixed with the identical bypass `services.validate.ts` already has: the local-path/folder check is skipped whenever a `mediaAssetId` is present. Also added: structural validation for `results` (`label`/`value` required per entry) and `credits` (`role`/`name` required per entry), mirroring the `process`-step validation already added to `services.validate.ts` — the same "collect everything, return inline" philosophy, extended rather than duplicated.

### Placeholder honesty — preserved, untouched

Crash the Stove's and Mental Town Exotics' placeholder galleries were never touched by any part of this build. Automated regression testing specifically verified placeholder-style alt text round-trips through the admin's save/read path completely unchanged (using a temporary test entity, never the real projects) — confirming the admin doesn't silently rewrite or normalize placeholder language. The real Crash the Stove and Mental Town Exotics rows remain exactly as seeded; either can be edited normally through `/admin/portfolio` like any other project whenever real photography arrives, at which point the honest "not yet published" placeholder language is expected to be deliberately replaced by you, not by any automated process.

### Audit events

`portfolio.created`, `portfolio.draft_saved`, `portfolio.published`, `portfolio.archived`, `portfolio.unarchived`, `portfolio.reordered` — same shape, same small non-sensitive metadata, same transactional (mutation + audit commit or roll back together) discipline as every `service.*` event.

### Real acceptance test — what was genuinely verified

Using your own real edit through `/admin/portfolio` (not seeded, not synthetic): Product Packaging's summary was changed to *"Bold, production-ready packaging designed to stand out, strengthen brand recognition and perform under real-world printing and application demands."*, saved as a draft, confirmed private (public `/work/product-packaging` still showed the original summary), previewed, and published — the public page updated to the new summary with no source edit, no commit, no redeploy. Unlike the Services acceptance test, this one succeeded cleanly on the first real attempt — no session-staleness repeat needed. Exactly one `portfolio.draft_saved` and one `portfolio.published` audit event exist for this edit, both correctly attributed to the real owner account, with no duplicate project or version rows. **The published Product Packaging summary above is your genuine, live, currently-published copy — real acceptance-test history, not a placeholder to revert.** Throughout: SP Juices, Crash the Stove, and Mental Town Exotics stayed untouched; all 7 Services (including the real Branding summary change from the Services acceptance test) stayed untouched; Brand `#E70810`, homepage content, the real Custom Graphic Design product, the one real Media Library asset, and the owner account all stayed untouched; `customers`/`orders`/`order_lines` stayed at zero.

### Automated regression testing

Same approach as Services: the real read layer (`queries/portfolio.ts`, imported directly) combined with faithful replications of `mutate-portfolio.ts`'s exact transaction/audit logic, plus real HTTP requests against a running dev server for public-visibility claims. Never touched SP Juices, Crash the Stove, Product Packaging, or Mental Town Exotics — every test used clearly `test-phase17-pf-`-prefixed temporary entities. 39 checks run; 38 passed outright, and the one apparent failure ("featured toggle takes effect on homepage after publish") was investigated rather than dismissed: the real cause was the test entity's high `sortOrder` placing it *after* the 3 real featured projects (SP Juices, Crash the Stove, Product Packaging — exactly filling `MAX_FEATURED_PROJECTS = 3`), so it could never appear in the homepage's capped list regardless of whether publish worked correctly. A follow-up check confirmed the underlying mechanism directly (bypassing the cap): the `featured` flag does propagate from draft to published correctly on publish — not a defect, a test-harness artifact, found and confirmed rather than silently assumed. Coverage included: draft-only 404, save-draft isolation, preview resolving draft, cross-state collision (and the own-entity non-false-positive), publish content-copy fidelity, first-publish creating the published row, permanent ID stability through a slug rename, old-slug-404/new-slug-200, archive/unarchive (including the never-published draft-only case), reorder, Media Library hero/gallery resolution, gallery order and `lightBackground` round-tripping, placeholder-style text surviving unchanged, `externalLink`/`results`/`credits` round-tripping, and correct audit attribution. All temporary entities, versions, and audit rows deleted immediately after — confirmed via a fresh query showing zero leftover `test-%` rows.

### Frozen source arrays — still retained, still not runtime authorities

`src/data/services.ts`'s `services` array and `src/data/projects.ts`'s `projects` array remain in the codebase, unmodified, for both Services and now Portfolio. **Neon is the sole runtime authority for both** — no public or admin code path reads either array. They're kept as frozen bootstrap/history references only (the seed script's literal source, and a historical record of pre-migration content) — not because anything still depends on them. They can be removed in a later cleanup phase, once there's no remaining reason to keep the historical seed/reference value around; that decision is deliberately deferred, not scheduled here.

### Phase 17 — now fully complete

Database foundation (staged draft/publish schema, partial slug indexes) → seed script → public runtime cutover (`/services`, `/work`, homepage sections reading from Neon) → Services Admin → Portfolio Admin. All four pieces are live-tested against real content: the real Branding service edit and the real Product Packaging project edit are both genuine, current, permanently-published changes — not placeholders, not reverted.

## Leads + Contact Form Admin (Phase 18A)

**Status: the public Contact Form is a real Neon-backed lead-submission flow (no longer mailto-only), with a full Leads Admin — list, detail, status, archive, internal notes.** This is the first phase of turning the admin into a lightweight business operating system: **Lead → Customer → Order** (see "Customers + Manual Orders Admin (Phase 18B)" below for the rest of that chain).

### `leads` — operational business data, not published content

Deliberately does **not** use the Phase 17 staged draft/publish model — nothing about a lead is ever "public." Uses a plain `uuid` primary key (matching `customers`/`orders`/`order_lines`/`admin_users` — the "business record" family), not the `service_`/`project_` text-prefix convention those content-entity tables use. Schema (`src/db/schema.ts`): `id`, `name`, `email` (normalized trim+lowercase, **not** unique — a second genuine inquiry from the same person is a new, separately trackable record, not a duplicate to collapse), `phone`/`company` (nullable), `requestedService` (frozen snapshot of the contact form's service dropdown at submission time, free text — not a foreign key), `message`, `source` (defaults `'website-contact-form'`, free text, room for `'phone'`/`'instagram'`/`'manual'` later with no schema change), `status` (`'new' | 'contacted' | 'qualified' | 'won' | 'lost'`, defaults `'new'`), `archivedAt` (nullable timestamp — **orthogonal to `status`**, not a 6th status value, per explicit approval: a lead can be archived from any funnel stage without losing what stage it was actually in, the identical reasoning already applied to `orders.status` vs. `orders.paymentStatus`), `customerId` (nullable FK to `customers`, `ON DELETE SET NULL`, set only by an explicit admin action — never automatically, and never as a side effect of a status change reaching `"won"` — see Phase 18B below), `createdAt`/`updatedAt`.

### `submitLeadAction` — the ONE public unauthenticated write path

`src/server/submit-lead.ts`, deliberately isolated in its own file, physically separate from `src/server/mutate-lead.ts` (every export there independently calls `requireAdminUser()`) — so the one place accepting a write from an unauthenticated visitor is obvious at a glance, not buried among authenticated ones.

- **Honeypot** — a hidden `website` field (absolutely positioned off-screen in `ContactFormFields.tsx`, `tabIndex={-1}`, `autoComplete="off"`, never `display:none`/`type="hidden"`, which bots specifically know to skip) that a real visitor never fills. A filled honeypot fails **silently** from the bot's perspective: returns `{status:"success"}`, creates zero rows, never reveals detection.
- **Same-email cooldown** — `COOLDOWN_MINUTES = 2` (a named constant): a second submission from the same normalized email within the window is rejected with a reassuring message ("we already got your message"), not an error-sounding one, since it reads correctly whether the second attempt was a bot or a genuine double-submit. Computed via a plain JS `Date` threshold against `leads.createdAt`, not raw SQL interval syntax.
- **Validation**: `validateRequiredText`/`validateEmailShape`, reused directly from `src/server/validate-website-content.ts` — no new validator built.
- **Honesty**: never claims "email sent" — the success message says the message was received and the business will follow up. A persistent, always-visible secondary `mailto:` link (`contactEmail` from `site_settings`) remains available regardless of submission success, matching the exact "always offer a real fallback" principle Checkout's `POST /api/orders` already established.
- Errors are logged safely — only that an attempt failed, never the full name/email/message payload.

### Contact Form — server/client split

`ContactForm.tsx` is now a thin **async server component**: reads `getContactContent()`/`getSiteSettings()` from Neon (unchanged from Phase 14), then renders `ContactFormFields.tsx` (the new client component owning the actual `<form>`, `useActionState(submitLeadAction, null)`). Optional `phone`/`company` fields were added to the form (labels/placeholders live in `src/data/homepage.ts`'s `contact.form`, alongside the existing name/email/service/message fields) — the visual design is otherwise **unchanged**, per explicit instruction: no redesign, only the underlying submission mechanism changed.

### `/admin/leads` and `/admin/leads/[id]`

Mirrors the Orders/Customers admin list/detail pattern exactly: `LeadsFilterBar.tsx` (native `<form method="GET">`, no client JS — status filter, archived filter [`all`/`exclude`/`only`], search by name/email/company), `AdminPagination`, `StatusBadge`. Detail page shows every field (name/email/phone/company/requestedService/message/source/createdAt/updatedAt/archivedAt) — all admin-only, never exposed publicly.

- **Status** (`LeadStatusForm.tsx`) — immediate, not staged (leads are operational records, not published content). Controlled `<select>` per the Phase 13 rule. Audited as `lead.status_changed`, metadata `{from, to}` only.
- **Archive** (`LeadArchiveToggle.tsx`) — single fieldless button, mirrors `ServiceArchiveToggle.tsx`'s exact pattern. Toggles `archivedAt` between `null` and `new Date()`, **never touches `status`** — archiving preserves whatever funnel stage the lead was actually in. Audited as `lead.archived`/`lead.unarchived`, empty metadata.
- **Notes** — see "Shared Notes UI" under Phase 18B below (originally a lead-only `LeadNoteForm.tsx`, generalized in Phase 18B into `NoteForm`/`NotesList` and reused by customers/orders too).

### Audit events

`lead.status_changed` (`{from, to}`), `lead.archived`/`lead.unarchived` (`{}`), `lead.note_added` (`{}` — **never** the note body). No PII (name/email/phone/company/message) in any audit metadata, matching the standing rule for every audit event in this codebase.

### Dashboard

`/admin` gained **New Leads** and **Needs Follow-up** counts (`getLeadStatusCounts()` — "needs follow-up" = `new` + `contacted`, non-archived only). No fake/seeded metrics; an empty table correctly shows zero.

### Security

`submitLeadAction` is the only unauthenticated write in the whole leads/customers/orders system. Every other mutation (`setLeadStatusAction`, `setLeadArchivedAction`, `addLeadNoteAction`) independently calls `requireAdminUser()` as its first line, per the standing rule since Phase 12 — Server Actions aren't covered by the protected layout's own check.

### Real acceptance test — what was genuinely verified

Using your own real inquiry through the public homepage contact form (not seeded, not synthetic): the submission succeeded with the honest, non-"email sent" success message; the lead appeared in `/admin/leads`; a status change, an archive/unarchive cycle, and a genuine internal note were all performed by you and correctly persisted with correct audit attribution to the real owner account. This lead and its note are **real, legitimate business data** — not test data, never deleted, never touched by any of the automated regression suites in this phase or Phase 18B.

## Customers + Manual Orders Admin (Phase 18B)

**Status: the full Lead → Customer → Manual Order / Project → Work Status → Payment Status → Internal Notes workflow is complete and live-tested against your own real conversion.** Big Red Creative Productions can now manage real customers and manually create/manage projects from the admin without the customer going through website checkout.

### Migration `0009_kind_proteus.sql` — the Phase 18 database foundation

Applied before any Phase 18A/18B code was written. Added: the `leads` table (see above), the generic `notes` table (see "Shared Notes UI" below), `orders.paymentStatus` (`text`, default `'unpaid'`), and made `order_lines.productSlug` **nullable** (a manual/custom line item has no meaningful slug — leaving it `null` is the honest choice over synthesizing a fake one; `productId` was already nullable since Phase 13's `ON DELETE SET NULL` FK restoration). `orders.status` stayed plain `text` — no SQL change was needed to widen its allowed values (see below); this migration only added the new `paymentStatus` column alongside it.

### Migration `0010_fantastic_mephistopheles.sql` — `order_lines.description`

One statement: `ALTER TABLE "order_lines" ADD COLUMN "description" text;` — nullable, no default. Added specifically so a manual line item can carry a clean short `productTitle` (e.g. "Custom Packaging Design") **and** a separate, optional longer scope (e.g. "Front/back pouch design, print-ready production files, 2 revision rounds, and final CMYK exports") without overloading one field with both. `productTitle` remains the required short name for every line — catalog-derived or manual. Checkout-created order lines never populate this column (`create-order.ts` was not touched) — it stays `null` for every historical checkout order line, exactly as it always has.

Both migrations were generated, reviewed, and explicitly approved via the full disclosure protocol (proposed SQL, column type/nullability/default, destructive-operation analysis, confirmation that 0000–0008 remained byte-unchanged, confirmation the migration hadn't been applied, confirmation no real data was touched) before `db:migrate` ever ran. **Migrations 0000–0009 were never rewritten** — 0010 is a new, additive-only file, per the project's standing migration-immutability rule.

### `src/data/orders.ts` — the approved 8-value work-status lifecycle

`ORDER_STATUSES` widened from the original 5-value checkout-only set (`draft | submitted | needs-review | confirmed | cancelled`) to the approved 8-value creative-project lifecycle:

```ts
draft, needs-review, submitted, approved, in-progress, awaiting-client, completed, cancelled
```

`buildOrderDraft()` (the checkout path, unchanged) only ever writes `"needs-review"` or `"submitted"` — both remain valid members of the widened set, so this was **not** a behavior change for checkout, only an enabling change for the new admin-driven manual-order lifecycle. `"confirmed"` no longer exists (replaced by `"approved"`) — the dashboard's stale reference to it was found and fixed as part of this phase (see Dashboard below).

An explicit, fixed **transition table** (`ORDER_STATUS_TRANSITIONS`) is the sole authority for what status changes are allowed — never an arbitrary jump:

```
draft            → needs-review, submitted, cancelled
needs-review     → submitted, cancelled
submitted        → approved, needs-review, cancelled
approved         → in-progress, cancelled
in-progress      → awaiting-client, completed, cancelled
awaiting-client  → in-progress, completed, cancelled
completed        → (terminal)
cancelled        → (terminal)
```

`isValidOrderStatusTransition(from, to)` is checked both in `OrderStatusForm.tsx` (which only ever *offers* a valid next status, via `ORDER_STATUS_TRANSITIONS[currentStatus]`) and — authoritatively — inside `setOrderStatusAction`'s transaction. A terminal status renders no status-change form at all.

### Payment status — a fully independent axis, tracking only

```ts
export const PAYMENT_STATUSES = ["unpaid", "deposit-paid", "paid-in-full", "refunded"] as const;
```

```
unpaid        → deposit-paid, paid-in-full
deposit-paid  → paid-in-full, refunded
paid-in-full  → refunded
refunded      → (terminal)
```

Same `isValidPaymentStatusTransition()` pattern, same `OrderPaymentStatusForm.tsx` UI pattern. **No Stripe, no payment processor, no charge/refund API of any kind** — this is purely an admin-set label recording the project's current payment state, exactly like `orders.status` records its current work state. `orders.paymentStatus` defaults to `'unpaid'` on every order regardless of channel.

### Customers Admin

```
/admin/customers              — list: search, pagination (existing, extended)
/admin/customers/new           — create (new)
/admin/customers/[id]           — detail: linked leads, linked orders, notes (existing, extended)
/admin/customers/[id]/edit        — edit contact info (new)
```

`customers` already had every field this admin needed (`firstName`, `lastName`, `email` — unique, normalized — `phone`, `company`, `createdAt`, `updatedAt`) — **no migration was required for the Customers table itself**, only new admin code (`src/server/build-customer-form.ts`, `src/server/mutate-customer.ts`).

**Duplicate protection**: `customers_email_unique` remains the real, race-safe database backstop. Every create path (manual, or via "Create Customer from Lead") does a proactive `SELECT`-by-normalized-email **inside the same transaction** before inserting — mirroring `create-order.ts`'s own find-or-create pattern — so a duplicate returns a clear, specific error ("a customer with this email already exists — view it at /admin/customers/&lt;id&gt;") instead of a raw constraint violation. A stray race that slips past the proactive check is still caught via `isUniqueViolation(error, "customers_email_unique")`, the same helper `mutate-product.ts` already established for slug collisions. **Never silently merges, never silently overwrites an existing row.**

`getCustomerById()` (`src/server/queries/customers.ts`) now also returns `updatedAt`, every `leads` row with `customerId` pointing at this customer, and every `notes` row (`entityType: "customer"`) via `getNotesForEntity()`. `searchCustomers()` is a small, uncapped-pagination search helper (top 5 matches) purpose-built for the inline "Link Existing Customer" picker on the lead detail page — deliberately narrower than the full `listCustomers()`.

### Lead → Customer

On `/admin/leads/[id]`, once a lead has no linked customer yet:

- **Create Customer from Lead** — a link to `/admin/customers/new?fromLead=<id>`, which **prefills** the create-customer form from the lead's data (`splitLeadName()` in `build-customer-form.ts`: first word → `firstName`, remainder → `lastName` — an honest heuristic, not a final answer) but writes **nothing** until the admin reviews/edits and explicitly submits. The actual customer-insert-plus-lead-link happens inside `createCustomerAction`'s **one transaction** when a hidden `fromLeadId` field is present: re-verify the lead isn't already linked → check the normalized-email duplicate → insert the customer → set `leads.customerId` (+ `updatedAt`) → `recordAuditEvent("customer.created", {source:"lead"})` → `recordAuditEvent("lead.customer_linked", {customerId})` — all commit or roll back together.
- **Link Existing Customer** — a native `<form method="GET">` search (name/email/company, reusing `searchCustomers()`) rendered inline on the lead page; each result row is its own tiny form bound via `linkExistingCustomerAction.bind(null, leadId, customerId)` (`LinkCustomerButton.tsx`, mirroring `LeadArchiveToggle.tsx`'s single-fieldless-button pattern) — no client-side customer-search JS at all. `src/server/mutate-lead-customer.ts` is a deliberately separate file from both `mutate-customer.ts` (customer-only actions) and `mutate-lead.ts` (lead-only actions), since "link an *existing* customer to a lead" is a genuinely cross-entity action. Re-checks the lead isn't already linked (`ALREADY_LINKED`) inside the transaction — **double-linking is impossible**, not just discouraged by the UI.
- **View Customer** / **Create Order for Customer** — once linked, plain links to `/admin/customers/[id]` and `/admin/orders/new?customerId=[id]`.

**The original lead is never rewritten** — linking only ever touches `leads.customerId`/`updatedAt`; name/email/phone/company/message/source/status/archivedAt are untouched forever. Linking a lead to a customer **does not** automatically change `lead.status` — reaching "won" is a separate, explicit admin decision, never an automatic side effect of linking.

### Manual Orders / Project Management

```
/admin/orders               — list: work-status filter, payment-status filter, search, pagination (existing, extended)
/admin/orders/new            — create (new)
/admin/orders/[id]            — detail: full pricing/status/notes (existing, extended)
/admin/orders/[id]/edit         — draft-only line-item editor (new)
```

`/admin/orders/new` is a two-step, JS-free flow: pick a customer (either preselected via `?customerId=`, linked from a customer/lead page, or found through an inline native-GET search identical in spirit to the lead page's customer search — each result is a plain link, no mutation happens at this step), then fill in line items via the client `OrderForm.tsx` (`useActionState(createManualOrderAction, ...)`, matching every other real admin form's pattern).

### Manual order line items — physical/service, never a fake product reference

Each line, edited via `OrderLineItemsEditor.tsx` (a repeatable array editor mirroring `ProductOptionsEditor.tsx`'s exact local-state/add-remove/serialize-to-one-hidden-JSON-field pattern): an optional **catalog product** picker (selecting a published product prefills the title — still editable — and sets `productId`/`productSlug`; leaving it "Custom item" leaves both `null`), a required **title**, an optional **description** (the new `order_lines.description` column), a controlled **Type** `<select>` (**Physical** / **Service**, defaulting to Service but never silently forced to it — the whole reason this was called out explicitly: `order_lines.productType` is plain `text` with no DB-level CHECK constraint, and `PRODUCT_TYPES = ["physical", "service"]` in `src/data/products.ts` already models exactly this distinction, so no schema change was needed — the admin UI just needed a real, controlled, two-way selector instead of assuming one value), **quantity** (whole number, minimum 1), and **unit price** (dollars in the UI, converted via the existing `dollarsToCents()`).

**For a custom/manual line, `productId` and `productSlug` are both `null` — never a fake/synthesized identifier.** `order_lines.productId` keeps its real `ON DELETE SET NULL` FK to `products` (confirmed live during automated testing: a synthetic non-existent product id was correctly **rejected** by the database's `order_lines_product_id_products_id_fk` constraint — proving the FK is real and enforced, not just documented).

### Money — integer cents everywhere, server-calculated, never client-trusted

`build-order-form.ts` parses each line's admin-entered dollar amount via `dollarsToCents()` (same conversion `ProductForm.tsx` already uses) — the admin's typed price is trusted as-is (there is no live catalog price to verify a *manual* order against; that verification pipeline in `verify-configuration.ts` exists specifically for the public, unauthenticated checkout path, not this trusted internal admin form). What is **never** trusted from the client is any computed total: `create-manual-order.ts`/`mutate-order.ts` always compute `lineSubtotal = unitPrice * quantity` and `pricingSummary.subtotal = sum(lineSubtotal)` themselves — the client-submitted JSON never includes a subtotal field at all, so there is nothing to "trust" or ignore. Live-verified: `unitPrice * quantity` matched the stored `lineSubtotal` exactly for every line in both automated testing and the real acceptance test.

### Order number — the same `BRCP-####` sequence, no second numbering system

`create-manual-order.ts` calls `nextval('order_number_seq')` — the identical sequence and format `create-order.ts` already uses for checkout orders. Manual and checkout orders are numbered from one unified sequence; `orders.source` (`"manual"` vs `"checkout"`) is what actually distinguishes how an order originated. `clientRequestId` — `orders`' `NOT NULL` + unique idempotency key, a real concept for checkout's client-retry scenarios — has no natural meaning for an admin-created order, so a manual order simply generates a fresh `crypto.randomUUID()` server-side purely to satisfy the constraint; it's otherwise unused for manual orders.

### Manual order creation — one transaction

`createManualOrderAction` (`requireAdminUser()`) → `create-manual-order.ts`'s `createManualOrder()`: re-verify the customer exists → `nextval('order_number_seq')` → compute every line's `lineSubtotal` and the order `subtotal` → insert the `orders` row (`status: "draft"`, `paymentStatus: "unpaid"`, `source: "manual"`, `notes: null`) → insert every `order_lines` row → `recordAuditEvent("order.created", {orderNumber, source:"manual", lineCount})` — all inside one `db.transaction()`. Deliberately **not** built on top of `create-order.ts`/`buildOrderDraft()` (both tightly coupled to `CartItem`/`Product`-shaped checkout data) — a parallel, admin-only path so the working, tested checkout flow stays completely undisturbed. Live-verified during automated regression testing: a direct call to the real, unmodified `createOrder()` still succeeds end-to-end after all of Phase 18B's changes, confirming checkout was never touched.

`orders.notes` (the customer-submitted checkout message, frozen at order-creation time) is **always `null`** for a manual order — no customer ever submitted anything. Internal admin commentary lives exclusively in the generic `notes` table (see below); the order detail page labels these two concepts distinctly ("Customer message" vs. "Internal notes") so they never collide visually either.

### Order line editing — draft-only, then a frozen historical snapshot

`/admin/orders/[id]/edit` is only functional while `status = "draft"` — reachable at any status, but shows a plain "financial snapshots are locked, cancel + create a new order instead" message once the order has left draft, rather than rendering an editor that would just reject on submit. `updateOrderLinesAction` independently re-checks `status === "draft"` server-side (throwing `NOT_DRAFT` otherwise) — the page-level gate is not the only thing preventing a non-draft order's history from being edited; a direct POST to the action is rejected too. Editing a draft's lines **replaces** the order's `order_lines` rows (delete + re-insert, inside one transaction) and recomputes `pricingSummary` from scratch — audited as `order.lines_updated`, metadata `{lineCount}` only. Live-verified (both automated and real): line editing succeeds while draft, and is correctly blocked the moment the order transitions to `"submitted"` or beyond.

Once an order leaves draft: line items, unit prices, line totals, and `pricingSummary` are all frozen historical snapshots — status and payment-status remain independently editable via their own dedicated controls regardless of the line-item lock state, since those are lifecycle/tracking fields, not pricing. If a finalized order needs correcting, the intended workflow is cancel + create a corrected order, never rewriting history in place.

### Order Detail page

Shows: `BRCP-####` order number, customer (name/email/phone/company, linked to `/admin/customers/[id]`), source, created/updated timestamps, work status + change control, payment status + change control, every line item (title, description if present, quantity, unit price, line subtotal, catalog slug reference or "custom item"), the frozen `pricingSummary` (labeled "frozen historical snapshot" once the order has left draft), the customer's original checkout message if one exists (`orders.notes`, clearly separate from admin notes), and internal notes. **No discount/tax/shipping fields exist anywhere in this schema** — none were added, since none were legitimately present to surface (matching the standing "do not invent financial fields" rule already established for `Product.pricing`).

### Shared Notes UI — generalized from the Phase 18A lead-only version

The generic `notes` table (`entityType: "lead" | "customer" | "order"`, `entityId`, `adminUserId` nullable `ON DELETE SET NULL`, `body`, append-only — no `updatedAt`, no edit/delete path) and `src/server/notes.ts`'s `recordNote()`/`getNotesForEntity()` needed **zero data-layer changes** for Phase 18B — they were already fully entity-agnostic from Phase 18A. What Phase 18B added: `src/components/admin/NoteForm.tsx` and `NotesList.tsx`, generalized out of the original `LeadNoteForm.tsx` (deleted, replaced by the shared version) — a deliberate departure from this codebase's usual "small mirrored per-entity files" convention (see Services vs. Portfolio admin components), justified here because the note form/list's shape is **100% identical** across all three entity types; only the bound Server Action differs (`addLeadNoteAction.bind(null, id)` / `addCustomerNoteAction.bind(null, id)` / `addOrderNoteAction.bind(null, id)`). Each of those three thin actions still lives in its own entity-specific `mutate-*.ts` file and independently calls `requireAdminUser()` — the shared UI never weakens or bypasses per-entity authorization. `NoteActionState` (the shared `{errors} | {success:true} | null` result shape) lives in `src/server/notes.ts` for the three action files to reuse structurally.

Notes are internal/admin-only everywhere, append-only (a wrong note gets corrected by adding a new note, never by rewriting history), author + timestamp always visible, never editable or deletable.

### Customer detail — linked history

`/admin/customers/[id]` shows: order history (unchanged from before), **linked leads** (every `leads` row with `customerId` pointing here, each linking back to `/admin/leads/[id]`), and **internal notes** (`NotesList` + `NoteForm`) — plus a "Create Order for this Customer" link and an "Edit Customer" link.

### Dashboard

Fixed the stale `statusCounts["confirmed"]` reference (silently masked while `orders` was empty — `"confirmed"` no longer exists in the approved 8-value lifecycle, replaced by `"approved"`). Added: **Active projects** (`approved` + `in-progress` + `awaiting-client`), **Awaiting client**, **Unpaid orders**, **Deposit paid** (via the new `getPaymentStatusCounts()`). No revenue metrics — matches the standing "don't overbuild analytics" instruction; there's still no payment-processing data anywhere in this schema to compute one from honestly.

### Audit events

```
customer.created              { source: "manual" | "lead" }
customer.updated              {}
customer.note_added            {}
lead.customer_linked           { customerId }
order.created                 { orderNumber, source, lineCount }
order.lines_updated            { lineCount }     — draft-only line edits
order.status_changed           { from, to }
order.payment_status_changed     { from, to }
order.note_added              {}
```

No names, emails, phone numbers, company names, note bodies, or line-item descriptions in any audit metadata — verified directly during both automated testing and the real acceptance test (a scan of every audit row tied to the real lead/customer/order confirmed zero PII matches).

### Security and transactions

Every export in `mutate-customer.ts`, `mutate-lead-customer.ts`, and `mutate-order.ts` independently calls `requireAdminUser()` as its first line — never relies on the protected admin layout's own check, per the rule established since Phase 12. Every multi-row operation (create-customer-from-lead, manual-order-creation, draft-line-replacement, every status/payment change) runs inside one `db.transaction()` alongside its `recordAuditEvent()` call — a failure at any step rolls back everything, including the audit row, so a logged event and the change it describes can never drift apart.

### Automated regression testing

34 checks (the 32 requested items plus two intermediate submission-success assertions), run against the real Neon database using only `test-phase18b-*@example.invalid`-tagged data, wrapped in a `try/finally` so cleanup always runs even if a check throws mid-way. One real bug was caught **in the test script itself, not the application**: the first attempt at testing "checkout order creation remains operational" used a fake, non-existent `productId`, which the database's real `order_lines_product_id_products_id_fk` constraint correctly rejected (`23503`) — this actually *proved* the FK still works post-migration rather than exposing a defect. The test was corrected to reference the real, published Custom Graphic Design product (a safe, read-only FK reference — the product itself was never modified) and passed. Coverage included: manual customer creation, email normalization, duplicate-email rejection, customer update, customer notes, the full lead→new-customer transaction (both audit events), lead→existing-customer linking, double-link prevention, original-lead-content preservation, manual draft order creation, real `BRCP-####` generation, multiple custom lines (one physical, one service), description round-tripping, null `productId`/`productSlug` for custom lines, a real catalog-linked line, server-side money calculation, correct subtotal, draft-only line editing (and its lock once the order leaves draft), every valid status/payment transition (and rejection of invalid ones), order notes, zero PII in audit metadata, correct admin attribution, continued checkout-order operability, and confirmation that no public route imports the customer/order query modules. All temporary rows (customers, leads, orders, order_lines, notes, audit_log entries) were deleted immediately after — confirmed via a fresh read showing the database back at its exact pre-test baseline.

**BRCP sequence honesty**: automated testing consumed real sequence values — the sequence was **never reset** (per the standing rule that it must not be manipulated even to make numbers contiguous), so those numbers are permanently retired. This is a documented, accepted cost of testing against the real numbering system rather than a mocked one.

### Real acceptance test — what was genuinely verified

Using your own real conversion (not seeded, not synthetic): your legitimate Phase 18A lead was converted to a real customer via **Create Customer from Lead**, linked correctly (`lead.customerId` set, both `customer.created` and `lead.customer_linked` audit events recorded, both attributed to the real owner account) — the original lead's name/email/message were confirmed unchanged by the conversion. A real manual order, **BRCP-1013**, was created for that customer with one service-type line item ("graphic design work" plus a custom description), correctly showing `productId`/`productSlug` as `null` (no fake catalog reference), `unitPrice`/`lineSubtotal` in integer cents with `lineSubtotal` exactly equal to `unitPrice × quantity`, and `pricingSummary.subtotal` exactly equal to the sum of its lines. Draft line editing was exercised successfully (`order.lines_updated` recorded) before the order was moved through real work-status transitions (`draft → submitted → approved`, each individually audited with correct `{from, to}` metadata) and a real order note was added (`order.note_added`, audit metadata empty, no PII). The customer detail page correctly showed both the linked lead and the linked order. Every audit event tied to this real workflow — 13 in total, spanning both the Phase 18A lead actions and this Phase 18B conversion/order — was confirmed attributed to the real owner account, and a full-metadata PII scan across all of them found zero matches.

**The customer-note step took three real attempts to land correctly, and the full history is preserved here rather than smoothed over**:

1. **First attempt**: read-only verification found **no `customer.note_added` audit event and no `notes` row with `entityType = "customer"` anywhere in the database**, despite "Customer Note" being listed among the confirmed-working workflow steps at the time. The order note (`order.note_added`) genuinely existed and was correctly recorded; the customer note did not persist. This was reported honestly rather than assumed to have worked.
2. **Second attempt**: a retry produced a new note — but read-only verification showed it had landed as `entityType = "lead"` (a fresh `lead.note_added` event, plus an incidental `lead.status_changed` from `"new"` to `"new"`), not `entityType = "customer"`. The note had actually been submitted from the **lead** detail page (`/admin/leads/[id]`), not the **customer** detail page (`/admin/customers/[id]`) — two visually similar Notes sections on two different pages. Customer notes were still at zero.
3. **Third attempt**: repeated specifically on the correct customer URL (`/admin/customers/be73eb28-5cf5-438c-a124-bd63f73bc541`), the note was visible after a hard refresh, and read-only verification against Neon confirmed it directly: exactly one `notes` row with `entityType = "customer"` and `entityId` matching the real customer, `adminUserId` matching the real owner account, and exactly one `customer.note_added` audit event with an identical timestamp (same transaction), empty (`{}`) metadata, and no PII.

**No application code change was required between any of these attempts.** `addCustomerNoteAction` was correct throughout — the first miss is consistent with the same known session-staleness `requireAdminUser()` behavior already documented under Brand Controls/Services Admin (a stale session redirects to `/admin/login` before any write runs, producing "nothing happened" with no error), and the second miss was simply the wrong page, not a bug. The **stray lead note** created during the second attempt (`lead.note_added`, real timestamp `2026-07-25T05:07:13Z`) is real data, created through the real UI during real acceptance testing — it is preserved exactly as-is on the real lead's note history, not deleted or treated as test data requiring cleanup.

**Final state, confirmed**: the real customer note exists exactly once, correctly attributed, with a matching audit event and zero PII in its metadata. `notes` totals 4 rows (the original Phase 18A lead note, the real order note, the stray second-attempt lead note, and this real customer note); `audit_log` totals 37 rows — see "Audit history" note below for the full accounting.

**BRCP-1013 is your genuine, live, currently-active manual order — real acceptance-test history, not a placeholder to revert.**

### What's still not built (documented, not silently deferred)

No Stripe or any payment processor — `paymentStatus` is manual admin tracking only, never a real charge/refund. No revenue metrics on the dashboard — there's no real payment-processing data to compute one from honestly. No customer portal or customer-facing accounts/login. No SMS or email automation (status/payment changes are silent — no notification is sent to the customer). No invoice/PDF generation. Order line items support text/quantity/price only — no file attachments, no line-item-level intake forms (the existing `intakeRequired`/`intakeFormSlug`/`intakeStatus` columns remain unpopulated, same as every prior phase). None of this is scheduled here — recorded so a future phase doesn't have to re-derive the gap list from scratch.

### Phase 19 (Phase 19A, 19B, and 19C complete — see below)

This section originally noted that the next major phase would bring Media Library video uploads. That work is now done — see "Video Media Foundation (Phase 19A)" below for the complete architecture. Phase 19B then wired that foundation into the first real public consumer — Portfolio gallery video — see "Portfolio Video Support (Phase 19B)" below. Phase 19C extended the same pattern to Service galleries — see "Service Gallery Video Support (Phase 19C)" below. See "## Roadmap" (near the end of this file) for the full, current, authoritative phase timeline — Phase 19 itself is now split into 19D-1 (Motion System, the active phase) and 19D-2 (Cinematic Homepage Hero Media), followed by Phase 20 (Big Red Brain + AI Creative Studio), Phase 21 (Security Hardening + Penetration Testing — a required pre-launch gate), and Phase 22 (Production Polish + Launch Readiness).

## Video Media Foundation (Phase 19A)

**Status: the Media Library supports real video assets end to end — upload, storage, server-side validation, preview, poster images, replacement, and usage reporting — live-tested against your own real upload.** This is deliberately **infrastructure and admin support only**: no public page rendered video yet as of this phase, no animation controls exist, no AI video generation exists. See "Portfolio Video Support (Phase 19B)" below for the first real public consumer of this foundation.

### Supported formats and size limit

**MP4 (`video/mp4`) and WebM (`video/webm`) only** — the two formats every modern browser plays natively with `<video>`, no plugin. MOV/AVI/MKV are rejected regardless of what the browser declares, matching the exact allowlist philosophy already established for images (nothing outside the allowlist can ever pass — there is no denylist to keep complete).

`MAX_VIDEO_UPLOAD_BYTES = 100 MB` (`src/data/media.ts`) — a deliberate starting policy, not a platform ceiling: comfortably covers a 60–90 second, reasonably-compressed 1080p promo/event-recap clip (the realistic content this business actually produces) without inviting multi-minute raw phone-camera dumps that would hurt upload UX and page performance. `MAX_IMAGE_UPLOAD_BYTES` stays exactly `8 MB`, completely untouched — the two limits are independent constants, never shared or silently reused across media types.

### Architecture — browser-direct-to-Blob, not a Server Action relay

Video upload is architecturally different from image upload, and deliberately so:

```
Browser
  → authenticated POST /api/media/video-upload-token
  → short-lived, scoped client upload token (allowedContentTypes + maximumSizeInBytes baked in)
  → browser uploads directly to Vercel Blob (bytes never pass through our server)
  → authenticated confirmVideoUploadAction Server Action (receives only the resulting blob URL/pathname)
  → server fetches a byte range back from that URL and validates the REAL bytes
  → media_assets row created only if validation passes
```

**Why not the image path's Server Action body-relay**: a 100 MB video would either force `next.config.ts`'s Server Action `bodySizeLimit` to be raised globally (affecting every action in the app, not just this one — explicitly rejected) or push a huge request through a serverless function's memory/duration budget for no benefit. Images stay exactly as they were — 8 MB is comfortably within Server Action territory, and that proven, simple, working path was never touched.

`POST /api/media/video-upload-token` (`src/app/api/media/video-upload-token/route.ts`) issues the token via `@vercel/blob/client`'s `handleUpload()`, constraining `allowedContentTypes: ["video/mp4", "video/webm"]` and `maximumSizeInBytes` server-side, before the browser ever receives a token. It uses a new `getAdminUserOrNull()` (`src/server/require-admin-user.ts`) rather than `requireAdminUser()` — this is a JSON API consumed by the `@vercel/blob` client SDK, not a page; `requireAdminUser()`'s redirect-on-failure behavior would send the SDK's internal `fetch()` a 307 to `/admin/login` instead of a clean 401 it can actually surface as an error. Both functions share the same core authorization lookup (`role`/`active` re-read from `admin_users` on every call, never trusted from the session) — only the failure behavior differs.

**Why the database write doesn't happen via `handleUpload()`'s `onUploadCompleted` callback**: that callback is a server-to-server webhook — Vercel's infrastructure calls back to a publicly reachable URL, which a local `next dev` server cannot receive without a tunnel. Since both automated testing and real manual acceptance testing need to work locally, the browser instead calls a normal Server Action (`confirmVideoUploadAction`/`confirmVideoReplaceAction`) once `upload()` resolves — this works identically in local dev, preview, and production, and still independently calls `requireAdminUser()`.

### `BLOB_READ_WRITE_TOKEN` — a real, discovered requirement, added deliberately

**A genuine defect was found and fixed during real acceptance testing, not assumed away**: `@vercel/blob@2.6.1`'s `handleUpload()` resolves its credentials via a narrower internal function (`getReadWriteBlobTokenFromOptionsOrEnv`) than the plain `put()`/`del()` functions already used elsewhere in this codebase (`resolveBlobAuth`, which supports OIDC via `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`). `handleUpload()`'s credential resolver has **no OIDC fallback at all** — it only accepts an explicit `token` option or `process.env.BLOB_READ_WRITE_TOKEN`, confirmed by reading the actual compiled source in `node_modules/@vercel/blob`, not assumed from documentation. Every attempt to generate a client token failed with `"Vercel Blob: No read-write token found..."`, surfaced to the browser as the SDK's generic `"Failed to retrieve the client token"` — this was root-caused by direct source inspection before any code was touched.

**The fix required zero application code changes** — `handleUpload()` already auto-reads `process.env.BLOB_READ_WRITE_TOKEN` when no `token` option is passed, and the route never passed one. `BLOB_READ_WRITE_TOKEN` was added manually via the Vercel dashboard/CLI to **Development, Preview, and Production** for this project, scoped to the existing **BigRedMedia** store (confirmed via `vercel blob get-store` — there is exactly one Blob store on the account, `BigRedMedia (store_CguB3jAZSflfUnrr)`, base URL matching the hostname already allow-listed in `next.config.ts`; no second store was created). It is **server-only** — never prefixed `NEXT_PUBLIC_`, never referenced in any client component, never sent to the browser. The only thing that ever reaches the browser is the short-lived, narrowly-scoped client token `handleUpload()` generates from it — confirmed structurally distinct from the long-lived token itself during testing (see "Real acceptance test" below). Its value is never written to source code, logs, commit messages, or this file — only the environment variable **name** is referenced anywhere in this codebase or its documentation.

### Server-side post-upload validation — the real content check

`src/server/validate-video-upload.ts` mirrors `validate-media-upload.ts`'s exact philosophy: real magic-byte sniffing, never trusting the browser's declared filename/Content-Type. Since video bytes never pass through the server as a single buffer, validation operates on a **byte prefix**: `fetchAndValidateUploadedVideo(url)` fetches only the first ~512 bytes of the now-public Blob object via a ranged request (`Range: bytes=0-511`), sniffs real magic bytes (MP4's `ftyp` box signature at byte offset 4–7; WebM's EBML magic number plus a bounded search for the `webm` DocType string within the first 512 bytes — documented honestly as a practical, not perfect, WebM/Matroska distinguisher, since both share the same EBML magic number and full EBML tree parsing was deliberately avoided as exactly the kind of fragile hand-written container parser this project avoided for duration parsing too). **Total file size is read from the response's real `Content-Range` header** (e.g. `bytes 0-511/9733983` — the number after `/`), never from a client-claimed size. A file that fails either check is deleted from Blob and **never** gets a `media_assets` row — invalid uploads never become active Media Library records, by construction.

The upload token's `allowedContentTypes` constraint (enforced by Blob's own infrastructure before upload) and this post-upload byte-sniff are two independent layers: `allowedContentTypes` only constrains the *declared* content type, not the real bytes, so the post-upload check remains the real backstop against a file whose actual content doesn't match what was declared.

### Video replacement — same permanent-ID philosophy, extended with a type guard

`confirmVideoReplaceAction` mirrors `replaceMediaAssetAction`'s (image) exact pattern: the permanent `media_assets.id` never changes, only `storageKey`/`url`/`mimeType`/`sizeBytes`/`updatedAt` are updated on the existing row, and the **previous Blob object is deliberately left in place, not deleted** — unchanged from Phase 15's recoverability-over-immediate-cleanup policy. `posterMediaAssetId` is untouched by a video replace, so an existing poster relationship survives.

**Both replacement directions are now explicitly guarded**: `replaceMediaAssetAction` (image) rejects if `existing.type !== "image"`; `confirmVideoReplaceAction` (video) rejects if `existing.type !== "video"`. Neither silently allows a cross-type replacement — an image can never be replaced by a video, and a video can never be replaced by an image, each with a readable, explicit guard rather than relying only on the format validator's implicit rejection of the wrong bytes.

### Poster architecture (`posterMediaAssetId`)

Schema (migration `0011_stale_jubilee.sql`, already applied — see "Migrations" below): `media_assets.posterMediaAssetId` — nullable, **self-referencing** foreign key to `media_assets.id` (required Drizzle's self-reference pattern, `references((): AnyPgColumn => mediaAssets.id, ...)`), `ON DELETE SET NULL`. Archiving or (hypothetically) deleting the poster image can never cascade-delete or block deletion of the video that references it — the video row simply loses its poster pointer, exactly like every other optional media reference in this schema. There is deliberately **no DB-level constraint restricting the referenced row to `type = 'image'`** — that rule lives at the application layer (`setMediaAssetPosterAction`), matching how every other "which kind of asset belongs here" rule in this codebase already lives in validation code, not SQL.

`setMediaAssetPosterAction` re-verifies **fresh, inside the transaction**, that a submitted poster: exists, is `type: "image"`, and is `status: "active"` — never trusting that the picker UI's own filtering was the only gate, so a stale page, a race with someone else archiving the image, or a hand-crafted request are all caught identically. Reuses the existing `media.updated` audit action (not a new video-only event) with metadata limited to `{fields: ["posterMediaAssetId"]}` — no filenames, URLs, or asset IDs, matching the exact minimal-metadata convention `updateMediaAssetAction`'s alt/caption edits already established.

`MediaPosterField.tsx` (the admin UI) only ever offers **active image** assets, sourced from the newly-generalized `getActiveMediaAssetsForPicker(["image"])` — but the server-side re-check above is the real authority, not this UI filter.

### Media pickers — generalized, but no existing picker was widened automatically

`getActiveImageAssetsForPicker()` — the one function every existing picker (Product media, Brand logos) already called — is now a thin, behavior-identical wrapper over a new `getActiveMediaAssetsForPicker(allowedTypes: MediaAssetType[])`. Every existing caller is unaffected: still image-only, unchanged. The only new caller is the poster field, which explicitly passes `["image"]`. This is the mechanism that keeps a video from ever being selectable into a component that only knows how to render `next/image` — the picker offering it simply never appears, per field, by explicit choice, not automatically widened.

### Usage scanning — poster relationships are now reportable

`findAssetsUsingAsPoster(imageId)` (`src/server/queries/media.ts`) — a plain column-equality scan (`posterMediaAssetId = $1`, not a JSONB containment query like the product/service/portfolio scans, since this FK is a scalar column) — reported on an image asset's own "Used by" section on `/admin/media/[id]`, alongside existing product/service/portfolio references. Existing usage-scan functions are completely unmodified.

### Media Library UI

`/admin/media`'s grid: a video card shows its **poster image** (once one is set) with a small "Video" badge overlay, or a generic text placeholder if no poster exists yet — **never an autoplaying `<video>` element in the grid**. `/admin/media/[id]`'s detail page renders a real `<video controls playsInline preload="metadata" poster={...}>` for video assets — **no `autoplay`** — plus the poster picker, replace form (routed to `VideoReplaceForm` for video assets, the original `MediaReplaceForm` for images), and the extended "Used by" block. `MediaFilterBar`'s existing type filter (`image`/`video`) needed no changes — it already read from the schema's real `MEDIA_ASSET_TYPES`.

### Audit events — no new video-only actions

`media.uploaded`, `media.updated`, `media.archived` are reused exactly as they already applied to images — a video upload is still `media.uploaded` with `{filename, mimeType, sizeBytes}` metadata; a video replace is still `media.updated` with `{replaced: true, previousStorageKey}`; a poster change is `media.updated` with `{fields: ["posterMediaAssetId"]}`.

### Migration `0011_stale_jubilee.sql`

One additive change: `media_assets.posterMediaAssetId` (nullable `text`, self-referencing FK, `ON DELETE SET NULL`). Generated, reviewed, and explicitly approved via the full disclosure protocol (complete SQL, column type/nullability/default, destructive-operation analysis, confirmation 0000–0010 remained byte-unchanged, confirmation the migration hadn't been applied, confirmation no real data was touched) before `db:migrate` ever ran. **Migrations 0000–0010 were never rewritten** — 0011 is a new, additive-only file, per the project's standing migration-immutability rule.

### Real acceptance test — what was genuinely verified

Using your own real upload (not seeded, not synthetic): a real MP4 was uploaded through the real browser-direct-to-Blob flow, a real poster was selected from your existing real image asset, and the video was then replaced with a second real file — all through the real admin UI, not a script. Read-only verification directly against Neon and Blob afterward confirmed every claim rather than assuming success:

- **Exactly 1 legitimate video asset** — `type: video`, `status: active`, `mimeType: video/mp4`, final size **9,733,983 bytes**.
- **Poster relationship**: `posterMediaAssetId` correctly references your legitimate existing image asset (`status: active`, `type: image`) — confirmed both from the video's own row and from `findAssetsUsingAsPoster()` correctly reporting the relationship from the image's side.
- **Replacement preserved the permanent `media_assets.id`** — confirmed by there being exactly one video row throughout, with all three of its audit events referencing the same single `entityId`.
- **Replacement changed the underlying Blob storage key** — confirmed directly from the stored audit history itself, not inferred: the replace event's own metadata recorded the *previous* `storageKey`, which differs from the row's current one.
- **The poster relationship survived the replacement** — `posterMediaAssetId` was set before the replace and remained set afterward, untouched by `confirmVideoReplaceAction` (which never touches that column).
- **The final Blob object is genuinely live and readable** — a real fetch against its URL returned `200`, with `Content-Length` matching the stored `sizeBytes` exactly.
- **Exactly 3 legitimate audit events** for this video (`media.uploaded`, `media.updated` poster-set, `media.updated` replaced) — `audit_log` moved from 37 → **40** rows, precisely those three, all attributed to the real owner account, metadata free of credentials/tokens/URLs.
- **No duplicates**: 2 total `media_assets` rows exist — the 1 original real image plus this 1 real video — never more.

One real defect was found and fixed along the way, documented above rather than glossed over: `handleUpload()`'s OIDC gap, discovered specifically because this real upload attempt failed with `"Failed to retrieve the client token"` before the fix.

### What's still not built this phase (documented, not silently deferred)

**As true at the end of Phase 19A, before Phase 19B started:** no public page rendered video yet — `ProductMedia`/`ProjectGallery`/`ServiceHero` etc. still only ever rendered a video's poster image with a "VIDEO" badge. No `VideoMedia` public component had been built yet. No `Product.media`/`ServiceImage`/`ProjectImage` type widening for video beyond what already existed. **Phase 19B (below) has since built `VideoMedia` and widened `ProjectImage` specifically — for Portfolio galleries only.** `Product.media` and `ServiceImage` remain exactly as they were at the end of Phase 19A — still no `type` field, still no video rendering — see "Portfolio Video Support (Phase 19B)" → "What's still not built."

No automatic poster-frame generation (poster selection is manual, from an already-uploaded image, exactly as approved). No orphaned-Blob cleanup for superseded replace targets (same documented, deferred Phase 15 policy, now also applying to video). No transcoding, no adaptive bitrate streaming, no automatic duration extraction (deferred — the reliable, dependency-free approach identified is a browser-native `HTMLVideoElement.duration` read, not yet implemented). No animation controls, no AI video generation, no Mux/Cloudinary integration.

## Portfolio Video Support (Phase 19B)

**Status: complete — Portfolio gallery items can now be real Media Library videos, rendered publicly with a genuine native `<video>` player, live-tested against your own real SP Juices video.** This is the first real public consumer of Phase 19A's Media Library video foundation. Deliberately scoped to **Portfolio galleries only** — the hero image field, Services, Product, and the homepage are untouched; see "What's still not built" below.

### `ProjectImage` — additive, no migration

`src/data/projects.ts`'s `ProjectImage` type gained two optional fields, requiring **no database migration** (`portfolio_project_versions.gallery` is a schema-less JSONB column — Postgres enforces nothing about its shape, so every gallery item authored before this phase, which has neither field, remains perfectly valid):

```ts
type ProjectImage = {
  type?: "image" | "video";   // absent/undefined means "image" — the default, unchanged behavior
  src: string;
  alt: string;
  lightBackground?: boolean;    // image-only presentation concept — never read for a video item
  mediaAssetId?: string;      // the PERMANENT reference — same id/slug-style split as every other Media Library link in this codebase
  posterSrc?: string;        // READ-TIME ONLY — see below
};
```

A `type: "video"` item **must** carry `mediaAssetId` — there is no manual/local video path support, matching how every other Media-Library-only asset type already works here (enforced in `projects.validate.ts`, see below). `mediaAssetId` is the permanent link; `src` is a resolved, replaceable value — replacing the video's file in the Media Library propagates to every project referencing it automatically, the exact same guarantee already proven for `Product.media`/`ServiceImage`/brand logos.

### `posterSrc` — read-time only, and the real bug that proved why

`posterSrc` is populated **exclusively** by `resolveProjectsMedia()` in `src/server/queries/portfolio.ts`, on every read, by resolving a video asset's own `posterMediaAssetId` (Phase 19A) to that poster's *current* URL. It is **never** authored by the admin form and **must never** be written into `portfolio_project_versions.gallery`'s JSONB. A video with no poster configured simply keeps `posterSrc` undefined — no fallback image, no broken state, `VideoMedia` just renders without a `poster` attribute.

**This was not just a design rule — a real acceptance-test bug proved it needed active enforcement.** The admin edit form seeds its local gallery-editor state from `getPortfolioEntityForAdmin()`, which — like every public read — returns the *already-resolved* gallery (posterSrc attached). An admin who saves the draft again after that initial load (a completely ordinary edit, unrelated to the video itself) silently wrote `posterSrc` back into storage, because the client form had no way to know that field wasn't supposed to persist. This was caught on the real SP Juices draft (see "Real SP Juices acceptance test" below), not invented speculatively.

**The fix: `sanitizeGalleryForStorage()`** (`src/data/projects.ts`), the one place that decides what's allowed to reach the database. Called from `src/server/mutate-portfolio.ts`'s `contentToColumns()` — the single shared helper both `createPortfolioAction` and `savePortfolioDraftAction` go through — so both the create and every future draft-save path are covered by one choke point, not two separately-maintained copies. It rebuilds each gallery item via an **explicit allowlist** (`src`, `alt`, and only-if-present `type`/`mediaAssetId`/`lightBackground`) rather than a `delete image.posterSrc` — a deliberate choice so any *future* runtime-only field added to `ProjectImage` is stripped by default too, without needing to remember to update a denylist. The server is the authority here, never the client: a client could in principle submit any stale or fabricated field, and the write path silently discards anything not on the allowlist.

`publishPortfolioAction` needed no separate change — it only ever copies an already-persisted (now-clean-by-construction) draft row onto the published row.

### `VideoMedia` — the public player

`src/components/VideoMedia.tsx` — a small, presentational-only component with **zero dependency on any admin code** (imports nothing from `src/components/admin` or `src/server`), receiving only already-resolved public data:

```tsx
<video
  src={src}
  poster={posterSrc}
  controls
  playsInline
  preload="metadata"
  aria-label={alt}
>
  Your browser doesn&apos;t support video playback.
</video>
```

`controls`, `playsInline`, and `preload="metadata"` are always on; `autoplay`, `muted`, and `loop` are **never** forced — a deliberate, explicit design decision, not an oversight, matching the "no autoplay anywhere in this codebase" precedent Phase 19A's own detail-page `<video>` preview already established. `alt` becomes `aria-label` since `<video>` has no native `alt` attribute. Future per-video presentation controls (autoplay/muted/loop/object-fit, etc.) are intentionally **not** implemented yet — the data model already supports adding them later as more optional props, no redesign required.

### `ProjectGallery` — mixed image/video, same responsive grid

`src/components/ProjectGallery.tsx` branches per item: `type === "video"` renders `VideoMedia`, otherwise the existing `next/image`. Both share the exact same `.project-gallery-item` grid cell — one new CSS rule, `.project-gallery-item video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:var(--black)}`, mirrors the letterboxed `object-fit:contain` treatment images already had, so a video occupies an identical, fully responsive cell shape at every breakpoint with no separate media query needed. `lightBackground` stays an image-only concept — a video item's container always keeps the default black letterboxing, never reads `lightBackground`.

### Admin gallery picker — image and video, hero stays image-only

`PortfolioGalleryEditor.tsx`'s "Choose from Media Library" picker now offers **both** active image and active video assets (`getActiveMediaAssetsForPicker(["image", "video"])`) — a deliberate widening scoped to the gallery only. **The hero image field (`PortfolioHeroField.tsx`) was not touched and stays image-only** (`getActiveImageAssetsForPicker()`, unchanged) — no public hero video exists or was requested. Selecting a video sets `mediaAssetId` + `type: "video"`; selecting an image preserves the exact pre-Phase-19B shape (no `type` field at all) — "preserve existing image behavior" taken literally, not just in spirit.

**Poster thumbnail + "Video" badge — a real UX bug, found and fixed.** The first version of this picker rendered a video tile as bare text reading "Video," with no thumbnail, while the video's own poster image sat in the same grid as a normal, fully-visible picture. A real user, during acceptance testing, clicked the poster's picture-looking tile believing it *was* the video — and the wrong asset (`mediaAssetId` pointing at the poster image, no `type` set) got saved. The fix: the picker now resolves each video's poster URL server-side (`new/page.tsx`/`[id]/edit/page.tsx` batch-fetch via `getMediaAssetsByIds`) and shows that poster image with a small "Video" badge overlay — reusing `/admin/media`'s own existing `.admin-media-card-video-badge` pattern from Phase 19A verbatim, not a new visual language. A video with no poster set still falls back to text, now reading `"Video (no poster set)"` for clarity. This was a genuine, confirmed root cause — not a rendering/CSS defect in the public pipeline, which was correct throughout.

### Validation — sync structural, then async real-data

Two layers, matching the exact split already established for `relatedServiceSlug` in Phase 17:

- **`projects.validate.ts`** (synchronous, no database access): a `type: "video"` item must carry `mediaAssetId`; the local-path/folder check is skipped entirely for video items (a video's `src` is always a resolved Media Library CDN URL, never a local path).
- **`mutate-portfolio.ts`**'s `validateVideoGalleryReferences()` (async, real Neon read): for every `type: "video"` gallery item, independently verifies the referenced asset exists, is genuinely `type: "video"`, and is `status: "active"` — never trusting that the picker's own "active videos only" filtering was the only gate, since a stale page, a race with someone archiving the asset mid-edit, or a hand-crafted request could all bypass client-side filtering. Called from `createPortfolioAction` and `savePortfolioDraftAction` — **deliberately not called from `publishPortfolioAction`**, which promotes already-validated draft content rather than accepting new input, matching the literal "rejected for NEW draft saves" requirement.

### Archived assets — the existing Media Library precedent, reused unmodified

No new behavior was invented here — Phase 15/19A's existing rule was simply reapplied: **archiving a referenced video or poster never breaks an existing gallery reference.** `resolveProjectsMedia()` resolves by id with no status filter, so a project that already references an archived video (or whose video's poster was later archived) keeps rendering exactly as before — only *new* draft saves reject an archived video (via the async check above). Archiving only removes an asset from future picker selections (`getActiveMediaAssetsForPicker()` filters `status = 'active'`); it never touches, deletes, or hides an already-referenced asset's Blob or its public rendering.

### Usage scanning

`findProjectsReferencingMediaAsset()` (`src/server/queries/media.ts`, unmodified since Phase 17) needed **zero code changes** to detect a video reference — confirmed, not assumed: Postgres's JSONB containment operator (`gallery @> [{"mediaAssetId": "..."}]`) matches on the presence of that key-value pair regardless of what other fields (`type`, `posterSrc`, etc.) are also present on the item. `/admin/media/[id]`'s "Used by" block for the poster image also correctly reports the video via `findAssetsUsingAsPoster()` (Phase 19A, also unmodified).

### Draft → preview → publish isolation

Unchanged from the Services + Portfolio Admin architecture Phase 17 established — Save Draft only ever writes the `draft` version row; the public site and the published row are untouched until an explicit Publish. `/admin/portfolio/[id]/preview` reuses the exact real public components (`ProjectGallery` included) against the draft's resolved content, so a video previewed there is provably what the public page will render once published, not a reconstruction.

### Real SP Juices acceptance test — the full, honest history

Using your own real project and your own real video/poster (both uploaded in Phase 19A's own acceptance test): you added the video to SP Juices' draft gallery, previewed it, and hit the two real bugs documented above in the process — first the picker-tile mis-click (the poster image got added instead of the video, confirmed by reading the raw draft JSONB directly rather than assumed), then, after correcting that, the `posterSrc`-persistence bug (confirmed the same way, on the corrected draft, before you clicked Publish). Both were root-caused, fixed, and the already-contaminated draft row was corrected via a one-off script that reused the real, now-exported `sanitizeGalleryForStorage()` — verified byte-for-byte to change *only* the removal of `posterSrc`, nothing else, before being applied. You then re-saved and published for real. Final, fully-verified state: SP Juices' permanent project id unchanged throughout; draft and published content synchronized; the video present exactly once, `mediaAssetId` correct, `type: "video"`; zero `posterSrc` anywhere in either raw JSONB, confirmed by a full scan across all 8 `portfolio_project_versions` rows (all 4 projects, draft + published) finding no other contaminated row; the poster resolved correctly at read time from the video's `posterMediaAssetId`; all 13 original SP Juices images intact, in original order, with `lightBackground: true` still correct on the logo item; the accidental poster-image item gone; usage scanning correctly reporting the reference from both the poster's and the video's side; both Media Library assets still `active`; no duplicate rows anywhere; a complete, correctly owner-attributed audit trail (`portfolio.draft_saved` ×5, `portfolio.published` ×2 — the first publish predates the fixes, the second is the real, final one); and every other real record in the database (Brand `#E70810`, the real Branding service edit, the real Product Packaging edit, Custom Graphic Design, the homepage, 7 Services, the other 3 Portfolio projects, leads/customers/notes/orders) confirmed completely unaffected. **This is real, live, currently-published content — not a placeholder to revert.**

### What's still not built

Services and Product galleries/media are untouched — `ServiceImage` and `Product.media` still have no `type` field and cannot reference a video, by explicit scope decision, not oversight. No homepage video. No hero-image video (the hero picker stays image-only, unwidened, on purpose). No animation, autoplay, or motion controls of any kind (see "Phase 19C" below). No AI-generated video of any kind. No testimonial-reel or case-study-video-specific UI beyond the generic gallery item. No `object-fit`/aspect-ratio override per video — every video shares the same `.project-gallery-item` letterboxed treatment images already use.

### Roadmap notes (documentation only — nothing here is scheduled or implemented)

- **Services video** — done. See "Service Gallery Video Support (Phase 19C)" below.
- **Homepage video** — inspected in detail during Phase 19C's architecture report; deliberately not started. See "Service Gallery Video Support (Phase 19C)" → "Homepage findings" below for the full, honest writeup of what's there today and why it was deferred, and see "## Roadmap" (near the end of this file) for Phase 19D-2, the phase now scoped to build it.
- **AI-generated branding videos** — the original motivating use case named when Phase 19B's architecture was first approved (an eventual Big Red Brain / AI Creative Studio capability to generate on-brand promotional video). Nothing about that generation pipeline exists yet — Phase 19B/19C only built the places such a video would eventually be *displayed* (a real Media Library video asset, attached to a Portfolio or Service gallery item, rendered by `VideoMedia`). The display path is real, proven twice now, and requires zero changes to accept an AI-generated video instead of a human-uploaded one — it would enter through the exact same Media Library upload/poster/replace path. The generation path itself is Phase 20 future work — see "## Roadmap" for the full, current, authoritative Phase 19D-1/19D-2/20/21/22 timeline; this note is intentionally short so it can't drift out of sync with that section.
- **Testimonial reels** — a named future use case for the same Portfolio/Services video gallery — short client testimonial clips. No dedicated schema or UI exists; today's generic video gallery item is the only building block, and it's sufficient to hold one manually uploaded via the Media Library today.

## Service Gallery Video Support (Phase 19C)

**Status: complete — Service gallery items can now be real Media Library videos, rendered publicly through a brand-new `ServiceGallery` component.** Direct architectural mirror of Phase 19B's Portfolio work, with one deliberate exception: `Service.gallery` had **no public renderer at all** before this phase (confirmed by inspection, not assumed) — Phase 19C had to build `ServiceGallery` from scratch, not just widen an existing one. Service hero stays image-only, unchanged. Homepage video was explicitly investigated and explicitly deferred — see "Homepage findings" below.

### `ServiceImage` — additive, no migration, deliberately NOT shared with `ProjectImage`

`src/data/services.ts`'s `ServiceImage` gained the same two optional fields Phase 19B added to `ProjectImage`, requiring **no migration** (`service_versions.gallery` is schema-less JSONB, same as Portfolio):

```ts
type ServiceImage = {
  type?: "image" | "video";
  src: string;
  alt: string;
  mediaAssetId?: string;
  posterSrc?: string;   // READ-TIME ONLY, never persisted — see below
};
```

**A separate `sanitizeServiceGalleryForStorage()` function was written in `src/data/services.ts`, not a shared/generalized one with Portfolio's `sanitizeGalleryForStorage()`.** This was an explicit decision, not an oversight: Services and Portfolio are intentionally parallel but independently evolving content systems (mirrored files throughout this codebase — `mutate-service.ts`/`mutate-portfolio.ts`, `ServiceGalleryEditor.tsx`/`PortfolioGalleryEditor.tsx`, etc. — never a single parameterized shared implementation), and `ServiceImage` has never had Portfolio's `lightBackground` field. A shared sanitizer would either need to special-case that difference or silently allow a field one system doesn't have. Same explicit-allowlist discipline as Portfolio's version (`{src, alt}` plus only-if-present `type`/`mediaAssetId` — never a `delete`), applied **from day one** in this phase specifically because Phase 19B proved the round-trip risk is real, not hypothetical: `getServiceEntityForAdmin()` already returns already-resolved (posterSrc-attached) data to the edit form, so the exact same mechanism that contaminated the real SP Juices draft was a live risk here the moment video was introduced. Wired into `mutate-service.ts`'s `contentToColumns()` — the one shared choke point both `createServiceAction` and `saveServiceDraftAction` go through.

### Poster resolution

`resolveServicesMedia()` in `src/server/queries/services.ts` gained the identical second resolution pass `resolveProjectsMedia()` already has: resolve every `mediaAssetId` to its live asset, then for any resolved video with its own `posterMediaAssetId` (Phase 19A), batch-resolve that too and attach `posterSrc` — a read-time-only enrichment, never written back to `service_versions.gallery`'s JSONB.

### Validation — sync structural, then async real-data

Same two-layer split as Portfolio: `services.validate.ts` requires `mediaAssetId` on any `type: "video"` item (no manual/local video path support) and skips the local-path/folder check for video items; `mutate-service.ts`'s `validateVideoGalleryReferences()` (async, real Neon read) independently verifies a referenced asset exists, is genuinely `type: "video"`, and is `status: "active"` — called from `createServiceAction`/`saveServiceDraftAction` only, never from `publishServiceAction`, which promotes already-validated draft content.

### `ServiceGallery` — the missing public renderer, now built

`src/components/ServiceGallery.tsx` is new. It reuses `VideoMedia` (no second video player component exists or was built) and reuses **Portfolio's own `.project-gallery-grid`/`.project-gallery-item` CSS classes verbatim**, rather than duplicating near-identical `.service-gallery-*` rules — the same "reuse an existing generic pattern" precedent already established when the Store grid reused `.portfolio-filters`/`.portfolio-filter` CSS unmodified. `ServiceImage` has no `lightBackground` concept, so unlike `ProjectGallery` there's no light/dark class branch. Wired into both `/services/[slug]/page.tsx` and `/admin/services/[id]/preview/page.tsx`, each with the identical `{gallery && gallery.length > 0 && <ServiceGallery .../>}` conditional Portfolio already uses.

### Admin picker — image and video, hero stays image-only, same anti-mis-click fix applied proactively

`ServiceGalleryEditor.tsx` now offers both active image and active video assets (`getActiveMediaAssetsForPicker(["image", "video"])`); `ServiceHeroField.tsx` was **not touched** and stays on `getActiveImageAssetsForPicker()`. The picker renders a video tile using its own poster thumbnail (with a "Video" badge overlay, reusing Phase 19A's `.admin-media-card-video-badge`) when a poster is set, or a `"Video (no poster set)"` text fallback otherwise — this is Phase 19B's real, user-discovered picker-tile-confusion fix, applied here **proactively from first implementation** rather than waiting to rediscover the same bug. `ServiceForm.tsx` gained the same `mediaAssets`/`galleryMediaAssets` prop split `PortfolioForm.tsx` already has; both admin Service pages (`new`, `[id]/edit`) resolve poster URLs server-side before handing the picker list to the form, mirroring Portfolio's exact pattern.

### Archived assets and usage scanning

Same reused, unmodified precedent: an already-referenced archived video/poster keeps rendering (`resolveServicesMedia()` resolves by id with no status filter); only *new* draft saves reject an archived video. `findServicesReferencingMediaAsset()` (`queries/media.ts`, unchanged since Phase 17) needed **zero code changes** — verified by automated regression test, not just inspection, that its existing JSONB containment query correctly detects a video gallery reference exactly like Portfolio's equivalent already proved in Phase 19B.

### Draft → preview → publish isolation

Unchanged from the Services Admin architecture Phase 17 established — no new isolation logic needed.

### Automated regression testing

20 checks (the 16 requested items, several split into sub-assertions, plus a backward-compatibility spot check), run against real Neon query functions using temporary `test-phase19c-`-tagged media assets and one temporary service — **20/20 passed on the first run**. Coverage included: existing image galleries remain valid, video addition to a draft, draft preview resolving both video and poster, the public service staying unaffected before publish, publish correctly copying the video reference, the public page rendering the video after publish, `posterSrc` never persisting (checked at both create and publish time), the hero picker staying image-only, the gallery picker correctly offering both types while excluding archived assets, an archived video being rejected for a new save, a previously-published archived reference continuing to resolve, video/poster replacement propagating correctly without touching frozen JSONB, Media Library "Used by" correctly reporting the Service reference from both draft and published rows, no duplicate rows, and a snapshot-diff confirming zero unrelated changes to any real Portfolio row throughout. All temporary media assets, the temporary service, its versions, and its audit rows were deleted immediately after — confirmed via the script's own cleanup step.

### Real-data safety verification (read-only, after testing)

Confirmed unchanged: `media_assets` at 2 (the two real Phase 19A/19B assets only), `audit_log` at the same count as before this phase's automated testing began, `BRCP-1013` present, 1 lead/1 customer/4 notes, Brand `#E70810`, the real Branding service summary intact with `gallery: null` (never touched by this phase — no real Service was edited during implementation or testing), Product Packaging's real summary intact, SP Juices' real video reference still present and intact, Custom Graphic Design still published, homepage content unchanged, 7 Services/4 Portfolio projects. All 7 real services' `gallery` columns confirmed `null` on both draft and published rows — exactly the pre-phase state, since no real Service was touched during implementation (only your own upcoming manual acceptance test will do that).

### Real Graphic Design acceptance test — what was genuinely verified

Using your own real Service (`Graphic Design`, permanent id `service_fe4372a3-0936-4ee0-b601-66f4e63a5e99`) and your own real, existing video/poster (the same pair already proven in Phase 19B's SP Juices acceptance test): you opened its edit form, added the video via the corrected picker (poster thumbnail + "Video" badge — no mis-click, unlike the first Portfolio attempt), saved the draft, confirmed the live public page was unaffected, previewed and played the video, and published. Two rounds of independent read-only verification (immediately after your acceptance test, and again immediately before this commit) both confirmed, directly against Neon: the permanent service id unchanged throughout; draft and published content byte-identical; the video present exactly once with the correct `mediaAssetId` and `type: "video"`; zero `posterSrc` anywhere in either raw JSONB (confirmed by a full scan across every stored Service gallery row, not just this one); the poster correctly resolved at read time from the video's real `posterMediaAssetId`; the hero fields (`heroImageSrc`/`heroMediaAssetId`) both still `null`, confirming the hero was never touched; `findServicesReferencingMediaAsset()` correctly reporting the reference from both the draft and published rows; the Media Library's poster "Used by" still correctly reporting the relationship; no duplicate rows anywhere; a correctly owner-attributed audit trail (`service.draft_saved` then `service.published`); zero credential/token values anywhere in `audit_log`; and every other real record in the database (the other 6 Services, all 4 Portfolio projects including SP Juices' own video, Brand `#E70810`, the real Branding and Product Packaging edits, Custom Graphic Design, the homepage, leads/customers/notes/orders) confirmed completely unaffected. **This is real, live, currently-published content — not a placeholder to revert.**

### Homepage findings — investigated, documented, deliberately not implemented

Phase 19C's architecture report inspected every homepage-rendering component directly (not assumed) and found: `Hero.tsx`, `Portfolio.tsx`/`ProjectCard.tsx` (the homepage "Selected work" grid), `Services.tsx`/`ServiceCard.tsx` (the homepage service rows), `Ticker.tsx`, `Manifesto.tsx`, `Statement.tsx`, `Studio.tsx`, and `ContactForm.tsx` render **zero images and zero video today, for anyone** — confirmed by grepping every `src/components/*.tsx` file for `<Image>`/`<video>` usage. The only homepage-adjacent media fields that exist at all are `homepage_content.heroImageSrc`/`heroImageAlt` (reserved since Phase 14, plumbed through the draft-save/publish mutation, but never rendered in `Hero.tsx`'s JSX and with **no admin form field** to set them) and `site_settings.ogImageSrc` (admin-editable but never rendered — no `openGraph.images` wiring exists). This means homepage video isn't a matter of widening an existing working image slot the way Portfolio's gallery already was — every candidate area would need **net-new media rendering built from scratch**, which is real design/scope work, not an additive video-support step.

**This is why homepage video was explicitly out of scope for Phase 19C**, per your direction. The findings are preserved here for the upcoming motion/cinematic homepage phase to design around intentionally, rather than rediscovering them from scratch:

- **Poster-first loading** — any future homepage video must show a resolved poster instantly while the video itself stays unfetched (`preload="metadata"` or `preload="none"`) until either an explicit interaction or an intentional autoplay opt-in decision is made.
- **Mobile behavior** — `playsInline` remains mandatory to avoid iOS Safari's forced-fullscreen takeover; data usage must stay minimal by default.
- **LCP / Core Web Vitals** — a homepage hero is very likely to *be* the LCP candidate. A future hero video must be kept from ever counting as that candidate itself (keep it visually secondary to text, or deliberately excluded from the LCP measurement path), and should be validated against a real, throttled-mobile Core Web Vitals measurement before shipping — not assumed safe.
- **Autoplay opt-in, muted requirements, loop controls** — this phase's mandated default (`controls`, no `autoplay`, no forced `muted`, no forced `loop`) is deliberately wrong for a "cinematic background hero" look, which needs autoplay+muted (and typically loop) to read as intentional rather than as a broken, static video player sitting behind text. That tradeoff needs to be designed on purpose in the motion phase, including a real reduced-motion fallback (`prefers-reduced-motion`) and a static-image fallback for when video is skipped or fails.
- **Cinematic background vs. inline presentation** — a genuine design decision (full-bleed background video behind the hero text vs. a bounded inline video element) that this phase deliberately did not make, since it drives the entire rendering approach.
- **Admin controls** — whatever the eventual UI is (a single toggle, a video picker plus fallback image, autoplay/loop settings), it should follow the same Media Library-backed, `mediaAssetId`-referencing, poster-resolved-at-read-time pattern already proven twice now (Portfolio, Services) rather than inventing a third mechanism.

None of this is scheduled here — recorded so the motion/cinematic homepage phase doesn't have to re-derive the homepage's actual current state (100% typographic, zero working media rendering) from scratch.

### What's still not built

Homepage video, in any form (see above) — no homepage video was implemented this phase. Product gallery video (`Product.media` untouched, still no `type` field). No animation, autoplay, or motion controls of any kind (Phase 19D-1 — Motion System + Admin Controls). No AI-generated video of any kind (Phase 20 — Big Red Brain + AI Creative Studio). No new CSS — `ServiceGallery` deliberately reuses Portfolio's existing gallery classes rather than introducing Service-specific ones. See "## Roadmap" (near the end of this file) for the full, current phase timeline.

## Motion System (Phase 19D-1)

**Status: complete — the homepage has a real, database-backed, admin-controlled entrance-animation system, live-tested against your own real Motion Admin session (Save Draft → private Preview → Publish → public homepage).** Deliberately motion-only: no homepage hero media (image/video) was added or activated this phase — that's Phase 19D-2's explicit scope, not this one's.

### `motion_settings` — a fifth draft/published singleton pair, no migration surprises

`src/db/schema.ts` gained `motion_settings` (migration `0012_flimsy_pepper_potts.sql` — one `CREATE TABLE` statement, no FKs, no indexes beyond the primary key), the exact draft/published two-row pattern already proven by `brand_settings` (Phase 16) and `homepage_content` (Phase 14): `id`, `status`, `intensity`, `hero_entrance`, and one preset (+ stagger boolean where applicable) column per animatable section — `services_preset`/`services_stagger`, `statement_preset`, `portfolio_preset`/`portfolio_stagger`, `studio_preset`, `process_preset`/`process_stagger` — plus `updated_at`. Every enum column is `NOT NULL` with **no SQL-level default** (a row must always be written with an explicit value for every field; only the stagger booleans default `false`) — confirmed directly against Neon's `information_schema` before this was accepted.

The four enum vocabularies (`MotionSettingsStatus`, `MotionIntensity`, `MotionPreset`, `HeroEntrance`) live in **`src/data/motion.ts`**, not `schema.ts` — `schema.ts` only imports the *types* for its `$type<>()` column annotations, mirroring the exact `ServiceImage`/`ProjectImage` pattern already used twice. This keeps the runtime enum arrays safely importable from client components (the admin form, `MotionSection`) without pulling any `drizzle-orm` code into a client bundle. `MOTION_SETTINGS_FALLBACK` in that same file is byte-identical to the approved initial seed — the fallback a missing/unreachable row resolves to is never a different set of defaults than what real rows actually started as.

**Bootstrap seed**: a one-time, controlled script inserted exactly two identical rows (draft + published) using the approved conservative defaults — `intensity: "standard"`, `heroEntrance: "none"`, `servicesPreset`/`portfolioPreset`/`studioPreset`/`processPreset`: `"fade_up"`, `statementPreset: "reveal"`, stagger `true` on Services/Portfolio/Process — refusing to run if any row already existed, writing **no audit event** (infrastructure bootstrap, not an admin content edit, matching the exact precedent already set by the Phase 17 seed script). The script was deleted immediately after use, per this project's standing "temp scripts are never left behind" convention.

### Closed vocabulary — no path from admin (or a future AI) input to arbitrary CSS

8 presets (`none`/`fade`/`fade_up`/`fade_down`/`slide_left`/`slide_right`/`scale_in`/`reveal`), 3 intensities (`subtle`/`standard`/`bold`), and Hero's own separate 2-option set (`none`/`cinematic_reveal`) — every value a closed enum string, never a duration, easing curve, transform, or pixel distance. `src/server/mutate-motion.ts`'s `validateMotionFields()` rejects anything outside these sets before a single database write happens; every rejection was live-verified during automated testing (see below), not just asserted. This is the actual security boundary the roadmap's Phase 20 Big Red Brain section leans on: a future AI suggestion can only ever choose among these known values, never write CSS.

### Admin: `/admin/website/motion` + `/admin/website/motion/preview`

Direct architectural mirror of Brand Controls: `MotionForm.tsx` (every control a controlled `<select>` or checkbox, per the Phase 13 rule — Motion intensity, Hero entrance, and one preset selector + stagger checkbox per applicable section), `PublishMotionButton.tsx` (fieldless, copies the current draft onto the published row), `saveMotionDraftAction()`/`publishMotionAction()` (each independently calling `requireAdminUser()`, each wrapped in a transaction alongside its `recordAuditEvent()` call). A new "Motion" tile was added to the existing `/admin/website` hub — no new top-level sidebar entry, matching how Branding was added in Phase 16. The preview route renders the **real, complete homepage component tree** (`Header`, `Hero`, `Ticker`, `Manifesto`, `Services`, `Statement`, `Portfolio`, `Studio`, `Process`, `ContactForm`, `Footer`) with only the six motion-aware sections receiving `motionVariant="draft"` — not a reconstruction, and never mixed with draft brand/content state, since this preview is only about motion.

### Public motion engine — CSS transitions + one shared observer, no library

`src/components/motion-observer.ts` — a single module-scoped `IntersectionObserver` instance for the entire page (confirmed by test: exactly one `new IntersectionObserver` call in the whole file), registering/unregistering target elements via a `WeakMap`, firing each callback exactly once before unobserving — entrance animations structurally cannot repeat on scroll-back. `src/components/MotionSection.tsx` exports the `useMotionEntrance()` hook (ref + a plain `visible` boolean, deliberately **not** bundled into one object alongside the ref itself — an earlier version tripped React's new `react-hooks/refs` lint rule by doing exactly that) plus a thin `<div>`-rendering convenience wrapper used by Services/Statement/Portfolio's list container/Studio/Process. **Hero is the one exception**: `HeroMotionShell.tsx` attaches the hook's ref and data attributes directly onto Hero's own existing `<section className="hero grain">`, with zero extra wrapper `<div>` — introducing one would have broken `.hero`'s `display:flex;justify-content:space-between` reliance on its exact existing children. `PortfolioGrid.tsx` (already a client component, for category filtering) calls the hook directly on its own `.project-grid` div for the same one-fewer-DOM-node reason.

No animation package was installed — confirmed by both a `package.json` diff and an automated test asserting no `framer-motion`/`gsap`/`motion`/`react-spring`/`lottie` string appears anywhere in it.

### Presets, intensity, and the stagger cap

Every preset animates only `opacity`/`transform`/`clip-path` (never `filter`/`blur`), scaled by one of three intensity tiers via CSS custom properties (`--motion-distance`/`--motion-duration`, set once per `[data-motion-intensity]` and inherited down through the DOM — this is what lets Hero's Cinematic Reveal read the same intensity setting as every other section without re-deriving it). One fixed, restrained easing curve (`cubic-bezier(.16,.84,.44,1)`) is reused everywhere — no bounce, no overshoot, matching the explicit "premium editorial, not template" brief. `reveal` uses a `clip-path` wipe rather than a plain fade, giving Statement (its default preset) a genuinely distinct, more "unveiling" character than the fade/slide/scale family.

**Stagger is capped at 6 children** — index 1 through 5 receive individually increasing 90ms-stepped delays (0/90/180/270/360ms), and every child from index 6 onward shares one final 450ms delay (`:nth-child(n+6)`), so a long Services/Portfolio/Process list never keeps visibly animating in one-at-a-time for more than roughly half a second. Both the step value and the cap are fixed in `globals.css`, never exposed to the admin form — confirmed both by direct CSS inspection and by an automated test.

### Hero "Cinematic Reveal" — motion only, no media

Coordinates the Hero's **existing** typographic elements (`.hero-sticker` badges, `.hero-meta`, `h1`, `.hero-tagline`, `.hero-foot`) with fixed sequential delays (0/80/180/300/400ms) and the same restrained fade+lift treatment every other preset uses — no per-letter animation, no rotation, no bounce, per your explicit instruction. This is a small, separate option set from the generic 8-preset vocabulary (`HeroEntrance`, not `MotionPreset`) specifically because it coordinates several named elements as one sequence rather than animating a single element.

### Reduced motion — mandatory, unconditional, CSS-only

A single `@media (prefers-reduced-motion: reduce)` block forces `opacity:1`, `transform:none`, `clip-path:none`, `transition:none`, `transition-delay:0ms`, and `animation:none` with `!important` on every motion-bearing selector — content is fully visible in its final state regardless of whether JavaScript ever runs. `useMotionEntrance()` also checks `prefers-reduced-motion` at the JS layer (skipping the observer entirely for these visitors), but that's a pure optimization — the CSS override is the actual, unconditional guarantee, confirmed by an automated test reading the compiled CSS directly rather than trusting the JS branch alone.

### Admin/public isolation

`admin.css` contains no `data-motion`-anything rule, and no file under `src/app/admin` imports `MotionSection` or `HeroMotionShell` — confirmed by an automated directory walk, not just by intent. The one preview route is the sole exception, and it renders the real *public* components (which already carry their own motion behavior), not an admin-styled reconstruction.

### Automated regression testing

Since `motion_settings` is a singleton draft/published **pair** — unlike Portfolio/Services, there's no way to spin up an isolated temporary entity — the test script temporarily changed the **real** rows' values, exercised the full save/validate/publish/audit/CSS-mapping/isolation surface (25 checks, covering exactly the items later re-verified in the real acceptance pass below), then **restored both rows to the approved seed exactly** and deleted the two test-generated audit rows, all confirmed by the script's own output before the temp script was deleted. **25/25 passed.**

### Real acceptance test — what was genuinely verified

Using your own real session through `/admin/website/motion` (not seeded, not synthetic): you set **Motion intensity to Bold**, **Hero entrance to Cinematic Reveal**, and chose real per-section presets (**Services: Slide Right + stagger, Portfolio: Scale In + stagger, Statement: Reveal, Studio: Fade Up, Process: Fade Up + stagger**), saved the draft, confirmed the public homepage stayed on the old settings, opened the private preview and reviewed the animations, then published. Two independent rounds of read-only verification (immediately after your test, and again before this commit) both confirmed, directly against Neon:

- Exactly 2 `motion_settings` rows, one draft/one published, byte-identical to each other after publish.
- Every field a real, valid enum value — `intensity: "bold"`, `heroEntrance: "cinematic_reveal"`, `servicesPreset: "slide_right"` (stagger `true`), `statementPreset: "reveal"`, `portfolioPreset: "scale_in"` (stagger `true`), `studioPreset: "fade_up"`, `processPreset: "fade_up"` (stagger `true`) — no arbitrary/CSS-shaped string anywhere in storage.
- `getPublishedMotionSettings()` and `getDraftMotionSettings()` (the real, unmodified query functions) each return exactly what their respective row holds.
- A correctly owner-attributed audit trail: `website.motion.draft_saved` then `website.motion.published`, metadata limited to exactly `{intensity, heroEntrance, servicesPreset, portfolioPreset}` — no CSS values, no credentials, confirmed by pattern-scanning the actual stored metadata.
- Reduced-motion CSS, the 6-child stagger cap, and admin/public isolation all re-confirmed intact by direct source/CSS inspection.
- Homepage content itself unchanged (`heroImageSrc` still `null` — untouched, exactly as this phase promised), and every other real record (`media_assets`=2, SP Juices' video, Graphic Design's video, BRCP-1013, 1 lead/1 customer/4 notes, Brand `#E70810`, the real Branding and Product Packaging edits, Custom Graphic Design published, 7 Services, 4 Portfolio projects) confirmed completely unaffected.

**`intensity: "bold"`, `heroEntrance: "cinematic_reveal"`, and the real per-section presets above are your genuine, live, currently-published motion settings — real acceptance-test history, not placeholders to revert.**

### What's still not built

Homepage hero media (image/video) — explicitly Phase 19D-2's scope, not touched here. Parallax (deliberately dropped from the v1 admin-exposed preset list during architecture review — see that report's reasoning on jank/performance risk). Any raw duration/easing/distance admin control — never planned; the closed-preset-plus-intensity model is the permanent design, not a v1 simplification awaiting a v2 "advanced mode." Contact and Footer motion (deliberately excluded, per approval). Manifesto motion (left out of v1 to keep the first system focused, per your own explicit instruction).

## Cinematic Homepage Hero Media (Phase 19D-2)

**Status: complete — the homepage Hero can now show an optional inline image or video alongside its existing typography, backed by the same permanent-`mediaAssetId`-plus-read-time-resolution pattern already proven on Product, Brand, Service hero, Portfolio hero, and both video galleries. Live-tested against your own real video selection/save/preview/publish.** Deliberately **inline cinematic media only** — no background/full-screen video, no autoplay, no forced mute/loop, no AI generation, no Big Red Brain involvement. Motion-only Phase 19D-1 stays untouched; this phase only adds media into the slot Cinematic Reveal already animates.

### Schema — one additive column, no new migration surprises

`homepage_content.heroMediaAssetId` (migration `0013_bouncy_forgotten_one.sql`, already applied and verified before implementation began) — nullable `text`, FK → `media_assets.id`, `ON DELETE SET NULL`. Deliberately **no** separate "hero media type" column (an asset's own `media_assets.type` is already authoritative, resolved at read time) and **no** separate hero-specific poster column (a video's poster relationship already lives on the video asset itself via `posterMediaAssetId`, Phase 19A, resolved the same way Portfolio/Service hero media already is). `heroImageSrc`/`heroImageAlt` (reserved since Phase 14) remain the legacy/manual **image** fallback, used only when `heroMediaAssetId` is null — untouched, not repurposed.

### Mode normalization — derived from field presence, not a client-sent "mode"

`normalizeHeroMediaFields()` in `src/server/mutate-website-content.ts` is the one place that decides what's allowed to reach the database: a Media Library selection (`heroMediaAssetId` present) always wins and forces `heroImageSrc` null; otherwise a non-empty `heroImageSrc` means the legacy manual path; otherwise None. Critically, **the server never receives a "mode" field from the client at all** — mode is entirely re-derived from which raw values are present, which is what makes client-side mode spoofing structurally impossible rather than merely discouraged. `HeroMediaField.tsx` clears the other mode's stale state client-side on every mode change (first line of defense), but `normalizeHeroMediaFields()` — called before validation, with its output spread *after* the raw form values in the final `.set()` call — is the actual, authoritative enforcement point.

### Server-side asset validation — both image AND video, unlike Portfolio/Service

`validateHeroMediaAsset()` independently re-verifies, on every draft save, that a submitted `heroMediaAssetId` exists, is `status: "active"`, and is a supported type — never trusting the admin picker's own filtering. This deliberately checks **both** image and video references (Portfolio/Service galleries only async-validate video items, since their hero image field stays picker-filtered-image-only) — Hero's single slot can legitimately be either type, so both need the same real-asset guarantee. A previously-published reference to an asset that later becomes archived keeps resolving fine at read time; only a *new* draft save is rejected.

### Read-time resolution — `resolveHeroMedia()`

Direct structural port of `resolveProjectsMedia()`/`resolveServicesMedia()`'s two-pass shape, sized to Hero's single slot: resolve `heroMediaAssetId` to its live asset (any status — an already-published reference to a since-archived asset must keep resolving); if that asset is a video with its own `posterMediaAssetId`, batch-resolve that too. The resolved `HeroContent` object exposes `heroMediaMode` (`"none" | "image" | "video"`, read-time-only, never persisted), `heroVideoSrc`/`heroPosterSrc` (video-only, never persisted), and `heroImageSrc` (overwritten with the Library asset's live Blob URL only in image mode — otherwise the legacy manual path or null, exactly the same convention already proven for `ServiceImage.src`). `getDraftHeroContent()` is a new function — the equivalent of `getPublishedHeroContent()` keyed to the draft row, used exclusively by the admin preview.

### Admin Hero Media field

`HeroMediaField.tsx` — a controlled `None`/`Image`/`Video` select. Image mode offers an image-only Media Library picker plus the original manual-path input (mutually exclusive — selecting a Library image clears the manual path, and vice versa). Video mode offers a video-only picker whose tiles show the video's own poster thumbnail with a "Video" badge overlay, or a "Video (no poster set)" text fallback when no poster exists — the same anti-mis-click fix already proven on Portfolio and Service gallery pickers, applied here proactively. No raw Blob URL is ever shown to the admin. Serializes to three flat hidden inputs (`heroMediaAssetId`/`heroImageSrc`/`heroImageAlt`), matching every other flat field on this form rather than the JSON-array pattern repeatable editors use.

### Public Hero rendering — bounded, reserved, never full-bleed

`Hero.tsx` renders a `.hero-media` box as a 5th child of `.hero`'s existing flex layout, only when `heroMediaMode !== "none"` — a fixed `max-width:640px;aspect-ratio:16/9` reserved box (mirroring `.project-hero-media`'s bordered/shadowed treatment, the closest existing "hero media" precedent, rather than inventing a new visual language) so its presence/absence never shifts the typography above, which stays the visual priority. Image mode uses `next/image` (`fill`, `sizes`, authored alt, `object-fit:cover`). Video mode reuses the existing `VideoMedia` component completely unmodified — `controls`, `playsInline`, `preload="metadata"`, poster when available, **no autoplay, no forced mute, no forced loop** — `object-fit:contain` with a black letterboxed background, matching every other video-in-a-box treatment in this codebase. No second video-player implementation was created.

### Motion integration — media joins Cinematic Reveal, never drives it

`.hero-media` was added to the existing `cinematic_reveal` sequence at `transition-delay:500ms` (100ms after `.hero-foot`'s existing 400ms) and to the mandatory `prefers-reduced-motion` override list. No `video.play()` call exists anywhere, no `IntersectionObserver` is connected to playback, no second animation library was introduced, no scroll listener was added — motion only ever touches `opacity`/`transform` on the wrapping box; the video element itself is untouched by the motion system, and playback stays entirely user-initiated regardless of the motion state.

### Draft/preview/publish — plus a real, pre-existing bug fixed along the way

Save Draft writes only the draft row; Publish copies `heroMediaAssetId` (alongside every other hero column) onto the published row inside the existing transaction — no separate immediate/public hero-media mutation path exists outside this workflow. **A genuine pre-existing inconsistency was found and fixed as part of this phase**: `/admin/website/homepage/preview` previously always rendered with **published** motion settings, unlike `/admin/website/motion/preview`, which already correctly used draft motion. Since this exact file needed to change anyway to add hero-media preview support, the preview page now calls the new `getDraftHeroContent()` and passes `motionVariant="draft"` to `Hero`, so the private preview genuinely represents what Publish will make live — draft content, draft hero media, and draft motion together. The public homepage is unaffected: `Hero`'s `motionVariant` prop still defaults to `"published"` everywhere else.

### Usage scanning

`findHeroMediaUsage()` (`src/server/queries/media.ts`) — a plain column-equality scan (not JSONB containment, since `heroMediaAssetId` is a scalar column) — reports "Homepage Hero" on `/admin/media/[id]`'s "Used by" panel, distinguishing a draft-only reference from a published one exactly like the existing Service/Portfolio draft-vs-published distinction. Every pre-existing usage scan (product/service/portfolio/poster) is unmodified and unaffected.

### Automated regression testing

Since `homepage_content` is a singleton draft/published **pair** — the same constraint `motion_settings` and `brand_settings` share — the test script temporarily mutated the **real** rows (after snapshotting them to disk) and temporary `media_assets` rows (clearly `test-phase19d2-`-tagged), exercised the full normalization/validation/save/resolve/publish/mode-transition/archived-asset/usage-scanning surface (**40/40 checks passed**), then a separate HTTP-based check against a temporary local dev server confirmed real rendered markup for all three modes — video (`controls`, `playsInline`, `preload="metadata"`, correct poster, correct src, **no** autoplay/muted/loop attributes present), image (`next/image` markup with correct alt and srcSet), and none (zero `.hero-media` divs, Cinematic Reveal attributes unaffected) — before the temporary server was killed, the real draft/published rows were restored to their **exact** pre-test snapshot, and every temp media asset was deleted.

### Real acceptance test — what was genuinely verified

Using your own real Homepage Hero workflow (not seeded, not synthetic): you selected your legitimate Media Library video, saved the draft, verified it in the private preview (video, poster, user-initiated playback, native controls, Cinematic Reveal, responsive layout all confirmed working), confirmed the public homepage stayed unchanged before publishing, then published and confirmed the video is now live on the public homepage. Two rounds of independent read-only verification (47 checks total) both confirmed, directly against Neon:

- Exactly 2 `homepage_content` rows, one draft/one published, with identical `heroMediaAssetId` after your publish.
- The referenced asset exists exactly once, `type: "video"`, `status: "active"`, permanent id stable across draft and published.
- `heroImageSrc` is `null` on both rows — no Blob URL, no posterSrc, and no copied media type were ever persisted into `homepage_content` (the table structurally has no columns for any of those — resolution is 100% read-time).
- `getPublishedHeroContent()`/`getDraftHeroContent()` both correctly resolve the current video Blob URL and, via the video's own `posterMediaAssetId`, the current poster URL — the poster asset independently confirmed to be a real, active image.
- **Your real Homepage Hero now references the exact same permanent Media Library video asset already used by SP Juices' portfolio gallery (Phase 19B) and the Graphic Design service's gallery (Phase 19C)** — confirmed by comparing `media_assets.id` across all three references, not just by filename. This is the Media Library's core "one asset, resolved everywhere it's referenced" guarantee, now proven across three genuinely independent consumers.
- Homepage Hero usage scanning correctly reports both a draft and a published reference; poster usage scanning correctly reports "poster for video" for the same asset — both regression-free against the pre-existing product/service/portfolio scans.
- `media_assets` remains exactly 2 rows, no duplicates by id.
- Motion settings unaffected: published `heroEntrance: "cinematic_reveal"`, `intensity: "bold"`, matching Phase 19D-1's real published values exactly; draft motion (what the preview reads) matches too.
- A correctly owner-attributed audit trail (`website.hero.draft_saved` then `website.hero.published` as the two most recent `homepage_content` events), metadata limited to `{headlineLead}` — no Blob URLs, tokens, credentials, or PII found anywhere in the scanned metadata.
- Every other real record confirmed completely unaffected: BRCP-1013, 1 lead/1 customer/4 notes, Brand `#E70810`, the real Branding service and Product Packaging edits, Custom Graphic Design published, 7 Services, 4 Portfolio projects.
- Migration `0013_bouncy_forgotten_one.sql` remains the only Phase 19D-2 schema migration; migrations 0000–0012 confirmed byte-unchanged (`git status` shows no modifications to any existing migration file, only the new 0013 file and its accompanying journal/snapshot metadata).

**One honest, non-blocking gap found during this verification**: both the draft and published rows currently have `heroImageAlt: null`, and the referenced video asset's own `alt` field is an empty string — meaning the live video's `aria-label` is currently empty on the public homepage. The "Accessibility label" field in the admin Hero Media form is optional (not `required`), so nothing prevented publishing without it. This is not a code defect — every other accessibility guarantee this phase promised (native controls, keyboard-operable playback, no autoplay) is intact — but it's a real, current gap worth closing: filling in that one field from `/admin/website/homepage` (Save Draft → Preview → Publish) is all that's needed.

### What's still not built (documented, not silently deferred)

**No background/autoplay cinematic Hero treatment** — this phase deliberately built the safe inline path only (`controls`, no autoplay, no forced mute/loop); a full-bleed background-video hero remains a later, separate enhancement, attempted only once the inline path has real usage behind it, per the original Phase 19D-2 scope decision. **No captions/transcript system** — video accessibility today is limited to the native `<video>` element's own controls and an admin-authored `aria-label`; no caption track (`<track kind="captions">`) or transcript exists anywhere in this codebase, for the Hero or any other video consumer, and this is not claimed as solved. **No advanced Hero presentation controls** — no per-video autoplay/muted/loop/object-fit override, no aspect-ratio choice, no multiple-hero-media-item support; the Hero has exactly one optional media slot, matching the approved v1 scope. **No AI generation of any kind** — hero media selection is 100% manual, admin-driven, from assets already uploaded through the existing Media Library upload flow; Big Red Brain and AI Creative Studio remain entirely unbuilt (Phase 20).

## Big Red Brain Foundation (Phase 20A)

**Status: complete — a real, working, cost-accurate READ + RECOMMEND AI assistant at `/admin/brain`, backed by OpenAI's `gpt-5.6-luna`, live-tested against two real requests (one genuine billing/quota failure, one real success).** Deliberately the narrowest possible first slice: no database mutation tools exist anywhere in this phase, no entity-specific context builders (Phase 20B), no image/video generation (AI Creative Studio, future), no DRAFT-write actions. Big Red Brain can only ever read business data and produce a text answer for the owner to read — it cannot change anything.

### Architecture — provider-neutral by construction

```
AskBrainForm (client)
  → requestBrainAnswerAction (mutate-brain.ts, "use server", requireAdminUser() first line)
  → handleBrainRequest (src/server/brain/handle-request.ts — the real logic, NO next/navigation
                          dependency, so it's directly unit-testable with an injected provider)
      → validation (request type, question length, daily cap)
      → buildDashboardContext() (aggregate-only business data)
      → buildUserPrompt() (system instructions + labeled, delimited DATA block)
      → provider.generateText() (the TextProvider interface — see below)
      → buildUsageMetadata() / buildResponseSummary() / buildPromptSummary()
      → one brain_requests row + audit event(s), inside one db.transaction()
```

`mutate-brain.ts` is a thin Server Action boundary only — the real logic living in `handle-request.ts` (no `requireAdminUser()`/`next/navigation` import) is what let the automated regression suite exercise the entire pipeline with a `MockTextProvider`, without a live session or a real API credit. This split was discovered mid-implementation: the original single-file version crashed a plain Node test script the moment it imported `requireAdminUser()`, the same class of constraint every prior phase's regression harness has hit — this time solved architecturally instead of worked around with a duplicated harness copy.

### Provider abstraction

`src/server/brain/providers/text-provider.ts` defines the one interface (`TextProvider.generateText()`) every part of Big Red Brain talks to. **`src/server/brain/providers/openai.ts` is the only file in this codebase allowed to import the `openai` package** — nothing else knows OpenAI exists. `src/server/brain/providers/registry.ts` is the one place a real provider is selected, purely from server configuration — no request field, form input, or admin UI choice can ever select a different provider or model. `src/server/brain/providers/mock.ts` is a deterministic, network-free `TextProvider` used only by the automated test suite.

### The OpenAI provider

Uses the **Responses API** (`client.responses.create`) — confirmed directly against `developers.openai.com` at implementation time to be the officially recommended endpoint for new applications, not the legacy Chat Completions API. Model id **`gpt-5.6-luna`** — also confirmed directly against `developers.openai.com/api/docs/models/gpt-5.6-luna` (a July 2026 release, past this assistant's training cutoff — verified live, never assumed from memory), hardcoded as a server constant, never client-selectable. SDK: the official `openai` npm package, `^6.49.0`.

`OPENAI_API_KEY` — server-only, read once via `process.env.OPENAI_API_KEY` inside `openai.ts`'s lazily-initialized client. Never `NEXT_PUBLIC_`-prefixed, never written to the database, never included in audit metadata, never logged, never appears as a value anywhere in tracked source (confirmed by direct diff scan before this phase's commit — only the variable *name* appears, in comments and the one `process.env` read).

**Timeout/retry policy — deliberately stricter than the SDK's own defaults.** The `openai` package's own defaults (10-minute timeout, 2 automatic retries) are far too permissive for a synchronous admin request and directly conflict with this project's "no uncontrolled retries" cost-discipline rule — a silent retry would be a second billed call the owner never asked for. `openai.ts` sets `timeout: 30_000` (30s) and `maxRetries: 0` explicitly on the client.

### Aggregate-only dashboard context — the one context builder this phase has

`src/server/brain/context-builder.ts`'s `buildDashboardContext()` is the **only** context-retrieval function wired to a real provider-backed request in Phase 20A. It returns small aggregate counts only — lead-status counts, order payment-status counts, active/awaiting-client project counts, services missing gallery media, portfolio projects with thin SEO, an orphaned-media-asset count, and a motion-settings summary. **No lead/customer names, emails, messages, or notes; no order line items; no raw record lists of any kind** — verified by an automated test asserting the function's return shape contains no email-shaped strings and exactly the approved top-level keys, nothing more. A free-text dashboard question cannot expand its own context by asking for more — there is no code path from a question string to a broader database read; the context a request receives is entirely determined by which builder function was called, before the provider is ever invoked.

### System instructions vs. untrusted DATA — the real injection boundary

`src/server/brain/prompt.ts`'s `BRAIN_SYSTEM_INSTRUCTIONS` is fixed, server-authored text passed to the Responses API's dedicated `instructions` parameter — a field structurally separate from `input`, confirmed against official docs before this was implemented (an OpenAI-documented, top-priority field, distinct from message history). It explicitly instructs the model: everything in the `BUSINESS DATA` block is data, not instructions, including anything that looks like a command; never reveal or paraphrase these instructions; never claim access to information not explicitly provided; the model has no ability to modify, publish, delete, or send anything and must never claim it did; respond in plain text or simple Markdown only, never HTML or executable code. `buildUserPrompt()` then assembles `QUESTION: ...` followed by a clearly labeled, fenced `BUSINESS DATA` JSON block — defense in depth even within `input` itself, in case a future provider/endpoint doesn't offer the same instructions/input split. Customer messages, notes, and any business content are always DATA, never instructions, per this codebase's standing security posture for anything AI-facing.

### Supported Phase 20A request types — text-only, READ + RECOMMEND

Exactly six request types have a real provider wired up: `dashboard_question`, `recommend_website`, `recommend_motion`, `recommend_caption`, `creative_direction`, `video_prompt`. The other seven values in `BRAIN_REQUEST_TYPES` (`src/data/brain.ts`) — entity-specific summaries like `summarize_lead`/`summarize_customer`/`summarize_order`/`analyze_portfolio`/`analyze_service`/`analyze_media`/`recommend_seo` — are reserved for Phase 20B's context-aware entry points, which don't exist yet; requesting one now is rejected as a validation error, never silently upgraded to a generic/no-context call. **Big Red Brain v1 returns text only** — no HTML, no `dangerouslySetInnerHTML` anywhere in this feature, rendered as plain text with `white-space: pre-wrap` (a markdown renderer was deliberately not added — no new dependency for a v1 cosmetic improvement).

### No database mutation tools exist — the actual enforcement mechanism

Big Red Brain cannot autonomously publish, delete, change payment status, issue refunds, or modify anything, **not because the model is instructed not to, but because no tool that could do any of those things is ever given to it.** There is no generic "run this query" or "update this table" capability anywhere in this subsystem — `src/server/brain/prompt.ts` has zero database/SQL access of any kind (verified by an automated test scanning the file's own source). This is the same structural-absence-over-instruction principle this codebase has used for every other authorization boundary since Phase 12.

### Safe summaries — deliberate, not "first N characters"

`src/server/brain/safe-summary.ts`'s `buildPromptSummary()`/`buildResponseSummary()` strip fenced code blocks, HTML-like tags, and control characters, collapse whitespace, and only then truncate at a word boundary to `BRAIN_PROMPT_SUMMARY_MAX_LENGTH` (240) / `BRAIN_RESPONSE_SUMMARY_MAX_LENGTH` (500) — both constants in `src/data/brain.ts`. **v1 does not make a second AI call to summarize the response** — that would double the cost of every request for a cosmetic history-list improvement; deterministic sanitize-then-truncate is judged sufficient for a short admin-facing label, documented honestly as a v1 choice rather than presented as if it were AI-generated.

### `brain_requests` — the persistence/history table

Migration `0014_furry_the_call.sql` — one purely-additive `CREATE TABLE`, one FK, three indexes, zero changes to any existing table. Columns: `id` (uuid PK), `requested_by_admin_user_id` (uuid, FK → `admin_users.id`, `ON DELETE SET NULL`), `request_type`/`request_source` (closed vocabularies, validated against `src/data/brain.ts`'s enums), `related_entity_type`/`related_entity_id` (polymorphic, application-level only — no FK, the same accepted tradeoff `notes.entityType`/`entityId` and `audit_log.entityType`/`entityId` already make; always `null` in Phase 20A since only the dashboard context exists), `prompt_summary` (required), `response_summary` (nullable — null on failure), `provider`/`model` (free text, not enums — a provider/model name changes faster than this schema should chase), `status` (`completed`/`failed` only this phase — `pending`/`running` are deliberately excluded until an async generation-job table exists), `usage_metadata` (jsonb), `error_category` (nullable, closed vocabulary), `created_at`.

**This table stores safe summaries and metadata only.** It has never stored, and structurally cannot store, a full assembled prompt, full provider response, full business context, an API credential, an environment variable, or arbitrary provider metadata — confirmed by direct column-by-column inspection against `information_schema` before this commit, and by an automated test scanning every persisted field for PII/credential-shaped strings.

### Usage metadata — integer microdollar accounting

`usage_metadata` (jsonb) holds exactly `{ inputTokens?, cachedInputTokens?, outputTokens?, estimatedCostMicros?, actualCostMicros? }` — built field-by-field from the provider's real usage figures in `src/server/brain/cost.ts`, never a spread/forward of OpenAI's raw usage object (which could carry additional, unreviewed keys).

**All cost arithmetic is integer microdollars (1 USD = 1,000,000 microdollars), not cents.** This was a real, approved mid-phase correction: GPT-5.6 Luna's real per-request cost is frequently sub-cent (the real first successful request cost $0.001843 — see below), and integer cents would have silently rounded that to $0.00 in stored history. Microdollars keep every value an exact integer with zero rounding error, since all three published per-token rates convert to a whole number of micros per token. `formatMicrosAsUsd()` is the one display-only conversion point — never used for storage.

**Cached-input pricing is handled correctly, not as a flat discount.** `usage.inputTokens` is the TOTAL input token count reported by the Responses API; `cachedInputTokens` is a billed-differently *subset* of it (confirmed against the real API's `usage.input_tokens_details.cached_tokens` field), never additional to it. `calculateCostMicros()` computes `uncachedInputTokens = inputTokens - cachedInputTokens` before pricing, so the cached slice is never double-billed at the full rate: $1.00/1M for uncached input, $0.10/1M for cached input (a 10x discount), $6.00/1M for output — all three rates are server-owned constants in `cost.ts`, never accepted from client input.

### Cost guardrails

`DAILY_BRAIN_REQUEST_CAP = 20` — a hard request-count limit (not cost-based), approved as a deliberately low v1 starting point for a single-admin business; exceeding it writes a `failed`/`budget_exceeded` row and rejects the request before any provider call happens. `MONTHLY_COST_WARNING_THRESHOLD_MICROS = 20_000_000` ($20.00) — a **warning only**, surfaced as a plain read-only "Spend this month" line on `/admin/brain`, never a block; blocking at this threshold would require a future, separately-approved decision. `max_output_tokens: 600` is always set on every call, never left to a provider default. No automatic retries, no recursive/chained AI calls — every request in v1 is exactly one provider round trip.

### Failure categorization

`src/data/brain.ts`'s `BRAIN_ERROR_CATEGORIES` (`provider_error`/`rate_limited`/`invalid_response`/`timeout`/`budget_exceeded`/`validation_error`) is a closed vocabulary — the provider's own exception is never stored or logged raw. `openai.ts`'s `mapOpenAIError()` maps the SDK's real error hierarchy (`APIConnectionTimeoutError` → `timeout`; `APIError` with `status === 429` → `rate_limited`; `status >= 500` → `provider_error`; anything else → `provider_error`/`validation_error`) to one of these categories. **A known, documented limitation surfaced by the real first failed request**: the current mapping discards the provider's actual `status`/`code`/`type` fields before they ever reach a log line, so a 429 can currently only be reported as "rate_limited" — it cannot yet distinguish genuine request-rate throttling from a billing/quota-exhaustion 429 (OpenAI's API returns the same HTTP status for both). This is a real, safe (no secrets involved either way), server-console-only logging gap — not fixed this phase, since the failure history it produced is exactly the kind of honest acceptance record this project preserves rather than papers over.

### Audit events

`brain.requested` and `brain.recommendation_generated` — both written on a successful request, inside the same transaction as the `brain_requests` insert. `brain.request_failed` — a new audit action, approved this phase as the natural failure counterpart to the other two; metadata limited to exactly `{ requestType, requestSource, errorCategory }`. `brain.requested` is also written (alone) when a request is rejected by the daily cap, with `errorCategory: "budget_exceeded"` on the `brain_requests` row. Metadata across all three actions is verified, by automated test, to contain no prompt, no response text, no PII, and no credentials — matching the exact minimal-metadata convention every other audit event in this codebase already follows.

### `/admin/brain`

The existing reserved "Big Red Brain" sidebar entry (disabled since Phase 12) is now `available: true`. The page itself makes **zero AI provider calls on load** — "What needs my attention today?" is generated entirely from `buildDashboardContext()` (a plain database read, the same class of query every other admin page already runs), confirmed by an automated test scanning the page's own source for any provider/generateText reference. Below that, "Ask Big Red Brain": a free-text question plus five safe preset buttons ("What should I focus on today?", "How can I improve the website?", "Review my current motion setup.", "Give me a marketing idea.", "Prepare a branding-video concept.") that only ever fill in the question field — **only clicking Submit ever calls the provider**, also verified by automated test.

### Recent Brain Activity

A read-only history list on `/admin/brain` (`getRecentBrainActivity()`, `src/server/queries/brain.ts`) showing the 10 most recent requests: timestamp, request type, status badge, provider/model, token counts (including cached), and the display-formatted microdollar cost — never a raw prompt or full response, only the stored safe summary.

### Real acceptance test — what was genuinely verified

**First real request — "What should I focus on today?" — failed, honestly preserved, not deleted:**

OpenAI returned HTTP 429, safely categorized as `rate_limited`. The provider was genuinely reached (a 429 is a real, structured HTTP response — TLS, auth, and request parsing all succeeded before the rejection). The most likely real-world cause was initial API billing/quota setup on a brand-new key, not genuine request-rate throttling (implausible for a literal first call) — though, per the failure-categorization limitation documented above, this could not be conclusively distinguished from the data available. **No tokens were consumed and no cost was recorded** — confirmed directly: `usage_metadata: null`, since a 429-rejected request is never billed by OpenAI. The failed `brain_requests` row and its single `brain.request_failed` audit event remain in the database exactly as they were produced — genuine, permanent acceptance history, not test data to clean up.

**Second real request — same question, retried after configuring OpenAI billing — succeeded:**

```
status:             completed
provider / model:        openai / gpt-5.6-luna
inputTokens:           565
cachedInputTokens:        0
outputTokens:           213
actualCostMicros:        1843
actual cost:           $0.001843
```

This is a real, live-verified sub-cent cost — proof the microdollar accounting fix works correctly in production, not just in the offline test suite (1843 micros would have rounded to $0.00 under the old integer-cents scheme). The response itself was a genuine, on-topic recommendation referencing this business's real data (the one real unpaid order, the one real active project, the real count of services missing gallery media) — confirmed to contain no fabricated facts, matching the system instructions' explicit "never claim access to information not supplied" rule. The successful `brain_requests` row, its `brain.requested` event, and its `brain.recommendation_generated` event all remain in the database, correctly owner-attributed — genuine acceptance history.

**`brain_requests` now permanently holds exactly 2 real rows (1 failed, 1 completed) and `audit_log` holds exactly 3 real `brain.*` events — this is your genuine, live Big Red Brain usage history, not placeholder or test data to revert.**

### Security / privacy boundaries

`OPENAI_API_KEY` confirmed, by direct scan before this commit, to appear nowhere as a value: not in `brain_requests`, not in `audit_log` metadata, not in tracked source (only the variable name), not in server logs. Every Big Red Brain Server Action independently calls `requireAdminUser()` as its first line, per the standing rule since Phase 12. Customer/lead/order content is never sent to the provider beyond the small aggregate counts `buildDashboardContext()` explicitly allows — no message text, no notes, no names, no emails. OpenAI's own data-retention policy (confirmed against current docs): API inputs/outputs are not used for model training, but are retained up to 30 days for abuse monitoring by default (this project has no Zero Data Retention agreement) — the aggregate-only context design is a direct, deliberate mitigation for that retention window, not an incidental side effect.

### What's still not built (documented, not silently deferred)

Any DRAFT-write tool — Big Red Brain cannot yet stage a change into any existing draft/publish system, even with approval; that remains a future, separately-scoped subphase (Phase 20C). AI Creative Studio, image generation, video generation, and testimonial-reel generation — entirely unbuilt. A precise billing-vs-rate-limit distinction in failure categorization (documented above as a known, safe, non-blocking gap). A monthly-spend UI element beyond the plain read-only "Spend this month" line — no alert/notification system exists. Entity-specific context builders and detail-page entry points — built in Phase 20B, see below.

## Big Red Brain Context-Aware Entry Points (Phase 20B)

**Status: complete — "Ask Big Red Brain" entry points now exist on the Customer, Order, Portfolio, Service, and Media admin detail pages, each independently context-aware, still strictly READ + RECOMMEND. Live-tested against all five real entity types in one real acceptance session — every request succeeded, cost $0.0135 combined, and left zero PII or business content in `brain_requests`/`audit_log` beyond what was explicitly approved.**

### The five entry points

Each detail page renders one `<AskBrainForm>` block with entity-specific presets:

- **Customer** (`/admin/customers/[id]`) — "Summarize this customer", "What should I follow up on?", "What opportunities do you see?", "What should I do next?" — all `summarize_customer`.
- **Order** (`/admin/orders/[id]`) — "What needs my attention?", "Is anything blocking this project?", "What should happen next?", "Summarize this order", "Review payment/work status" — all `summarize_order`.
- **Portfolio** (`/admin/portfolio/[id]`) — "Critique this project" / "How can I improve this case study?" / "What should I highlight?" (`analyze_portfolio`), "Suggest better SEO" (`recommend_seo`), "Suggest promotional copy" (`recommend_caption`).
- **Service** (`/admin/services/[id]`) — "Critique this service" / "How can I position this better?" / "What content is missing?" (`analyze_service`), "Suggest marketing ideas" (`recommend_caption`), "Suggest SEO improvements" (`recommend_seo`).
- **Media** (`/admin/media/[id]`) — "Where could I use this asset?" / "How does this fit my existing website?" (`analyze_media`), "Suggest promotional uses" (`recommend_caption`), "What content could I build around this?" (`creative_direction`).

Every `requestType` above already existed in Phase 20A's closed `BRAIN_REQUEST_TYPES` vocabulary — `recommend_seo` (previously reserved, unused) activated here for the first time, and `recommend_caption`/`creative_direction` are deliberately **reused** across Portfolio/Service/Media rather than duplicated into entity-specific type names. No new request type was invented.

### Shared `AskBrainForm` architecture — one component, five call sites

`src/components/admin/AskBrainForm.tsx` gained three optional props (`requestSource`, `relatedEntityType`, `relatedEntityId`) plus a `presets` override — the exact same component Phase 20A's dashboard already used, not five independent Brain forms. This mirrors `NoteForm.tsx`/`NotesList.tsx`'s established Phase 18B pattern (one generic component, bound per entity) rather than inventing a new one. The client submits **only** five raw strings — `question`, `requestType`, `requestSource`, `relatedEntityType`, `relatedEntityId` — never a context object, never an entity label, never anything resembling business content.

### Server-side entity re-fetch — the real trust boundary

Nothing submitted by the client is trusted as already-correct structure. `src/server/brain/handle-request.ts`'s `resolveRequestContext()` independently re-fetches the referenced entity via the same, already-safe admin query functions every other admin page already uses (`getCustomerById`, `getOrderById`, `getPortfolioEntityForAdmin`, `getServiceEntityForAdmin`, `getMediaAssetById`) — a malformed id, a nonexistent id, or a real id submitted under the wrong `relatedEntityType` are all rejected as a clean `validation_error` before any context is built or any provider call happens. Live-verified: a real customer id submitted as `relatedEntityType: "order"` is correctly rejected (the order lookup finds no matching row).

### `requestSource` ↔ `requestType` ↔ `relatedEntityType` compatibility matrix

Two fixed lookup tables in `handle-request.ts`:
- `SOURCE_TO_ENTITY_TYPE` — `brain_dashboard` → no entity; each of the other five sources → exactly one required `BrainRelatedEntityType`.
- `TYPE_TO_ALLOWED_SOURCES` — every value in `BRAIN_REQUEST_TYPES` maps to the exact sources allowed to use it (e.g. `summarize_customer` → `["customer_detail"]` only; `recommend_caption` → `["brain_dashboard", "portfolio_detail", "service_detail", "media_detail"]`).

A request failing *either* check is rejected before any database read for context happens — confirmed by automated test in both directions (wrong entity type for a source, and wrong source for a type).

### `relatedEntityType`/`relatedEntityId` tracking

Uses the exact columns and closed vocabulary (`BRAIN_RELATED_ENTITY_TYPES`) Phase 20A's migration `0014` already created — **no new migration was needed for Phase 20B**. Every entity-scoped `brain_requests` row permanently stores the real `relatedEntityType`/`relatedEntityId`; **audit metadata deliberately does NOT** — the approved Phase 20B rule is that successful entity-scoped audit metadata contains exactly `{requestType, requestSource, relatedEntityType}`, never the id, since `brain_requests` already stores it permanently and audit metadata must stay minimal. Verified by automated test and by direct inspection of the real acceptance audit rows: zero occurrences of any real entity id inside `audit_log.metadata`.

### Context builders — explicit allowlists, never a database-row spread

`src/server/brain/context-builder.ts` gained `buildCustomerContext()`, `buildOrderContext()`, `buildPortfolioContext()`, `buildServiceContext()`, `buildMediaContext()` — each returns `{ ok: true, context } | { ok: false }`, mirroring `buildDashboardContext()`'s own "fixed, explicit allowlist, never a general-purpose fetch" rule. Final shapes:

- **Customer**: `displayName`, `company`, `customerSinceLabel`, `orderCount`, `mostRecentOrderStatus`, `daysSinceMostRecentOrder`, `leadCount`, `mostRecentLeadStatus`, `hasRecentNote`, `daysSinceLastNote`.
- **Order**: `orderNumber`, `workStatus`, `paymentStatus`, `source`, `subtotal`, `depositDue`, `hasEstimatedPricing`, `lineItems` (title/description/quantity only), `customerDisplayName`, `hasCustomerMessage`, `internalNoteCount`, `daysSinceLastNote`, `daysSinceCreated`/`daysSinceUpdated`, `isUnpaid`.
- **Portfolio**: `title`, `category`, `servicesTags`, `summary`, `fullDescription`, `client`, `year`, `entityStatus`, `featured`, `seoTitle`, `seoDescription`, `galleryImageCount`/`galleryVideoCount`, `galleryAltTexts`, `results`, `hasMissingGallery`, `hasThinSeoDescription`.
- **Service**: `title`, `summary`, `fullDescription`, `capabilities`, `deliverables`, `process`, `entityStatus`, `featured`, `seoTitle`, `seoDescription`, `galleryImageCount`/`galleryVideoCount`, `galleryAltTexts`, `startingPrice`/`pricingNote`/`turnaround` (only when genuinely populated), `hasMissingGallery`, `hasThinSeoDescription`.
- **Media**: `filename`, `altText`, `caption`, `type`, `mimeType`, `width`/`height`, `status`, `daysSinceCreated`, `hasPoster`, `usedByProductCount`/`usedByServiceCount`/`usedByPortfolioCount`, `usedAsHomepageHero`, `usedAsPosterForCount`, `isOrphaned`, `hasMissingAltText`, `isArchived`.

### Explicit exclusions

- **PII**: customer email, phone, and physical address are never included (Customer/Order context — verified against the real customer's actual email/phone, confirmed absent from the real captured prompt in automated testing).
- **Notes/messages**: raw note bodies and the customer's raw checkout message are never included — only `hasRecentNote`/`internalNoteCount`/`daysSinceLastNote`-style booleans and counts. Structurally impossible to leak, since no note-body field exists anywhere in `CustomerContext`/`OrderContext`.
- **Contributor names**: Portfolio's `credits` field (role/name pairs) is entirely excluded per your explicit decision — `PortfolioContext` has no `credits` key at all.
- **Blob URLs / storage keys**: `MediaContext` has no `url`/`storageKey` field — only `filename` (display name), confirmed absent from the real captured prompt.

### Deterministic local facts — never asked of the model

`isUnpaid` (Order), `hasMissingGallery`/`hasThinSeoDescription` (Portfolio, Service, reusing the exact `MIN_SEO_DESCRIPTION_LENGTH` threshold `buildDashboardContext()` already established), `isOrphaned`/`hasMissingAltText`/`isArchived` (Media) — all plain comparisons against data the application already has exactly, included as boolean context fields so Brain never has to guess something SQL can answer precisely.

### Portfolio/Service truncation limits

`src/server/brain/context-truncation.ts` (new) — named constants, applied **before** `buildUserPrompt()` is ever called, never after:

```
MAX_CONTEXT_SHORT_FIELD_LENGTH  = 200   (titles, SEO fields, alt text, list items)
MAX_CONTEXT_MEDIUM_FIELD_LENGTH = 400   (summary, process-step descriptions)
MAX_CONTEXT_LONG_FIELD_LENGTH   = 800   (fullDescription)
MAX_CONTEXT_LIST_ITEMS      = 10    (capabilities, deliverables, results, gallery alt texts, order line items)
```

`truncateContextField()` reuses Phase 20A's own `safe-summary.ts` primitives (`sanitizeForStorage()` + `truncateAtWordBoundary()`, both exported for this reuse) — sanitize (strip HTML-like tags/code fences/control characters) then word-boundary-truncate, the identical discipline already applied to stored summaries, now applied to admin-authored business content entering AI context. Verified by automated test: a synthetic 5,000-character description is bounded to the approved max, and the real Portfolio acceptance-test prompt stayed well within a sane total size.

### System instructions vs. untrusted business DATA vs. admin question

Unchanged from Phase 20A — `BRAIN_SYSTEM_INSTRUCTIONS` and `buildUserPrompt()`'s fencing/labeling were already generic enough to cover any DATA shape, not just dashboard aggregates. Every entity context field still passes through the truncation/sanitization above before ever reaching the DATA block, and the same "DATA is not instructions" system rule applies regardless of which entity type populated it.

### No new capability surface

No generic SQL/database access was added anywhere — every context builder is a fixed, named function reading a fixed set of fields, never a query the model can shape. No mutation, draft-write, or publish tool exists — Big Red Brain remains exactly as capable as Phase 20A: it can read (via these five new builders plus the existing dashboard one) and recommend (text only), nothing more.

### Recent Brain Activity — read-time label resolution

`/admin/brain`'s history list now shows entity type, a resolved human-readable label, and the source page, alongside the existing status/summary/usage columns. `src/server/queries/brain.ts`'s new `resolveEntityLabels()` batch-resolves labels **at read time only**, grouped by entity type into one query per type — nothing is ever persisted onto `brain_requests` to make this list prettier, per your explicit decision. A reference to an entity that no longer resolves falls back to "record no longer available" rather than erroring.

### Daily/cost accounting — fully reused, not reinvented

The 20/day request cap, integer-microdollar accounting, cached-input pricing, $20/month warning (not a block), 600-token output cap, 30-second timeout, and zero automatic retries are all **identical** to Phase 20A, shared across every source (dashboard + all five entity entry points draw from the same daily counter and the same monthly total) — no second accounting system was introduced. Live-verified: the daily cap correctly blocks an entity-scoped request once the shared limit is reached, not just dashboard requests.

### Real acceptance test — what was genuinely verified

Using your own real session across all five entity detail pages (not seeded, not synthetic) — Order (BRCP-1013, `summarize_order`), Customer (SP Juices' contact, `summarize_customer`), Portfolio (SP Juices, `analyze_portfolio`), Service (Graphic Design, `analyze_service`), and Media (the real video asset, `analyze_media`) — all five requests succeeded with relevant, entity-specific answers that did not mix records or expose unrelated customer/order information. Two independent rounds of read-only verification (immediately after your test, and again before this commit) both confirmed, directly against Neon:

- All five `brain_requests` rows: `status: completed`, `errorCategory: null`, `provider: openai`, `model: gpt-5.6-luna`, correctly owner-attributed, correct `requestType`/`requestSource`/`relatedEntityType`/`relatedEntityId` for each entity, every referenced entity independently confirmed to still exist.
- Exactly 10 new `brain.*` audit events (5× `brain.requested` + 5× `brain.recommendation_generated`), every one's metadata exactly `{requestType, requestSource, relatedEntityType}` — no `relatedEntityId`, no entity label, no prompt/response/business content, no PII, anywhere.
- `resolveEntityLabels()` correctly resolved all five real entities to their real labels and admin links.
- A full security scan of all five persisted rows found zero email-shaped strings, zero Blob URLs, zero storage-key-shaped paths, zero `sk-` tokens, zero `Authorization:` headers, zero occurrences of the literal `OPENAI_API_KEY`, and zero raw `http(s)://` URLs.
- Exact real usage/cost, preserved to the microdollar:

```
Order:    542 input / 0 cached / 133 output / 1,340 micros ($0.0013)
Customer:   479 input / 0 cached / 135 output / 1,289 micros ($0.0013)
Portfolio:  1,255 input / 0 cached / 600 output / 4,855 micros ($0.0049)
Service:   786 input / 0 cached / 600 output / 4,386 micros ($0.0044)
Media:    551 input / 0 cached / 181 output / 1,637 micros ($0.0016)

Combined:  3,613 input tokens, 0 cached input tokens, 1,649 output tokens,
      13,507 actualCostMicros = $0.013507 total
```

- Monthly Brain spend at time of verification: **17,359 microdollars = $0.017359** — combining these 5 real requests with the pre-existing Phase 20A acceptance history, still a tiny fraction of the $20 warning threshold.
- All pre-existing real data confirmed completely unaffected: `media_assets` = 2, video/poster relationship intact, SP Juices' and Graphic Design's video galleries intact, Homepage Hero video intact, `motion_settings` intact, BRCP-1013 intact, 1 lead/1 customer/4 notes, Brand `#E70810`, 7 Services, 4 Portfolio projects, 1 Product.

**`brain_requests` now permanently holds 8 real rows (1 failed/`rate_limited`, 7 completed — 2 from Phase 20A's dashboard acceptance history, 5 from this phase's entity-scoped acceptance history) and `audit_log` holds 15 real `brain.*` events — this is your genuine, live Big Red Brain usage history across both phases, not placeholder or test data to revert.**

### What's still not built (documented, not silently deferred)

Any DRAFT-write tool for Big Red Brain itself (Phase 20C-2, scope not yet decided). Video generation, testimonial-reel generation (Phase 20D) — image generation shipped in Phase 20C-1, see below. "Previous Brain recommendations for this record" — the schema/index fully supports it (unchanged from Phase 20A's `brain_requests_related_entity_idx`), deliberately deferred per your explicit decision, not because it's hard. A precise billing-vs-rate-limit distinction in failure categorization (Phase 20A's own documented, non-blocking gap, unchanged this phase).

## AI Creative Studio — Image Generation (Phase 20C-1)

**Status: complete — a real, working image-generation admin tool at `/admin/creative-studio`, backed by OpenAI's `gpt-image-1.5`, live-tested against two real generations totaling $0.043 in real spend, both saved to the Media Library.** Deliberately narrow: image generation only, no video, no async job queue, no autonomous publishing of any kind. `ImageProvider` is a separate, independent capability from Big Red Brain's own `TextProvider` — the two are never mixed, and "Build Creative Brief" in this phase is a deterministic, provider-call-free server-side construction step (never an AI-assisted drafting step), a deliberate scope decision explained below.

### Two owner approval gates, and why "Build Creative Brief" makes no provider call

```
Idea (owner fills structured fields)
  → Build Creative Brief   [GATE 1 — pure validation, zero cost, zero provider call]
  → Owner reviews/edits the brief, sees the exact estimated cost
  → Generate Image      [GATE 2 — the ONLY step that ever calls a provider]
  → Preview
  → Owner chooses: Save to Media Library, or Discard
```

Unlike the original architecture report's proposal (where a text-AI call would "structure" a freeform idea into a brief), the shipped `buildCreativeBriefAction` is a **deterministic, synchronous, provider-free** function (`buildAndValidateBrief()` in `src/server/creative-studio/brief.ts`): the owner fills in each structured field directly (objective, subject, brand direction, visual style, composition, required/avoid elements, text to render), and this step only sanitizes, truncates, and bounds what was typed. This was a deliberate implementation-time scope decision, not an oversight — it avoids the unresolved "reliably parse structured JSON from an LLM" risk the architecture report flagged, and means **zero real API spend occurs anywhere in this feature until the owner's second, separate "Generate Image" click.**

**`textToRender` is structurally, not just procedurally, protected from AI invention**: it is copied verbatim from the owner's own "Text to Render" form field, and no code path in Creative Studio — including the brief-review step — ever routes it through any text-generation call. There is no function that could rewrite it even if one wanted to.

### CreativeBrief shape and validation

`src/data/creative-studio.ts` defines `CreativeBrief` (`taskPreset`, `objective`, `subject`, `brandDirection`, `visualStyle`, `composition`, `textToRender`, `requiredElements[]`, `avoidElements[]`, `aspectRatio`, `referenceMediaAssetIds[]`, `additionalDirection`) plus every closed vocabulary this phase needs: `CREATIVE_TASK_PRESETS` (8 values: `social_graphic`/`branding_visual`/`packaging_concept`/`product_promo`/`event_promo`/`website_visual`/`portfolio_visual`/`custom`), `CREATIVE_CONTEXT_SOURCE_TYPES` (`brand`/`portfolio`/`service`/`media_asset` — **`customer`/`order`/`lead` are not members of this type at all**, a structural exclusion, not a runtime check), `IMAGE_ASPECT_RATIOS`/`IMAGE_GENERATION_SIZES`/`IMAGE_SIZE_BY_ASPECT_RATIO` (the owner never chooses a raw provider size string, only square/portrait/landscape, mapped server-side), `IMAGE_GENERATION_QUALITIES` (`low`/`medium` only — `high` deliberately excluded per approval), and `IMAGE_GENERATION_ERROR_CATEGORIES`.

`buildAndValidateBrief()` (pure, synchronous, no I/O) is called **twice** for every real generation — once at gate 1 for the owner's first look, and again, independently, at gate 2 inside `handleGenerateImage()` — gate 2 never trusts that a browser round-trip of gate 1's output is still valid. Every string field is sanitized (reusing Big Red Brain's own `sanitizeForStorage()`) and truncated at named max lengths (`MAX_BRIEF_SHORT_FIELD_LENGTH`=150, `MAX_BRIEF_MEDIUM_FIELD_LENGTH`=400, `MAX_BRIEF_TEXT_TO_RENDER_LENGTH`=200); `requiredElements`/`avoidElements` are capped at `MAX_BRIEF_LIST_ITEMS`=8 items of `MAX_BRIEF_LIST_ITEM_LENGTH`=100 chars each; `referenceMediaAssetIds` is capped at `MAX_REFERENCE_MEDIA_ASSETS`=4 and rejected outright (not silently truncated) if the owner selected more.

### Context sources — reusing Big Red Brain's own builders, not duplicating them

`src/server/creative-studio/context.ts`'s `resolveContextSource()` dispatches on the closed 4-value type and **reuses, unmodified**, three of Phase 20B's own entity context builders (`buildPortfolioContext`/`buildServiceContext`/`buildMediaContext` in `src/server/brain/context-builder.ts`) rather than building a second parallel set for the same three entity types. `buildBrandContext()` is new this phase, added to that same file, and — per explicit approval — uses **only** real, already-stored, admin-editable configuration: the published site name and the published `brand_settings` colors. It does **not** hardcode a "brand voice" string derived from CLAUDE.md or any other documentation file; `brand_settings` has no editable voice/tone field today, so that concept is simply omitted rather than invented. The client submits only a `(sourceType, sourceId)` pair — never descriptive text — and the server independently re-fetches and verifies the referenced entity every time, exactly mirroring Phase 20B's `resolveRequestContext()` pattern. Live-verified: a real id used against the wrong source type, and a well-formed but nonexistent id, were both correctly rejected.

### Reference media — Media Library only, independently re-verified

The owner selects up to 4 existing, active image assets as generation references via a picker fed by the same, unmodified `getActiveMediaAssetsForPicker(["image"])` every other admin picker already uses. `handleGenerateImage()` independently re-verifies **every** reference id before generating — must exist, `status: "active"`, `type: "image"` — never trusting that the picker's own client-side filtering was the only gate. Live-verified rejecting an archived reference, a video reference, and a nonexistent reference, each with **zero** database write (a pure validation rejection, never a spend attempt). Resolved reference URLs are only ever real, database-resolved Media Library URLs on this project's own Blob hostname — the browser can never submit an arbitrary remote URL as a reference, because there is no field anywhere in the request shape that accepts one.

### `ImageProvider` — a separate abstraction from Big Red Brain's `TextProvider`

`src/server/creative-studio/providers/image-provider.ts` defines the interface (`generateImage()`); only `openai-image.ts` imports the `openai` package for image generation — no other Creative Studio file does. `registry.ts`'s `getConfiguredImageProvider()` is the one place a real provider is selected: zero arguments, always `new OpenAIImageProvider()`, no request input can ever influence it. `MockImageProvider` (used by every automated test) returns a real, byte-sniffable 1×1 PNG so the full byte-validation path is genuinely exercised offline, never skipped.

**Official research, re-verified at implementation time (2026-07-26) directly against `developers.openai.com`, not from memory:**
- The Images API is **synchronous** — one blocking HTTP request, no polling/webhook (generation can take up to ~2 minutes per OpenAI's own docs).
- GPT Image models **always return base64** (`b64_json`) — confirmed both from the docs guide and from the installed `openai@6.49.0` SDK's own `Image` type, whose `url` field is explicitly documented "Unsupported for the GPT image models." This removes the "fetch a provider output URL" step from the architecture entirely — there is no URL to fetch, only bytes already present in the response body of a request this server itself initiated.
- Model: `gpt-image-1.5` (`OPENAI_IMAGE_MODEL_ID`), confirmed a real, current model identifier in the installed SDK's own `ImageModel` union.
- Official per-image pricing, confirmed from `developers.openai.com/api/docs/models/gpt-image-1.5`'s own "Pricing per Image" table (not a third-party tracker, and explicitly not the separate per-token image-pricing figures that same page says not to use for image-generation estimates):

| Quality | 1024×1024 | 1024×1536 | 1536×1024 |
|---|---|---|---|
| Low | $0.009 | $0.013 | $0.013 |
| Medium | $0.034 | $0.05 | $0.05 |

Encoded verbatim as `IMAGE_GENERATION_COST_TABLE_MICROS` in integer microdollars (e.g. low/square = 9,000 micros) — no estimation, no rounding, no third-party number used anywhere in this codebase.

- `openai-image.ts` uses `images.generate()` when no reference images are selected, `images.edit()` (fetching each reference's own trusted, database-resolved Blob URL server-side and converting to a real `Uploadable` via the SDK's own `toFile()`) when references are present — both endpoints confirmed to support GPT Image models and both always return base64 for them.
- `CLIENT_MAX_RETRIES = 0` and a 60-second client timeout — the SDK's own generous defaults (10-minute timeout, 2 automatic retries) are deliberately overridden, matching `TextProvider`'s identical cost-discipline rule: a silent retry would be a second billed call the owner never asked for.
- `moderation: "auto"` is always sent — never disabled.

### Cost controls

`src/server/creative-studio/cost.ts` is a deliberately separate module from `src/server/brain/cost.ts` — image spend is tracked completely independently from Big Red Brain's text spend, per approval, on its own table/column, even though both use the identical integer-microdollar unit convention. `DAILY_IMAGE_GENERATION_CAP = 10` (shared across every admin, mirrors `DAILY_BRAIN_REQUEST_CAP`'s exact "one counter" rule) — a rejection here **is** persisted as a `failed`/`budget_exceeded` row, the one validation failure that gets its own permanent record (a real, race-sensitive spend gate, not a plain shape check). `MAX_VARIATIONS_PER_BRIEF = 4` — enforced without any new schema column, by detecting a JSONB-equal `brief` from the same admin within a 2-hour window (`countRecentGenerationsForBrief()`); this rejection is **not** persisted (a pure validation rejection, like every other structural check). `MONTHLY_IMAGE_COST_WARNING_THRESHOLD_MICROS = $15` — informational only, never a shutdown, reported separately from Brain's own $20 text warning.

### Generated-output validation and storage

Provider base64 → decoded → `validateImageUpload()` (the **exact same, unmodified** function every human Media Library upload already goes through — real magic-byte sniffing, dimension cross-check) → **only on success** uploaded to real Blob storage via the existing, unmodified `buildStorageKey()`/`uploadImageBlob()` → **only then** is the `ai_generation_jobs` row written, with `outputStorageKey`/`outputUrl`/`outputWidth`/`outputHeight`/`outputSizeBytes` all server-derived — there is no field anywhere the browser could populate these from. A byte-invalid provider response is rejected before any upload happens (live-verified via a Mock provider returning non-image bytes: the job is written as `status: "failed"`, `errorCategory: "invalid_response"`, with no `outputUrl` at all).

### `ai_generation_jobs` lifecycle — completed/failed, saved is a derived fact

Mirrors `brain_requests.status` exactly: closed to `completed`/`failed` only — no `queued`/`running`, since the provider call is one synchronous round trip. **"Saved" is deliberately not a status value** — it's the derived fact `outputMediaAssetId IS NOT NULL` (set together with `savedAt`), kept structurally independent of `status` so "did the provider succeed" and "did the owner decide to keep it" can never collide or drift out of sync. `discardedAt` (nullable, orthogonal to both — the exact same pattern `leads.archivedAt` already established) is the Discard mechanism: set alone, never touching `outputStorageKey`/`outputUrl` or deleting the row — a discarded generation remains a complete, permanent, recoverable history record. No automated Blob-cleanup scheduler exists for unsaved/discarded generations — documented here, per approval, as a deferred future maintenance/security task, the same "recoverability over immediate cleanup, honestly deferred" precedent Phase 15 already set for Media Library replace.

### Save to Media Library — reuses the Blob, never re-uploads

`handleSaveToMediaLibrary()` re-fetches the job fresh **inside** its own transaction (a real double-save race-safety check, not just a pre-check) and creates exactly one `media_assets` row pointing at the **already-uploaded** Blob object — no second upload, no duplicate bytes. `mimeTypeFromStorageKey()` derives the MIME type from the file extension `buildStorageKey()` itself generated (`.png`/`.jpg`/`.webp`) rather than adding a new column for a fact already knowable from data this system itself wrote. The new asset's `alt` text is seeded from the reviewed brief's own `objective` field — a helpful starting point, freely editable afterward exactly like any other upload. A repeated Save on an already-saved job is rejected, live-verified creating no second asset.

### Provenance — reverse lookup only, no `media_assets` migration

Per approval, no schema change was made to `media_assets` for provenance. `findGenerationByOutputMediaAssetId()` (`src/server/queries/creative-studio.ts`) is a plain reverse lookup by the scalar `outputMediaAssetId` column, surfaced on `/admin/media/[id]` as a small "AI provenance" block: task preset, provider/model, generation date — never a prompt, brief, credential, or raw provider response.

### Audit events

`creative.brief_built`, `creative.image_generated`, `creative.image_failed`, `creative.saved_to_media`, `creative.discarded` — plus reuse of the existing `media.uploaded` action (tagged `{source: "creative_studio", jobId}`) for the actual asset-creation moment. Every metadata payload stays to a fixed, small key set (`{taskPreset, aspectRatio}`, `{taskPreset, provider, model, quality, size}`, `{mediaAssetId}`, `{}`) — confirmed by both the automated test suite and, separately, a direct scan of the real audit rows this phase produced, to contain no brief, prompt, output URL, storage key, PII, or credential-shaped string.

### Security boundaries

Every one of the 4 Server Actions in `src/server/mutate-creative-studio.ts` independently calls `requireAdminUser()` as its first line, per the standing rule since Phase 12. The entire Creative Studio write surface touches exactly two tables — `ai_generation_jobs` and `media_assets` (plus `audit_log` via the shared `recordAuditEvent()`) — confirmed by grepping every `.insert(`/`.update(`/`.delete(` call across the whole module: there is no `.delete()` anywhere (no autonomous asset deletion), and no import of `mutate-service.ts`/`mutate-portfolio.ts`/`mutate-product.ts`/`mutate-website-content.ts`/`mutate-brand.ts`/`mutate-motion.ts`/any order/customer/lead mutation module. **Generate Image, Save to Media Library, and Discard are three separate, independently admin-authorized actions** — none of the three can trigger either of the others, and nothing anywhere auto-attaches a generated (or saved) asset to Homepage, Portfolio, Services, or Products; a saved asset only ever becomes usable in those places the same way any other Media Library upload does — through a human explicitly picking it in that content's own editor.

`OPENAI_API_KEY` is read once, server-only, inside `openai-image.ts`'s lazily-initialized client — never `NEXT_PUBLIC_`-prefixed, never logged, never included in any audit metadata, confirmed absent as a *value* anywhere in tracked source (only the variable name appears, in comments and the one `process.env` read) via this phase's own commit-time security scan.

### Automated regression testing (Mock provider only)

**76/76 assertions passed**, covering: Server Action auth-call structural checks, no-provider-call-on-page-render, preset/aspect-ratio/quality validation both directions, the variation cap (4 identical-brief generations succeed, the 5th rejected with zero row written), the daily cap (rejection at the 11th attempt, correctly persisted as `budget_exceeded`), monthly spend accounting, brief sanitization/truncation/list-bounding, every context-source case (valid brand/portfolio/service/media_asset, nonexistent id, excluded customer type, mismatched source), every reference-media case (valid, archived, video, nonexistent), provider/model non-selectability, successful/failed/byte-invalid mock generation, the complete unsaved→saved and unsaved→discarded lifecycles including double-save prevention, provenance lookup, zero website auto-attachment, audit-metadata safety, zero PII, exact integer-microdollar accounting, and confirmed independence from Big Red Brain's own text-spend counter. All temporary rows/assets/blobs created by the suite were deleted in a `finally` block; the real database was confirmed back at its exact pre-test baseline afterward.

### Real acceptance-test history — two genuine paid generations, both saved

**Generation #1** — `aigen_44b2bf81-2cb6-4803-8053-a5f8fc2b81d7`: `openai`/`gpt-image-1.5`, quality `medium`, size `1024x1024`, `actualCostMicros: 34,000` (**$0.034**), `taskPreset: branding_visual`. Generated, then explicitly saved to the Media Library (`media_bde92cb7-e157-41c9-ab0c-f3f3465a4796`) — read-only verification confirmed the saved asset reuses the exact same Blob object the generation itself uploaded (`storage_key` byte-identical between the job row and the media asset row, no second upload), is `active`, and is referenced by zero Portfolio/Service/Product/Homepage field anywhere.

**Generation #2** — `aigen_ec3d6d3d-3719-41a2-9feb-b80c6c740bc7`: `openai`/`gpt-image-1.5`, quality `low`, size `1024x1024`, `actualCostMicros: 9,000` (**$0.009**), `taskPreset: social_graphic`. A genuinely separate job id, a genuinely separate Blob object (`media/34b858c3-...png`, confirmed independently fetchable and byte-distinct from generation #1's own blob), also explicitly saved (`media_ea30cfaf-f63c-4482-9211-1203862a275d`), also zero website references.

**Combined real spend: 43,000 microdollars = $0.043.** Both generations, both saves, and every audit event tied to them were independently read-only-verified twice — once immediately after each action, and again in a full final reconciliation pass — confirming: exactly 2 `ai_generation_jobs` rows, exactly 2 distinct storage keys (no duplication), exactly 4 `media_assets` (the 2 pre-existing real assets + these 2), exactly 8 Creative Studio audit rows (2 each of `brief_built`/`image_generated`/`media.uploaded`/`saved_to_media`), all owner-attributed, all metadata clean, `brain_requests` unchanged at 8, and every other real business record (Portfolio=4, Services=7, Products=1, Brand `#E70810`, Motion=2 rows, `BRCP-1013`, 1 lead/1 customer/4 notes) unaffected throughout.

**Two real, honest process incidents happened during this acceptance testing — preserved here rather than smoothed over:**

1. During the read-only pre-generation checklist (before generation #1's existence was known to the verifying assistant), a routine baseline query unexpectedly found `ai_generation_jobs` already at 1 row, `status: completed`, `provider: openai` — a real generation had already completed via the owner's own earlier click, before the "is it safe to click Generate" checklist had finished being answered. This was reported immediately and plainly rather than answered against the stale premise that no generation had happened yet.
2. During the planned live acceptance test for the **Discard** path (intentionally using a cheap low/square generation specifically to exercise Discard), the resulting second generation was found, on read-only verification, to have **already been explicitly saved** to the Media Library (a real `creative.saved_to_media` event, 11 seconds after generation) before the Discard step could be reached. **A decision was explicitly made not to spend money on a third, disposable generation solely to force a live Discard demonstration.** Discard therefore has **no real, paid, human-clicked acceptance test** behind it in this phase — it is verified by the 76/76 automated Mock-provider suite (including double-save-prevention and the "cannot discard an already-saved generation" rejection) and by direct, line-by-line implementation review (confirmed live: explicit-action-only, sets `discardedAt` alone, never deletes the job row, never calls `deleteBlob()`, never inserts into `media_assets`, and structurally refuses to discard a job whose `outputMediaAssetId` is already set). **This is stated here explicitly so Discard is never later described as real-human-accepted when it wasn't.**

**`aigen_44b2bf81-...` and `aigen_ec3d6d3d-...`, and their two corresponding Media Library assets, are your genuine, live, currently-saved Creative Studio generations — real acceptance-test history and real usable assets, not placeholders or test data to revert.**

### tsc/lint/build

All three clean throughout implementation and at final closeout — zero errors, zero warnings. One incidental fix during implementation: `ai_generation_jobs.provider`/`.model` initially carried an overly-narrow Drizzle `$type<>()` annotation that didn't match this schema's own established convention (`brain_requests.provider`/`.model` are deliberately plain `text`, per that table's own comment — "a provider/model name changes on a faster timescale than this schema should chase"). Corrected to match — a TypeScript-only change, zero SQL/migration impact, migration `0015` itself untouched.

### What's still not built (documented, not silently deferred)

Async/queued generation jobs (not needed — the provider is synchronous). Video generation (Phase 20D, unstarted). Automated orphaned-Blob cleanup for unsaved/discarded generations (documented, deferred, matching Phase 15's own precedent). A real, paid, human-clicked Discard acceptance test (see above — deliberately not performed to avoid disposable spend; covered by automated + code-review evidence only — **Phase 20C-2 below did add a real, human-clicked Restore, but not Discard, acceptance test either, for the same reason**). Any DRAFT-write tool anywhere in this codebase. Any autonomous publish/attach/delete capability for Creative Studio or Big Red Brain — never planned, not just "not yet built."

## Creative Studio Production Workflow (Phase 20C-2)

**Status: complete — Generation History, Reopen, save-time human-readable filename/alt/caption, explicit Restore, a cost dashboard, an improved reference-image picker, and a safe Homepage Hero "Use in..." preselection, all built on top of Phase 20C-1's foundation with zero schema changes and zero new provider capability.** Real-tested at zero additional cost, using the two existing real generations from Phase 20C-1 — no new OpenAI request was made anywhere in this phase.

### No migration — every feature reuses existing columns

Confirmed at the architecture stage and held throughout implementation: `filename`, `alt`, `caption` (`media_assets`), `discardedAt`/`outputMediaAssetId`/`brief`/`usageMetadata` (`ai_generation_jobs`) already existed. `sourceGenerationJobId` was explicitly considered and explicitly rejected (see the Phase 20C-2 architecture report) — nothing in this phase's feature set actually required it; variation-cap enforcement continues to use the existing brief-JSONB-equality mechanism proven in Phase 20C-1. `ai_generation_jobs`' schema is completely unchanged since migration `0015`.

### Generation History

`/admin/creative-studio/history` — plain server-rendered, `AdminPagination`-paginated (25/page, mirrors `/admin/media`'s exact pattern), newest-first (`ORDER BY created_at DESC`). `listGenerationJobsForAdmin()` (`queries/creative-studio.ts`) reads only existing columns. Each row shows a thumbnail (or a text placeholder for a `failed` job with no output), task preset, provider/model, size/quality, generation date, cost (via the existing `formatMicrosAsUsd()`), and a derived state — `discardedAt ? "discarded" : outputMediaAssetId ? "saved" : status === "failed" ? "failed" : "unsaved"` — with a direct Media Library link when saved. Zero writes, zero provider calls — confirmed both by code review and by an automated static import-scan.

### Reopen

`/admin/creative-studio/[id]` — independently re-fetches the job fresh by id (`getGenerationJobById()`, unchanged from Phase 20C-1), `notFound()` if missing. Shows the full generated image, all safe metadata, and — deliberately — the **complete reviewed brief**, not just a summary: this is the owner's own prior input, already sanitized once at write time, shown back to them on a single-record authenticated admin page, the same way every other admin detail page in this codebase (Order, Portfolio draft, Product edit) already shows its own full content back to the owner. This is a different context from `audit_log` metadata, which stays minimal by a separate, unrelated rule. Reference images used are resolved via the existing, status-agnostic `getMediaAssetsByIds()` — so a reference that's since been archived is still shown here for historical continuity, labeled "Archived," even though it can no longer be *selected* for a new generation. **Reopen never imports anything from the `ImageProvider` module tree** — confirmed by an automated static scan of every `import` statement in the route and its action component, not just by description.

### Restore — closing the gap Phase 20C-1 explicitly left open

`handleRestoreGeneration()` (`save-discard.ts`) sets `discardedAt` back to `null` — nothing else. Guards, mirroring Discard's own logic in reverse: rejected if the job was never discarded (`!job.discardedAt`), rejected if the job is already saved (`job.outputMediaAssetId` set) — a saved generation can never be "restored," the concept doesn't apply once it's a real Media Library asset. Never touches `outputStorageKey`/`outputUrl` (nothing was ever deleted at the storage layer, so there's nothing to restore there) and never calls a provider. Audited as `creative.restored` with empty metadata (`{}`). Exposed on Reopen only when the job's derived state is `discarded`, via a small dedicated client component, `CreativeStudioReopenActions.tsx`, that reuses the exact same Server Actions the original create-flow's preview step already calls.

### Save-time filename, alt text, and caption

Both the create flow's preview step (`CreativeStudioView.tsx`) and Reopen now show editable Filename/Alt text/Caption fields immediately before Save. `handleSaveToMediaLibrary()` gained an optional third parameter, `{filename?, alt?, caption?}`. `src/server/sanitize-filename.ts` is the one new module:

- **Filename**: reuses the existing `slugify()` (`src/data/products.ts`) verbatim for the base name — its output alphabet is exactly `[a-z0-9-]`, which makes path traversal (`../`, `/`, `\`, a null byte, a bare `.`) **structurally impossible, not merely checked for**, since no character in the allowed set can ever form one. Capped at `MAX_FILENAME_LENGTH` (80). A blank/unslugifiable input falls back to the existing default (`ai-generated-<id>`), never a hard validation error.
- **Extension**: **always** derived server-side from the job's own real `outputStorageKey` (`.png`/`.jpg`/`.webp` — the only three `buildStorageKey()` ever produces) via the new `extensionFromStorageKey()`, **never** from what the owner typed. Live-verified in automated testing: typing a filename ending in `.exe` still produces the real `.jpg`/`.png`/`.webp` extension regardless.
- **Alt/caption**: reuse the existing `sanitizeForStorage()`/`truncateAtWordBoundary()` (`brain/safe-summary.ts`), bounded at `MAX_SAVE_ALT_LENGTH` (200) / `MAX_SAVE_CAPTION_LENGTH` (300). A blank alt falls back to the reviewed brief's own `objective`, exactly as Phase 20C-1 already did by default.
- **The Blob is never renamed or moved** — `storageKey`/`url` are always reused verbatim from the job row; filename/alt/caption are pure `media_assets` display columns, confirmed by code review (no `storageKey`/`url` field is writable from this form at all) and by an automated test asserting the saved row's `storage_key` is byte-identical to the job's own.
- **Double-save protection is unchanged and reconfirmed**: the existing in-transaction freshness re-check still applies regardless of what metadata is submitted; a repeated Save (even with different metadata the second time) is still rejected, and still creates no second `media_assets` row.

One honest, small, pre-existing observation surfaced while building this: `media_assets.filename` was not editable anywhere in this app before this phase — the existing `updateMediaAssetAction` (Phase 15) only ever writes `alt`/`caption`, and has no sanitization on either beyond a plain trim. This phase's *new* save-time path is stricter than that older one (full `sanitizeForStorage()` + length bound); the older path itself was left unmodified — out of scope for this phase, noted here rather than silently left as an inconsistency no one wrote down.

### Reference-image workflow improvements

Pure client-side UI additions to `CreativeStudioView.tsx`'s existing picker — no new security surface, no server change beyond what Phase 20C-1 already independently re-verifies on every generation. A "Selected (N/4)" preview strip shows the currently-chosen reference thumbnails with per-item ↑/↓ (reorder) and × (remove) controls — all pure local React array state (swap/filter on `fields.referenceMediaAssetIds`), submitted through `FormData` exactly as before. The picker's source list is unchanged — `getActiveMediaAssetsForPicker(["image"])`, already active-only, so archived assets never appear as selectable for a *new* generation (true before this phase, still true now, not something this phase had to add). Historical continuity for an *already-used* reference that's since been archived is Reopen's job, not the create flow's — Reopen resolves every `referenceMediaAssetIds` entry via the status-agnostic `getMediaAssetsByIds()` and visibly labels an archived one, rather than hiding it.

### Clearer variation cost/state messaging

The Review screen now tracks whether it was reached via "Generate Another Variation" (a `viaVariation` boolean, UI-only) and, when true, shows an explicit callout with the live estimated cost and the words "Your current generation is not affected and stays exactly as it is either way" — making visible three things that were already true in Phase 20C-1 but not previously stated on screen: the real-dollar cost, that the prior generation is untouched, and that a variation is a new, permanent, separate job.

### Cost dashboard

A new block on `/admin/creative-studio` itself, above the create form — mirrors `/admin/brain`'s own "zero AI provider call" dashboard pattern. Reuses `countImageGenerationsToday()`/`getMonthlyImageCostMicrosSoFar()`/`DAILY_IMAGE_GENERATION_CAP`/`MONTHLY_IMAGE_COST_WARNING_THRESHOLD_MICROS`/`formatMicrosAsUsd()` verbatim from Phase 20C-1; the one new function, `getTodayImageCostMicrosSoFar()`, is a one-line variant of the existing monthly-spend query swapping the truncation unit. Shows generations-today/cap, spend-today, spend-this-month/warning-threshold. Zero provider calls — confirmed by code review (the page has no import of any `ImageProvider` module) and by the fact every value is a plain aggregate `SELECT`.

### "Use in..." — Homepage Hero gets a real, safe preselection; Portfolio/Service/Product get navigation only

**Homepage Hero**: a link, `?preselectMediaAssetId=<id>`, appears on Reopen once a generation is saved. The **only** file changed for this is `src/app/admin/(protected)/website/homepage/page.tsx` — `HeroMediaField`/`HeroContentForm` needed zero changes, since they already accepted `initialMediaAssetId`/`initialMediaType`/`initialImageSrc`/`initialImageAlt` as plain props. The page independently re-fetches and re-verifies the hint on every load — must exist, must be `status: "active"`, must be `type: "image"` or `type: "video"` (both are legitimate Hero media types, so there's no "wrong type" rejection case distinct from "doesn't exist"/"not active," confirmed during the architecture pass) — before ever using it as the form's starting value. An invalid, malformed, or archived id **safely results in no preselection at all**, falling back to the real draft row's own current selection, never an error. **This never writes anything by itself** — the owner still goes through the completely unmodified Save Draft → Preview → Publish flow themselves; a banner ("Pre-selected from Creative Studio... Nothing has been saved yet") makes this explicit on screen.

**Portfolio / Service / Product**: deliberately **navigation-only** this phase, per approval — plain links to `/admin/portfolio`, `/admin/services`, `/admin/products`. No deep preselection was built for these three: each has multiple entities (which project? which service? where in a product's ordered media array?) with no single unambiguous target the way Homepage Hero has exactly one slot, so a freshly-saved asset already surfacing near the top of each existing picker (all already ordered newest-first) does the same job without three more bespoke integrations.

### Security — reviewed against the full Phase 20C-2 diff

No new path exists anywhere in this phase for Creative Studio to autonomously: save a draft, publish, modify Homepage/Portfolio/Service/Product/Brand/Motion, modify Orders/payment state, modify Customers/Leads/Notes, send any customer communication, or delete a Media Library asset — confirmed by a full static import/write scan across every new and modified file, finding zero references to any `mutate-service`/`mutate-portfolio`/`mutate-product`/`mutate-brand`/`mutate-motion`/order/customer/lead/message-sending module, and zero `.delete()` calls anywhere. The Homepage Hero preselect is confirmed read/prefill-only: the modified `page.tsx` itself calls no draft-save or publish action directly — those remain exactly where they were, inside the pre-existing `HeroContentForm`/`PublishHeroButton` components, requiring the owner's own explicit click either way. History, Reopen, Save, Discard, and Restore are all confirmed (by static import scan, not just by description) to have zero code path to any `ImageProvider`.

### Automated regression testing (Mock provider / pure functions, zero real spend)

**47/47 assertions passed**: filename path-traversal (forward-slash and backslash forms) and script-tag stripping, length truncation, blank-input fallback, extension-spoofing rejection (a client-claimed `.exe`/wrong extension is always overridden by the real server-derived one); a real Save with a maliciously-crafted filename/1000-character caption/script-tag alt still succeeds with fully sanitized stored values; duplicate Save rejected with no second asset created; Restore rejected before any discard, succeeds after a genuine discard, rejected again once saved (and Discard independently reconfirmed rejected once saved); Homepage Hero preselect logic safely resolves both a nonexistent id and a real temporary archived id to "no preselection"; `getMediaAssetsByIds()` reconfirmed status-agnostic for Reopen's historical-reference display; History pagination/ordering/cost-aggregate accuracy checked against a direct SQL sum; static import scans confirming zero `ImageProvider` references and zero new autonomous-mutation calls across History, Reopen, Reopen's action component, and the modified Homepage page. All temporary rows/assets/blobs cleaned up in a `finally` block, confirmed zero remaining afterward.

**Not automated, documented honestly**: the reference-image reorder/remove controls are pure client-side array operations (no server round-trip, no security surface) — verified by direct code review rather than a DOM test, since this codebase has no React-rendering test harness and the existing precedent (Services/Portfolio admin's own move-up/down buttons) was never automated-tested either.

### Real acceptance test — zero additional OpenAI spend

Using your own real, personal click-through (not seeded, not synthetic) against the two real generations already created in Phase 20C-1 — **no new OpenAI request was made anywhere in this phase**:

- **Generation History**: both real generations (`aigen_44b2bf81-...` medium/$0.034, `aigen_ec3d6d3d-...` low/$0.009) confirmed visible, newest-first, with working thumbnails, correct provider/model/quality/size/date/cost, correct "saved" state, and working Media Library links.
- **Reopen**: both real generations' detail pages confirmed working — full image, full reviewed brief, safe metadata, Media Library link, and the "Use in..." list all displayed correctly, with no provider request occurring.
- **Cost dashboard**: generations-today/cap, today's spend, and monthly spend ($0.043) all confirmed displayed correctly, with no AI/provider call involved in computing them.
- **Reference picker**: selected-reference preview, remove, and reorder controls all confirmed working, with no generation triggered merely by exercising the UI.
- **Homepage Hero preselection**: "Use in Homepage Hero" confirmed navigating correctly, the saved asset confirmed preselected, the Creative Studio banner confirmed appearing, and — critically — **no Homepage write occurred merely from navigating/previewing the preselection**, and **no Save Draft or Publish was performed during this acceptance test**, confirmed by post-test read-only verification showing the Homepage Hero's `heroMediaAssetId` unchanged on both draft and published rows.

**Not real-human-accepted this phase, documented honestly, not glossed over**: Restore was exercised only by the automated Mock-provider suite, not by a real click against a real generation (both real generations are already saved, with nothing real left in a discarded state to restore) — matching the exact same honest-gap pattern already established for Discard in Phase 20C-1's own acceptance history.

### tsc/lint/build

All three clean throughout implementation and at final closeout — zero errors, zero warnings. The build's route manifest confirms both new routes (`/admin/creative-studio/history`, `/admin/creative-studio/[id]`) exist and are protected/dynamic like every other admin route.

### What's still not built (documented, not silently deferred)

A real, paid, human-clicked Restore acceptance test (see above — not needed, since the automated suite already proves the mechanism and no real generation was left in a discarded state to exercise it against). Deep "Use in..." preselection for Portfolio/Service/Product (deliberately navigation-only this phase, per approval). Automated orphaned-Blob cleanup (still deferred, unchanged since Phase 15/20C-1). Any DRAFT-write tool, any autonomous publish/attach/delete capability anywhere in Creative Studio or Big Red Brain — never planned, not just "not yet built." Video generation (Phase 20D — explicitly requires its own separate architecture/security/cost review before starting, not an extension of this phase's approval).

## Rate Limiting (Phase 21A-1B / 21A-1C)

**Status: complete — a two-layer rate-limiting design (Vercel Firewall for public/IP-level edge protection, configured entirely outside this codebase; a Postgres-backed application-level limiter for authenticated/admin-scoped short-window bursts, and now also the one genuinely public mutation route) is live for Big Red Brain, Creative Studio image generation, video-upload-token issuance, and — as of Phase 21C-1 — `POST /api/orders`.** This is the first piece of implementation to come out of the Phase 21 security audit below — specifically, the rate-limiting portion of 21H. See "Store/Checkout/Order Security (Phase 21C-1)" below for the `order_creation_ip` scope's own writeup (it's the one scope in this table keyed for an unauthenticated route, and the one with a fail-closed `503` on limiter infrastructure failure rather than a soft-fail). See the Roadmap entry for the current, authoritative state of the rest of Phase 21.

### Why two layers, and why Postgres over a new external service

Public/unauthenticated surfaces (admin login/OAuth, `POST /api/orders`, the contact form) are protected by **Vercel Firewall** — dashboard-configured, edge-level, IP-based, zero application code, zero new external account. Authenticated/admin-scoped short-window bursts (Big Red Brain, Creative Studio, the video-upload-token route) need a limit keyed on `admin_users.id`, not just source IP, which a network-edge firewall can't naturally express — that's what this phase's Postgres-backed limiter is for. **Upstash Redis was explicitly evaluated and rejected**: it would require a new external account, two new environment variables, and two new npm packages, for a business at a scale where the existing Neon connection this app already holds open is entirely sufficient. A serverless in-memory `Map` was never a candidate — Vercel's serverless functions don't share memory across invocations, so an in-process counter would silently under-count under real traffic.

### Phase 21A-1B — `rate_limit_events` schema

Migration `0016_panoramic_thor_girl.sql` — one additive `CREATE TABLE`, one composite index, zero changes to any existing table:

```
rate_limit_events {
  id          bigserial PK
  scope       text not null   -- closed vocabulary, enforced at the application layer
  key         text not null   -- admin_users.id (as text) OR an HMAC of a normalized IP — never a raw IP
  created_at  timestamptz not null default now()
}
INDEX (scope, key, created_at)
```

`bigserial` is used instead of this schema's usual `uuid`/text-prefix convention deliberately — this is a pure, high-insert-rate event log, structurally closer to a metrics counter than a business entity; nothing ever joins against this table's own `id`. The composite index is ordered `(scope, key, created_at)` on purpose: `scope`/`key` are always matched with `=` (equality predicates), `created_at` is always matched with `>` (a range predicate) — Postgres B-tree best practice puts the equality columns first so a query seeks straight to the exact `(scope, key)` prefix, then does one efficient forward scan through `created_at` within it. Every real query this table serves is `WHERE scope = ? AND key = ? AND created_at > ?` — this is the one index that shape needs. **No PII, no raw IP, no email, no request body, no prompt/response, and no credential of any kind is ever stored in this table** — confirmed by the schema itself (four columns, none of them capable of holding any of those) and by the security scan performed before this phase's commit.

No automated cleanup job was built this phase — documented, deliberately deferred, matching Phase 15's own "recoverability/deferred-cleanup, documented not silently deferred" precedent. See "Retention" below.

### Phase 21A-1C — the shared limiter

`src/server/rate-limit.ts`, `server-only`. **Closed scope vocabulary** — no caller can pass an arbitrary string:

```ts
RATE_LIMIT_SCOPES = ["brain_admin", "creative_studio_image", "video_upload_token_admin", "video_upload_token_ip"]
```

**Exact limits, per scope:**

| Scope | Tier | Limit | Window |
|---|---|---|---|
| `brain_admin` | burst | 5 | 5 min |
| `brain_admin` | daily | 20 | 24h rolling, per-admin |
| `creative_studio_image` | burst | 3 | 5 min |
| `creative_studio_image` | daily | 10 (`DAILY_IMAGE_GENERATION_CAP`) | 24h rolling, per-admin |
| `video_upload_token_admin` | hourly | 20 | 1h rolling, per-admin |
| `video_upload_token_ip` | hourly | 30 | 1h rolling, per-IP-hash |

The two daily tiers reuse the exact same approved numeric values (20, 10) that already existed as global-across-admins, calendar-day caps before this phase — **what changed is the enforcement mechanism** (now `rate_limit_events`-backed, per-admin, rolling-window), not the approved business values. `creative_studio_image`'s daily limit imports `DAILY_IMAGE_GENERATION_CAP` directly from `@/data/creative-studio` rather than re-declaring it, so there is exactly one source of truth for that number.

### Concurrency — a transaction-level Postgres advisory lock, not a new dependency

A naive `COUNT` then `INSERT` is not concurrency-safe — two simultaneous requests can both observe an under-limit count before either inserts, and both proceed, bypassing the limit. Fixed with `pg_advisory_xact_lock(hashtext(scope), hashtext(key))`, acquired as the first statement inside `db.transaction()`: it blocks until acquired and **releases automatically at COMMIT or ROLLBACK** — no manual unlock, no risk of a leaked lock surviving a crashed request. A multi-scope check (the video-upload-token route checks `video_upload_token_admin` + `video_upload_token_ip` together) acquires every lock it needs up front, in a fixed, deterministic sort order — this specific ordering is what prevents a deadlock between two concurrent multi-scope checks that would otherwise try to acquire the same two locks in opposite orders. **Live-verified, not just asserted**: 25 truly concurrent calls (`Promise.all`, each a real separate transaction/connection from the pool) against a limit-20 scope+key produced exactly 20 accepted and exactly 20 rows in `rate_limit_events` — never more.

### Privacy-safe IP keying

`extractClientIp()` reads `x-forwarded-for` (first entry) then `x-real-ip`, never logs or persists the raw value. `hashIpForRateLimit()` is a two-step derive-then-hash, not string concatenation: `HMAC-SHA256(AUTH_SECRET, "rate-limit-ip")` produces a context-specific derived key, then `HMAC-SHA256(derivedKey, normalizedIp)` produces the stored, opaque, fixed-length (64-char hex) digest. A plain unsalted hash of an IPv4 address was explicitly rejected during design — the entire IPv4 space is small enough to exhaustively pre-hash, making a plain hash trivially reversible; a keyed HMAC is the actual minimum needed for "a safer representation than raw IP" to mean anything. **Fails closed**: if `AUTH_SECRET` is unavailable, `hashIpForRateLimit()` returns `null` and every caller treats that as denial — never as "skip the check" or "fall back to the raw IP." No new environment variable was added; this reuses `AUTH_SECRET` with domain separation. When no IP can be determined at all (no proxy header present — realistically only possible outside Vercel's own edge), every such request shares one fixed `"unknown-ip"` bucket rather than skipping enforcement — ambiguity fails toward *more* restrictive shared throttling, never toward none.

### Transition strategy — avoiding a free allowance at deploy

`rate_limit_events` starts empty at deploy. Without accounting for that, an admin who'd already made real requests earlier that day (per the old global-calendar-day counter) would get a free extra allowance from the new rolling counter reading zero. The two **daily** tiers combine, at check time: live rows in `rate_limit_events` (`created_at > windowStart`), **plus** historical rows in `brain_requests`/`ai_generation_jobs` for that admin, in `[windowStart, RATE_LIMIT_ENFORCEMENT_START)` — a pure read-time UNION, no backfill, no mutation of either table. `RATE_LIMIT_ENFORCEMENT_START` is fixed once at module load. The historical term is self-terminating: once `windowStart >= RATE_LIMIT_ENFORCEMENT_START` (24h after deploy), the historical query's own `WHERE` clause becomes unsatisfiable and always returns 0 — no cleanup job needed for this mechanism specifically. The 5-minute burst tiers deliberately skip this fallback — low-impact, self-heals within minutes regardless. Live-verified: 20 backdated (>5min old, <24h old) synthetic rows correctly triggered the `"daily"` tier, not burst.

### Event semantics and integration

A `rate_limit_events` row represents exactly one **accepted**, quota-consuming action — a rejected request never inserts a row, so a client hammering an already-exceeded endpoint can never inflate the table. Both Big Red Brain (`handle-request.ts`) and Creative Studio (`generate-image.ts`) call the limiter **before** their respective provider call; a rejection from the burst tier returns a new, distinct user-facing message and persists nothing; a rejection from the daily tier preserves the *exact* original persisted-failure behavior (a `status:"failed"`/`errorCategory:"budget_exceeded"` row plus the matching audit event) that already existed before this phase. The video-upload-token route (`src/app/api/media/video-upload-token/route.ts`) checks both `video_upload_token_admin` and `video_upload_token_ip` **together, all-or-nothing** — a rejection on one scope never consumes quota on the other, live-verified. On rejection, API routes return `429` with a `Retry-After` header and a generic `{"error":"Too many requests. Please try again later."}` body; Server Actions return the existing safe `{errors:[...]}` shape. No internal rate-limit key, hash, or SQL error is ever surfaced to the client.

**Confirmed by static grep, not just intent**: `rate-limit.ts` is imported by exactly the three integration files above — `buildCreativeBriefAction`, History, Reopen, `saveToMediaLibraryAction`, `discardGenerationAction`, and `restoreGenerationAction` import nothing from it and structurally cannot consume image-generation quota.

### Retention (documented, not built)

Events older than the longest configured window (24h) are permanently unnecessary for enforcement. Proposed future threshold: `DELETE FROM rate_limit_events WHERE created_at < now() - interval '2 days'` as a periodic job — not built this phase, matching the standing "documented, deliberately deferred" convention already used for Media Library blob cleanup.

### Automated test results — 34/34

Run through a temporary, unauthenticated Route Handler invoked once against a running dev server (this codebase has no page-render or unit-test harness — every "automated regression test" in this project's history has been a temporary script/route, run once, then deleted), reusing the existing `MockTextProvider`/`MockImageProvider` — **zero OpenAI calls**. Coverage: below-limit success, exactly-one-event-on-accept, remaining-count accuracy, exact boundary (30 of 31 sequential requests succeed), above-limit rejection shape, no-event-on-reject, sane `retryAfterSeconds`, per-admin isolation, per-scope isolation, **25-way real concurrency (exactly 20 of 25 succeed, never more)**, multi-scope all-or-nothing consumption, HMAC determinism/uniqueness/opacity, raw-IP-never-stored, header parsing, **AUTH_SECRET-missing fail-closed**, and Brain/Creative-Studio blocked-request-never-reaches-provider (zero provider calls, zero database rows written) for both products. The temporary test route was fully deleted after each run — confirmed absent from `git status` and from the production build's route manifest both times.

### Real acceptance — a genuine Brain request, correctly rate-limited

During manual acceptance, you asked Big Red Brain one real question through `/admin/brain` (`recommend_website`, `brain_dashboard`). Read-only verification confirmed: exactly one `rate_limit_events` row (`scope: "brain_admin"`, `key` matching your real, active `admin_users` owner id), its `created_at` six seconds before the corresponding `brain_requests` row's own `created_at` — exactly the order the code takes (rate-limit check-and-record, then the provider call, then the persistence write). This is real, live confirmation that the limiter integration works correctly under genuine usage, not just under the mock test suite. `brain_requests` moved from 8 → 9 as a direct, expected result of this one real question — permanently preserved acceptance history, not reverted.

Creative Studio's Generate Image and the video-upload-token route were **not** exercised with a real paid/real-upload action during this phase's acceptance — `creative_studio_image` and `video_upload_token_*` both correctly show **zero** `rate_limit_events` rows, confirming no real generation or token issuance happened. This is a deliberate, documented deferral (per explicit instruction: no disposable OpenAI spend, no junk video upload solely to exercise the limiter) — both paths are covered instead by the 34/34 automated Mock-provider suite, the same honest "not real-human-accepted, documented rather than claimed" pattern already used for Discard in Phase 20C-1 and Restore in Phase 20C-2.

### What's still not built (documented, not silently deferred)

Vercel Firewall's own dashboard configuration (public/IP-level protection for admin login/OAuth, `/api/orders`, the contact form) — evaluated and specified during architecture review, not yet applied, since it's configured entirely outside this codebase. Security headers/CSP/HSTS (Phase 21A-2, not started). Origin/CSRF hardening (explicitly deferred to a later 21A subphase, per direct decision, not bundled into this work). Automated `rate_limit_events` cleanup (documented above, deferred). A real, human-clicked acceptance test for Creative Studio's and the video-upload-token route's rate-limit paths specifically (deferred, per explicit instruction — covered by the automated suite only).

## Pre-existing Customers List Runtime-Type Bug (discovered during Phase 21A acceptance, unrelated to Phase 21A)

**A real, pre-existing bug — not caused by, and not part of, the rate-limiting work above — found only because manual acceptance testing for Phase 21A happened to visit `/admin/customers` for the first time since the one real customer acquired their first real order.** Documented here, separately, precisely so it is never conflated with Phase 21A's own scope.

**Symptom**: `/admin/customers` threw `TypeError: row.lastOrderAt.toLocaleDateString is not a function` and failed to render.

**Root cause**: `src/server/queries/customers.ts`'s `listCustomers()` computes `lastOrderAt` via a raw SQL aggregate, `sql<Date | null>\`max(${orders.createdAt})\``. Drizzle's `sql<T>` type parameter is a **compile-time-only TypeScript assertion** with zero runtime effect — it does not parse anything. Verified directly against this app's actual production driver (`drizzle-orm/neon-serverless`'s `Pool`): the aggregate comes back as a **Postgres-formatted timestamp string** (e.g. `"2026-07-25 04:40:26.220708+00"`), never a `Date` instance — unlike a plainly-selected `timestamptz` column (which Drizzle's schema-aware column mapping does correctly parse into a real `Date`, confirmed for every date field `getCustomerById()` returns). Neither `tsc`, `lint`, nor `build` can catch this class of bug — the type checker trusts the assertion; only the runtime value disagrees.

**Why it surfaced only now**: before Phase 18B, every customer had zero orders, so `lastOrderAt` was always `null` and the page's ternary always safely rendered `"—"` — `.toLocaleDateString()` was never reached. The one real customer's first real order (BRCP-1013) was created during Phase 18B's own acceptance testing, but that phase's acceptance narrative only exercised the customer **detail** page, never the **list** page, after the order existed. This bug has been latent since Phase 18B, not introduced by Phase 21A.

**Fix**: `CustomerListRow.lastOrderAt` changed from `Date | null` to the honest `string | null`; the query's `sql<Date | null>` became `sql<string | null>`. The Customers list page now parses explicitly at render time: `row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString("en-US") : "—"` — null-to-`"—"` behavior unchanged. **This is now a structural guarantee, not just a runtime fix**: with the honest `string | null` type in place, reverting just the page's `new Date(...)` wrapper was tested and confirmed to fail `tsc` outright (`Property 'toLocaleDateString' does not exist on type 'string'`) — this exact regression class can no longer silently compile.

**Regression test**: no page-render test harness exists in this repository (confirmed — no jest/vitest/RTL installed), so this was verified the same way every other "automated regression test" in this project's history has been — a temporary, clearly-tagged Route Handler exercising the real `listCustomers()` query directly against real data, then deleted. 7/7 checks passed: a temporary zero-order customer correctly renders no last-order date; the real customer's real order (BRCP-1013) produces a non-null, honestly-`string`-typed aggregate; `new Date(...).toLocaleDateString(...)` parses it safely with no throw and no `"Invalid Date"`; the temporary customer was deleted, leaving zero trace. Separately, real usage was captured directly in the dev server log: **over 100 real, authenticated `GET /admin/customers` requests, all `200`, zero errors**, following the fix and a clean dev-server restart.

**Scope**: exactly two files — `src/server/queries/customers.ts`, `src/app/admin/(protected)/customers/page.tsx`. Neither overlaps with any Phase 21A-1B/21A-1C file; the rate limiter itself was not touched, reverted, or altered in any way by this fix.

## Security Headers & CSP (Phase 21A-2)

**Status: complete — production security headers, including a real Content-Security-Policy, are live on every route.** This is the second piece of implementation out of the Phase 21 security audit (21I in that audit's numbering). Scoped strictly to headers/CSP — no rate-limiting code was touched, no CSRF/Origin work started, no dependency changed, no AI video or payment work begun.

### Implementation — one file, applied centrally

`next.config.ts`'s `async headers()` returns one rule, matched to every route (`source: "/:path*"`) — a fresh resource-needs audit (below) found nothing that differs by route, so a single centralized rule is both the minimal and the correct implementation; no route-group-specific header set was needed.

### The headers, and why each one is shaped the way it is

- **`Content-Security-Policy`** — the real security boundary; see the exact final policy below.
- **`Strict-Transport-Security: max-age=15552000; includeSubDomains`** — 180 days. **`preload` is deliberately excluded**: submitting to browsers' built-in HSTS preload list is a one-way, effectively irreversible commitment (removal takes months and requires the site to have never been broken over HTTPS in the interim) — not something to opt into as a first production step. `max-age`/`includeSubDomains` alone already give real protection against downgrade attacks on repeat visits; preload submission can be revisited later once the header itself has real production time behind it.
- **`X-Content-Type-Options: nosniff`** — stops browsers from MIME-sniffing a response into executing as something other than its declared `Content-Type` (e.g. treating an uploaded image as HTML/script).
- **`Referrer-Policy: strict-origin-when-cross-origin`** — sends the full URL as referrer only same-origin; cross-origin requests get the origin only (no path/query leaked to third parties), and downgrades (HTTPS→HTTP) send nothing at all. The browser default already matches this value, so nothing about existing link/analytics behavior changes — this makes an already-safe default explicit and guaranteed rather than relying on whatever a given browser's own default happens to be.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`** — this site (and its embedded `<video>`/`<img>` content) never needs camera, microphone, geolocation, or the Payment Request API; explicitly denying all four means even a future compromised or misbehaving embedded resource can't invoke them.
- **`X-Frame-Options: DENY`** + **CSP's `frame-ancestors 'none'`** — deliberate belt-and-suspenders anti-framing/clickjacking defense. Modern, CSP-aware browsers honor `frame-ancestors` and ignore `X-Frame-Options` when both are present; `X-Frame-Options: DENY` is kept anyway as a legacy fallback for any older or non-CSP-aware client. `DENY` matches `frame-ancestors 'none'` exactly — this site is never meant to be embedded in a frame anywhere, including its own admin.
- **`Cross-Origin-Opener-Policy: same-origin`** — isolates this site's browsing context from cross-origin popups/windows it opens or that open it. See "Google OAuth compatibility" below for why this doesn't interfere with the one cross-origin auth flow this app has.

### Final CSP

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' https://cgub3jazsflfunrr.public.blob.vercel-storage.com data:;
media-src 'self' https://cgub3jazsflfunrr.public.blob.vercel-storage.com;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`script-src`/`style-src` include `'unsafe-inline'` and nothing else — no external script or style host, no wildcard. `img-src`/`media-src` allow exactly one external host (below); every other directive is `'self'`-only or `'none'`.

### Resource-needs audit — fresh, not assumed

Re-inspected directly, not carried over from the original Phase 21 architecture review: zero `next/font` usage, zero Google Fonts/`@font-face` anywhere, zero `<script>` tags anywhere in source, zero analytics or CDN-shipped client packages in `package.json` (every dependency is either server-only or first-party React/Next). Zero `<iframe>` usage anywhere. The one client-side `fetch()` in the whole app (`CheckoutView.tsx`, submitting an order) targets `/api/orders` — same-origin, covered by `connect-src 'self'` with no external API host ever called from the browser. 22 files use React inline `style={{}}` (unchanged count from the original review) — the one and only reason `style-src` needs `'unsafe-inline'`; no `<style>` block or CSS-in-JS library exists anywhere. **No new external host has been introduced anywhere in this codebase since the original review** — confirmed by this fresh re-grep, not assumed from an earlier pass.

### Blob CDN allowlisting

`img-src`/`media-src` both allow exactly `https://cgub3jazsflfunrr.public.blob.vercel-storage.com` — the identical hostname already allow-listed in this same file's `images.remotePatterns` (Phase 15). Not a secret — it's a public CDN address that already appears in every rendered `<img>`/`<video>` once media is uploaded. No wildcard, no second Blob-shaped host.

### Google OAuth compatibility — verified, not assumed

`src/app/admin/login/page.tsx` calls `signIn("google", { redirectTo: "/admin" })` inside a `"use server"` form action — a genuine top-level HTTP redirect to Google's consent screen, never a popup or `window.open()` (confirmed: zero `window.open` calls anywhere in source). `Cross-Origin-Opener-Policy: same-origin` only affects cross-origin *window/popup* relationships, not top-level navigations, so this flow was never at structural risk. **Real acceptance, not just structural reasoning**: your own browser, with a real session, hit `/admin` and received a clean `200` render — the admin dashboard loaded successfully — both immediately after these headers went live in a fresh production run and again after a fresh dev-server restart. You separately confirmed full manual acceptance (sign-in, dashboard, and the rest of the admin surface) after this.

### The one real conflict found — dev-mode-only React `eval()`, and why `'unsafe-eval'` was NOT added

Headless-Chrome DevTools-Protocol inspection (reusing the already-installed `ws` package — zero new dependencies) across `/`, `/store`, `/cart`, `/admin/login` in **dev mode** found one recurring console error: React's own development-mode debugging feature calls `eval()` to reconstruct stack traces across module boundaries, which the approved CSP (no `'unsafe-eval'`) blocks. This was not assumed harmless — it was **empirically verified against a real production build**: the identical DevTools-Protocol check, run against `next build` + `next start` with the exact same headers, returned **zero console messages of any kind** across every page tested. This confirms React's own message verbatim — *"React will never use eval() in production mode"* — and that no other CSP violation (blocked image, style, connect, or frame) occurred anywhere, in dev or production.

**Explicit decision: `'unsafe-eval'` was not added, in dev or production.** It would weaken the CSP for a cosmetic dev-tools debugging feature that doesn't affect functionality (React catches the failure and continues normally) and that provably never occurs in the environment this policy actually protects. If the dev-console message is ever a real annoyance, the correct fix — not applied here — is a `NODE_ENV`-conditional relaxation scoped to development only, never a change to the production policy.

### Automated test results — 32/32

Run against a real production server (`next build` + `next start`), asserting on real HTTP response headers rather than static config inspection: CSP present and parses into exactly the expected 9 directives; Blob host present in both `img-src` and `media-src`; `script-src` carries no wildcard and no external host; the admin route carries both `frame-ancestors 'none'` and `X-Frame-Options: DENY`; HSTS/nosniff/Referrer-Policy/Permissions-Policy/COOP all present with the exact approved values, confirmed across three different response types (a static prerendered page, a 307 redirect, and a 400 JSON API error response) — proving the headers apply universally, including to non-2xx responses, not just successful page loads.

### Real manual acceptance — passed

You personally completed the full manual acceptance pass with these headers live: homepage, admin Google login, admin dashboard, Media Library image render, Media Library video playback, Big Red Brain, Creative Studio (including History/Reopen), and the public store/cart/checkout/contact-form surfaces. No paid OpenAI call was made to perform this acceptance — Big Red Brain and Creative Studio's page-load/UI checks did not require an actual generation.

### What this phase did not touch

No database write of any kind — confirmed via a full real-data baseline read both before and after this phase, byte-identical throughout (`brain_requests`, `rate_limit_events`, `ai_generation_jobs`, `media_assets`, `audit_log`, `customers`, `leads`, `notes`, orders, `brand_settings`, `motion_settings`, `services`, `portfolio_projects`, `products`, and the Homepage Hero's media reference all unchanged). No dependency was added, removed, or upgraded. The rate limiter (Phase 21A-1B/21A-1C) was not touched, reverted, or altered. No CSRF/Origin hardening, no AI video generation, and no payment work began — all remain explicitly out of scope for this phase.

## Auth/Session + Origin/CSRF Hardening (Phase 21B)

**Status: complete — the smallest justified set of changes identified by a full architecture audit of this codebase's authentication/authorization/CSRF model.** The audit itself found the existing model already sound in almost every respect (every one of the 39 admin Server Actions independently re-verified to call `requireAdminUser()`, zero open-redirect surface anywhere, Next.js's own built-in Server Action Origin/Host CSRF protection already covers every mutation) — this phase closes the one real, concrete gap the audit found, plus two small, deliberate hardening decisions, and does not add complexity beyond what the evidence justified.

### The one real gap: `/api/media/video-upload-token` had no Origin check

Every admin **Server Action** already gets Next.js's own built-in CSRF protection (Origin compared to Host/X-Forwarded-Host, mismatches rejected — confirmed against current Next.js docs). That mechanism is specific to the `'use server'` action-invocation path and does **not** extend to arbitrary `POST` Route Handlers. Of this app's three Route Handlers, `/api/auth/[...nextauth]` is Auth.js's own managed contract (untouched) and `/api/orders` is intentionally public with no ambient authority to abuse (a cross-site POST there can only do what any anonymous visitor could already do through the real checkout UI — an abuse/rate-limiting concern, not classic CSRF). `/api/media/video-upload-token` was the one exception: cookie-authenticated, carrying real authority (minting a Blob upload token), with no same-origin enforcement of its own. This phase adds exactly that, and nowhere else.

### `src/server/validate-origin.ts` — the Origin helper

```ts
export function validateSameOriginRequest(request: Request): OriginValidationResult
```

Fails closed in every ambiguous case — deliberately, per the approved design:

| Case | Result |
|---|---|
| `Origin` header missing | Reject (`missing_origin`) |
| `Origin` present but unparseable | Reject (`malformed_origin`) |
| Both `Origin`/`X-Forwarded-Host` **and** `Host` missing | Reject (`missing_host`) |
| `Origin`'s host ≠ deployment host | Reject (`origin_mismatch`) |
| `Origin`'s host == deployment host | Allow |

No `Referer` fallback — `Referer` is weaker (often legitimately absent for privacy reasons) and was explicitly excluded rather than used as a second-chance check. The "deployment host" comparison prefers `X-Forwarded-Host`, falling back to `Host` — confirmed against Vercel's own current documentation that these two headers are identical and reflect how Vercel's edge actually routed the specific request to this deployment (the real production custom domain, or that exact Preview deployment's own `*.vercel.app` host) — a materially different trust class than `X-Forwarded-For` (which Vercel explicitly documents it overwrites specifically to prevent client IP spoofing). This is why `localhost` development and Vercel Preview deployments both work with **zero special-casing**: in both environments, a genuine same-origin browser request's `Origin` header and the server's own `Host`/`X-Forwarded-Host` naturally agree, because they both describe the same real place the request was actually sent.

**Scoped narrowly on purpose**: this check only ever runs for an already-authenticated request (`getAdminUserOrNull()` succeeds first) — CSRF is fundamentally about abusing an *authenticated* session's ambient authority, so gating this specific check behind authentication first (rather than checking Origin before or independent of auth) keeps the logic simple and matches what's actually being protected. It is applied to exactly one route — not globally, not to `/api/orders`, not to the Auth.js callback route.

### Ordering — rejection happens before any real side effect

In `video-upload-token/route.ts`, the Origin check runs immediately after the existing auth check and strictly **before** the rate limiter and before any Blob interaction:

```
getAdminUserOrNull()  →  validateSameOriginRequest()  →  checkVideoUploadTokenRateLimit()  →  handleUpload()
   (existing, 401)         (NEW, 403 + audit)              (existing, 429)                    (existing)
```

A rejected request therefore has **zero** provider/storage side effects and consumes **zero** rate-limit quota — confirmed by the code path itself (the function returns immediately on rejection, before either subsequent call is ever reached) and by automated test (below).

### Audit event — `csrf.origin_rejected`

Written directly (no transaction wrapper needed — it's the only write on this path, nothing else to commit atomically alongside it), reusing the existing `audit_log` table verbatim:

```ts
{
  adminUserId: adminUser.id,          // always a real, already-authenticated admin — this
                                       // check only ever runs post-auth-success
  action: "csrf.origin_rejected",
  entityType: "security",
  entityId: "video_upload_token",      // names the route, not a real business entity
  metadata: { reason: originResult.reason },  // one closed-vocabulary string only
}
```

**Confirmed absent from the metadata, by construction (there is no field to put them in) and by direct code review**: the raw `Origin` header value, the raw `Host`/`X-Forwarded-Host` value, any IP address, any cookie or session value, any OAuth token, any Blob token, any credential. `reason` is one of exactly four fixed strings (`missing_origin` | `malformed_origin` | `missing_host` | `origin_mismatch`) — useful operational signal (was this a confused legitimate client vs. a genuine cross-origin attempt) without ever exposing the values that would matter to an attacker doing reconnaissance.

### Explicit session `maxAge` — 7 days

`src/auth.ts` gained one config block: `session: { maxAge: 60 * 60 * 24 * 7 }` (seconds — the correct Auth.js v5 configuration location, confirmed against current docs before this change). Replaces Auth.js's own inherited 30-day default with an intentional, reviewed value — proportionate for a single-owner admin surface that increasingly touches money-adjacent and AI-cost-bearing actions, without being short enough to become a daily annoyance. **Nothing else about authentication changed**: same JWT strategy (implicit, no adapter), same encryption, same cookie name/prefix, same cookie flags, same provider config, same callbacks (there were none before, there are none now), same `role` logic, same `requireAdminUser()`/`getAdminUserOrNull()`, same `proxy.ts` fast-path behavior.

### Emergency admin revocation procedure — documented, not newly built

This procedure already worked correctly before this phase (verified by direct code inspection of `require-admin-user.ts`'s `lookupAdminUser()`, which re-queries `admin_users` fresh, with no caching, on every single protected request) — this phase's contribution is writing it down, since it existed only as an implicit consequence of the authorization design, not as a documented runbook anywhere.

**To revoke a compromised or departing admin's access immediately:**

1. Set that admin's `admin_users.active = false` (the same manual, direct-SQL process already used for onboarding an admin since Phase 12 — no admin UI for this exists yet, and building one is explicitly out of scope for this phase).

**What this does and does not do:**

- The admin's existing Google-issued JWT/session cookie **may still be present in their browser** — deactivating the `admin_users` row does nothing to the token itself, since Auth.js's JWT is entirely independent of this application's own authorization table.
- **Every protected surface in this codebase re-checks `admin_users` fresh, on every single request** — the page-level protected layout, and independently, every one of the 39 admin Server Actions and both authenticated Route Handlers (`getAdminUserOrNull()`/`requireAdminUser()` share the identical internal lookup). None of them trust `role`/`active` from the JWT — they are never even stored there.
- **Therefore `active = false` blocks every subsequent authorized request immediately** — the very next page load, Server Action, or API call that admin attempts will be rejected (redirected to `/admin/access-denied` for pages/Server Actions, or a clean `401`/`getAdminUserOrNull() → null` for JSON APIs) — regardless of how much time is left on their JWT.
- The lingering JWT itself is harmless once `active = false` — it grants Google-verified *identity*, never *authorization*, and this application's real authorization boundary has never trusted the token for that.
- **`AUTH_SECRET` rotation remains the only global, all-sessions-at-once emergency tool** — it invalidates every JWT for every admin simultaneously (a single-owner account today, so low blast radius, but a blunt instrument regardless: it also signs out any other legitimate active admin, and would need to be done via the hosting platform's environment-variable rotation, not from within this app). Use `active = false` for a single compromised account; reserve `AUTH_SECRET` rotation for a suspected broader compromise.
- **No one-click "deactivate admin" UI exists** — this remains a manual database operation, explicitly not built in this phase, matching the same manual bootstrap process this project has used for admin account management since Phase 12.

### Automated test results — 19/19

Run through a temporary, non-destructive test harness (this codebase's established pattern — no jest/vitest/RTL exists, so every regression check is a real request against a real running server, using clearly-tagged temporary data, cleaned up in a `finally` block): same-origin request succeeds; cross-origin, missing-Origin, and malformed-Origin requests are all rejected with `403`; a rejected request creates **zero** rate-limit events and **zero** Blob/token side effects; a rejected request creates **exactly one** `csrf.origin_rejected` audit row, with metadata containing only the closed-vocabulary `reason` string — confirmed absent of any Origin/Host/IP/token/credential value; an unauthenticated request still fails with the pre-existing `401` before the Origin check is ever reached; `/api/orders` and the Auth.js callback route were both confirmed completely unaffected; `localhost` and a simulated Preview-style host both resolved correctly with zero special-case code; the verified admin identity used for rate-limiting cannot be influenced by client-submitted data; existing Brain/Creative Studio rate-limiting behavior is unchanged; CSP/security headers (Phase 21A-2) remain present and unchanged; the configured session `maxAge` resolves to exactly 604800 seconds (7 days). No real owner account was deactivated, no real OpenAI call was made, no real Blob upload occurred.

**Honest test-cleanup issue, found and corrected**: the test script's own final cleanup-verification assertion checked only that its `video_upload_token_admin`-scope temporary row was deleted — it never looked for the *separate* `video_upload_token_ip`-scope row the same test call also creates (a different key: an HMAC hash, not the plain test tag the assertion searched for), so the test reported "cleanup passed" while that one row was actually still present. This was **not** caught by the test's own self-report — it was caught during the independent, separate real-data baseline re-check performed immediately afterward, which is exactly the purpose that second, independent check serves. The leftover row was deleted directly, and a follow-up query confirmed `rate_limit_events` back to exactly one row — the one real, legitimate `brain_admin` event from Phase 21A-1C's own acceptance history. No real data was at risk at any point; this was a test-script blind spot, not an application bug.

### Real manual acceptance

You confirmed manual acceptance passed — sign-in and general admin functionality were verified working normally under the new 7-day session and the new Origin check. **A real video upload through the Media Library was not performed during this acceptance window** — confirmed by direct, read-only inspection rather than assumed: `media_assets` still holds exactly the same 4 rows as before this phase (the one real video asset shared across Homepage Hero/SP Juices/Graphic Design dates from Phase 19A/19B, July 25th — nothing newer), and `audit_log` contains zero `csrf.origin_rejected` events and no new `media.uploaded` entry of any kind since this phase began. This is stated plainly rather than assumed, matching this project's standing honesty discipline: the login/dashboard/general-functionality acceptance is real and confirmed; the specific "upload a real video to prove the Origin check doesn't interfere with legitimate use" step from the suggested manual checklist was not exercised, and remains unverified against a real upload — though it is covered by the automated same-origin-request-succeeds test, and by the unmodified, untouched rate-limit/Blob-interaction code paths themselves.

### What this phase deliberately did not add

Per the approved scope: no custom CSRF tokens (Next.js's own built-in Server Action Origin/Host check already covers every mutation — no evidence justified an additional mechanism). No `Referer` fallback. No general-purpose safe-redirect helper (the audit found zero open-redirect surface anywhere in this codebase to protect against). No `admin.login_succeeded`/`admin.login_denied` audit events (the denied case would accumulate unbounded volume from non-owner internet traffic hitting `/admin/login` — exactly the bot-volume risk explicitly avoided). No app-level login rate limiter (Google owns credential verification entirely; the realistic brute-force surface is the OAuth handshake itself, already rate-limited upstream by Google, with Vercel Firewall coverage for `/admin/login` still planned as part of the broader, not-yet-applied 21H work). No re-authentication/typed-confirmation flow (nothing in this app today reaches a stakes level that would justify one — reserved for a future real-payment or credential-management phase). No new database table, no migration, no npm package, no Next.js/Auth.js version change.

## Store/Checkout/Order Security — Rate Limiting + `order.created` Audit (Phase 21C-1)

**Status: complete — the narrowest justified slice of the original "21B — Store + Checkout + Orders" audit scope, including a follow-up fix for a genuine checkout-concurrency reliability bug this phase's own testing exposed.** A full read-only architecture audit (24 points: pricing authority, order validation, duplicate/replay analysis, money model, order/payment state machine, PII inventory, payment-architecture readiness, IDOR/privacy, audit coverage, PCI boundary) found the existing checkout/order pipeline **already fully server-authoritative for pricing** (the wire schema has no `price`/`total`/`unitPrice`/`deposit` field at all — the client only ever sends `productId`/`quantity`/`selectedPackageSlug`/`selectedOptionValues`/`selectedAddOnSlugs`), already backed by a real, race-safe, DB-constraint idempotency guarantee (`orders_client_request_id_unique`), and with no public order-lookup route (zero IDOR surface). Zero Critical findings. Exactly two real gaps: `POST /api/orders` had no rate limiting (a documented gap since Phase 11), and the checkout order-creation path had no `order.created` audit event (the admin-manual-order path already had one, since Phase 18B). This phase closes both. Genuine-concurrency testing then exposed a third, real reliability bug — a customer-email creation race that could return a spurious `500` under true simultaneous checkout — which was root-caused and fixed as a direct, approved follow-up (see below). Still no Stripe, no webhooks, no payment-status changes, no transition-table changes, no inventory, no `pricingSummary` schema migration, and the idempotency *architecture* itself (client-generated `clientRequestId` + a real DB unique constraint as the final authority) was never changed — only how a losing request safely recovers from hitting that constraint under real concurrency.

### `order_creation_ip` — a third rate-limit scope, same shared limiter

Extends the existing Postgres-backed application-level limiter (`src/server/rate-limit.ts`, Phase 21A-1B/21A-1C) with one new scope — no new table, no new mechanism:

```ts
order_creation_ip: [
  { tierId: "burst", limit: 5, windowMs: FIVE_MINUTES_MS },
  { tierId: "hourly", limit: 10, windowMs: ONE_HOUR_MS },
],
```

Keyed **only** on the HMAC-SHA256 hash of the requester's IP (`hashIpForRateLimit()`, keyed from `AUTH_SECRET` — the same function every other IP-keyed scope already uses) — never email, name, order id, or any request-body content, since this is this app's one genuinely public, unauthenticated mutation route with no session to key against instead. The raw IP is never stored; a request with no resolvable IP falls back to the same shared `UNKNOWN_IP_SENTINEL` bucket the video-upload-token scope already established. `checkOrderCreationRateLimit()` is checked at the very top of `POST /api/orders`, before `request.json()` is ever called — a blocked or infrastructure-failed request never spends any work parsing a potentially large or malicious body.

**Two outcomes, deliberately different from every prior rate-limited route in this codebase:**

- **Over limit** → `429`, body `{ "error": "Too many requests. Please try again later." }`, with a `Retry-After` header (seconds, from the limiter's own computed reset time). A blocked request writes **zero** `rate_limit_events` rows, creates **zero** customer/order/order-line/audit rows.
- **Limiter infrastructure failure** (`AUTH_SECRET` unavailable, or a database error) → the route's own `try/catch` catches it and returns a controlled `503`, body `{ "error": "Service temporarily unavailable. Please try again later." }` — never an uncaught exception, never a false "allowed." This is a deliberate, small improvement over every prior rate-limited caller in this codebase (Brain/Creative Studio/video-upload-token all currently soft-fail-closed to `{allowed:false}` inside the limiter itself, which their callers then turn into whatever generic error path already existed) — approved specifically for this route and **not** retroactively applied to the existing callers, per explicit instruction. `checkOrderCreationRateLimit()` achieves this by `throw`ing on infrastructure failure rather than returning a soft-fail result, so the route's `try/catch` can convert it cleanly. Nothing about the failure — raw IP, HMAC key, database error detail — is exposed to the client or logged beyond one static, non-interpolated `console.error` line.

### `order.created` — the checkout path's first audit event

`AuditEventInput.adminUserId` (`src/server/audit-log.ts`) widened from `string` to `string | null` — `audit_log.admin_user_id` was already a nullable database column (`ON DELETE SET NULL`), so this is a TypeScript-only change, no migration. This is the first genuinely admin-less event this codebase writes: a real, unauthenticated customer triggered it, and `null` honestly records "no admin was involved" rather than requiring a fabricated id.

Written inside `create-order.ts`'s existing `db.transaction()`, immediately after the `order_lines` insert, so it commits or rolls back atomically with the order it describes:

```ts
await recordAuditEvent(tx, {
  adminUserId: null,
  action: "order.created",
  entityType: "order",
  entityId: insertedOrder.id,
  metadata: { orderNumber: insertedOrder.orderNumber, source: "checkout", lineCount: draft.lines.length },
});
```

Structurally unreachable from the fast-path idempotent-return (returns before the transaction ever opens) and from the `onConflictDoNothing`-losing-the-race branch (returns the *other* request's already-existing order directly, before this line — see "The fix — order `clientRequestId` race" below) — a retry of the same `clientRequestId` cannot reach this line a second time. Metadata is the smallest shape that says something useful: no customer name/email/phone/company, no notes, no request body, no IP, no pricing figures, no credentials — confirmed both by code review and by a live regression assertion pattern-scanning the actual stored metadata.

### First round of testing — 35/35, but one real reproducible concurrency bug surfaced

The first HTTP integration pass (35/35, using real `fetch()` calls against the real running `POST /api/orders` endpoint, RFC 5737 TEST-NET IPs, a temporary synthetic fixture product) confirmed the rate limiter, the 503 fail-closed path, `order.created`'s metadata, sequential idempotency, and every existing checkout tampering/validation regression all working correctly. But 5-way genuine concurrent duplicate submissions (`Promise.all`, same `clientRequestId`) showed exactly 1 of 5 requests returning an uncaught `500` on both independent runs — never a duplicate order or duplicate audit event (the order-level idempotency guarantee held perfectly throughout), but a real, reproducible spurious failure. Direct code reading pointed at the customer find-or-create step: it was the one unique-constraint-bearing statement in the transaction with no recovery path for a concurrent race, unlike the order insert immediately below it.

### Root cause — deeper than first diagnosed, found via in-process error capture

Fixing the customer-email path alone (`onConflictDoNothing({ target: customers.email })` — see below) did **not** eliminate the 500s; a second round of concurrency testing still showed them, at the same or a slightly higher rate. Wrapping `console.error` temporarily inside the test harness to capture the real thrown error (the route itself correctly never exposes this — only a generic message reaches the client) revealed the actual mechanism, in two layers:

1. **`isUniqueViolation()` never actually matched.** This `drizzle-orm` version (`^0.45`) wraps the real node-postgres/neon-serverless driver error inside a `DrizzleQueryError` whose own top-level `code`/`constraint` are `undefined` — the real Postgres error (`code: "23505"`, `constraint: "orders_client_request_id_unique"`) lives on `error.cause`. `isUniqueViolation()` only ever checked the top level, so it silently returned `false` for every real unique-violation from this driver — meaning the pre-existing order-level `clientRequestId` race recovery in `create-order.ts` had never actually been reachable. Fixed in `src/server/is-unique-violation.ts`: check `error.cause` as a fallback whenever the top-level shape doesn't carry `code`/`constraint`, keeping the top-level check first for any error shape that isn't wrapped this way. This is a shared helper — `mutate-product.ts`'s slug-collision detection uses it too, and gets the same correctness fix.
2. **Once reachable, the recovery itself was unsafe.** With `isUniqueViolation()` now correctly identifying the conflict, the existing catch block's recovery `SELECT` (run inside the same transaction right after the caught error) started failing with a *different*, real Postgres error: `25P02`, "current transaction is aborted, commands ignored until end of transaction block" — exactly the risk flagged in the approved fix direction. Once any statement in a Postgres transaction errors, the whole transaction is left unusable until `ROLLBACK`; a caught JS exception doesn't undo that at the database level, so a same-transaction recovery query can never work reliably. Fixed by applying the identical `onConflictDoNothing` + re-query pattern already used for the customer-email race to the order insert itself: `onConflictDoNothing({ target: orders.clientRequestId })` never throws on a conflict, so the transaction is never poisoned, and the follow-up re-query (only run when `onConflictDoNothing` actually found a conflict) is always safe.

With both fixes in place, `isUniqueViolation()`'s only remaining real caller in this codebase is `mutate-product.ts`'s slug-collision catch — `create-order.ts` no longer needs it at all (both of its own unique-constraint races now use the throw-free `onConflictDoNothing` pattern), so its import was removed from that file.

### The fix — customer-email race, applied first

`create-order.ts`'s customer find-or-create: when no existing customer is found, the insert now uses `.onConflictDoNothing({ target: customers.email }).returning()`. If a row comes back, it's a genuinely new customer. If not, another concurrent request won the race — the code re-queries by normalized email *inside the same, still-healthy transaction* (safe, since nothing threw) and uses that row. Per the approved data semantics, the **winning row always wins**: the losing request's own first/last name, phone, and company are discarded, never merged or used to patch the winner — deliberately simpler than the pre-existing non-destructive blank-field patch (which only applies when a request finds a genuinely pre-existing customer *up front*, not a same-instant race). If the re-query still finds nothing — structurally shouldn't happen, since a conflict implies a row exists — that's treated as a real, unexpected error and thrown, rolling back the transaction and producing the same safe generic client-facing message every other unexpected failure already does. No `customers.email` unique constraint was removed or weakened; no migration was needed.

### The fix — order `clientRequestId` race, applied second (same pattern, same transaction)

Once genuine concurrency testing proved the *pre-existing* order-level recovery didn't actually work (see Root Cause above), the identical pattern was applied to it: the order insert now uses `.onConflictDoNothing({ target: orders.clientRequestId }).returning()`. On a lost race, the code re-queries by `clientRequestId` inside the same transaction and returns that order directly — its `order_lines` and `order.created` audit event were already written by the winning request, so this path returns early rather than falling through to those inserts, which would otherwise create real duplicates.

### No migration needed

`customers_email_unique` and `orders_client_request_id_unique` both already existed, exactly as required, before this fix — confirmed by direct schema inspection. Nothing about either constraint changed; only how a losing transaction recovers from hitting one.

### PostgreSQL race-safety reasoning

`INSERT ... ON CONFLICT DO NOTHING` never raises an error for the conflict case — it simply inserts zero rows and returns an empty `RETURNING` set, so the surrounding transaction is never marked aborted. This sidesteps the whole question of whether a caught application-level exception can safely be followed by more statements in the same Postgres transaction — it structurally cannot rely on that, and (as directly proven by the `25P02` capture above) it does not in this codebase's driver. Every follow-up `SELECT` in both fixed paths only ever runs after a *conflict-free* insert attempt, never after a caught error, so it always executes against a healthy transaction.

### Test results — Tests A–D, 47/47 clean across 5 independent runs

Re-run against the real, running `POST /api/orders` endpoint, using a temporary synthetic fixture product and RFC 5737 TEST-NET IPs, with an added in-process `console.error` capture used only for diagnosis (not part of the shipped fix):

- **Test A — same `clientRequestId`, same email, 5 simultaneous requests**: all 5 responses `201`, all identify the same order, exactly 1 customer row, exactly 1 order row, exactly 1 `order.created` event. **Zero HTTP 500s across 5 independent full-suite runs** (previously 1–2 of 5 failed on every run before the fixes).
- **Test B — different `clientRequestId`s, same email, 5 simultaneous requests**: exactly 1 customer row for the shared email despite 5 concurrent orders; exactly 5 genuinely distinct orders created (one per distinct `clientRequestId`); zero customer-unique 500s; exactly 5 `order.created` events, one per order. This is the test that specifically distinguishes customer deduplication from order idempotency — both now correctly independent.
- **Test C — same email, conflicting optional customer metadata** (3 concurrent requests with different names/phones/companies for one shared email): no duplicate customer; the stored row matches exactly one of the three submitted variants (a deterministic single winner, confirmed by name); no blended/merged fields from the losing requests.
- **Test D — an unrelated unique-constraint collision** (same `clientRequestId` reused with a *different* email, deliberately exercising the order-level constraint independently of the customer-email path): resolves correctly to the original order, proving the two race-recovery paths stay independent and neither misinterprets the other's conflict.
- Sequential retry, rate-limit boundary (1–5 allowed, 6th `429` + `Retry-After`), 503 fail-closed (and recovery immediately after), and every existing checkout tampering/validation regression (price/total/unitPrice ignored, negative/zero/excessive quantity, nonexistent/unpublished product, fake option/add-on, malformed JSON, empty cart) — all reconfirmed intact.

### Test cleanup — independently re-verified twice, one real bug found and fixed in the test script itself (first round)

The first test script's own `finally` block tracked customer emails to delete via an array pushed to at each request site — but two request sites (the post-503-recovery confirmation request, the price-tampering regression check) built their request body inline without pushing to it, so their resulting real customer rows were silently never deleted. **Not caught by the test's own self-report** — caught by the separate, independent read-only re-query performed immediately afterward: `totalCustomers: 5` when only 1 (the real customer) was expected. Fixed by deleting by the reserved `@test-phase21c1.invalid` email-domain pattern instead of a tracked list, which the second-round test harness used from the start. Independently re-verified clean after all 5 final runs: `totalCustomers: 1`, `totalOrders: 1` (`BRCP-1013` only), `productCount: 1`, `leftoverTestProducts: []`, `leftoverTestCustomers: []`, `rateLimitLeftoverForOrderCreationIp: 0`, `orderLineCount: 1`, `auditOrderCreatedCount: 1` (the real, pre-existing `BRCP-1013` manual-order event from Phase 18B — unaffected).

### Real-data baseline — confirmed unaffected, before and after both fix rounds

A full read-only pass across every other table, captured before this fix session and re-confirmed byte-identical after all 5 final test runs: `leads` = 1, `notes` = 4, `brand_settings` published `primaryColor` = `#E70810`, `motion_settings` = 2 rows, `services` = 7, `portfolio_projects` = 4, `media_assets` = 4, `audit_log` total = 89. `BRCP-1013` itself confirmed completely untouched (`status: "approved"`, `paymentStatus: "unpaid"`, unchanged) throughout. `brain_requests` (9) and the `brain_admin` rate-limit scope (1 row) reflect real, ordinary owner usage unrelated to, and untouched by, this phase.

### What this phase deliberately did not add

Per the approved scope: no Stripe, no payment provider, no webhooks. No change to `orders.paymentStatus` or either status transition table. No inventory system. No `pricingSummary` JSONB-to-typed-columns migration. The idempotency *architecture* itself (client-generated `clientRequestId` plus a real DB unique constraint as the final authority) was not changed — only the two race-recovery code paths that sit on top of it. Vercel Firewall was deliberately **not** configured this phase either — the earlier architecture inspection found its available dashboard controls didn't provide the path-targeting/machine-readable-429 behavior this phase needed, so the existing Postgres-backed application-level limiter was extended instead; Vercel Firewall remains documented as optional future defense-in-depth if its feature set changes. No refactor of the existing Brain/Creative Studio/video-upload-token rate-limit callers to match this route's new 503-fail-closed pattern (approved for this route specifically, not retroactively).

## Payment Schema + Provider Abstraction (Phase 21C-2A)

**Status: complete — infrastructure only, migration applied and fully verified against real Neon. Schema and a provider interface, nothing else. No Stripe package installed, no Stripe API request ever made, no PaymentIntent created, no webhook endpoint, no frontend/checkout change, no CSP change, no refund, no deposit redesign, and no real or test-mode money movement of any kind.** This is the first of six approved Phase 21C-2 sub-gates (21C-2A–F, see Roadmap) — each requires its own separate approval before starting; approval of 21C-2A is not approval of 21C-2B, and this phase's completion does not imply any later sub-phase is approved to begin.

### Payment authority model — the chain of trust this entire future integration must preserve

```
Product configuration (src/data/products.ts / the products table)
  → authoritative PRODUCT pricing

Server-created order + order_lines (src/server/create-order.ts, unchanged since Phase 21C-1)
  → authoritative FROZEN order amount — computed server-side, never client-submitted

Future PaymentIntent (Phase 21C-2B, not built yet)
  → its amount MUST be derived from the persisted, server-owned order total above —
    never from anything a browser sends

Stripe (once integrated)
  → future authority for whether money actually moved — this app will never assert
    payment success on its own say-so

orders.paymentStatus (this table, today)
  → this application's own business-state field — the one place code branches on
    "is this order paid," independent of whatever Stripe's own raw status says

Browser
  → NEVER authoritative for price, amount, payment success, refund success, or
    paymentStatus — no exception, now or in any future sub-phase
```

Two rules that follow directly from this chain, stated explicitly because they are the load-bearing safety property of the entire future payment feature: **a Stripe-linked order must remain `unpaid` until a future PaymentIntent has been successfully created *and* its identifier has been safely persisted** — the `unpaid → pending` transition may only ever be performed by that future, successful operation, never by order creation alone and never by a client request. And **a Stripe-linked order may become `paid` only from a future, signature-verified Stripe webhook** — never a frontend callback, a redirect query parameter, a `clientSecret` result, a browser success message, or an admin dropdown.

### Payment status — additively widened, nothing removed or renamed

Before changing anything, every existing usage of `PAYMENT_STATUSES`/`paymentStatus`/`isValidPaymentStatusTransition` was inspected directly: `src/server/brain/context-builder.ts` (Big Red Brain's order-context payment counts), `src/app/admin/(protected)/page.tsx` (the dashboard's "Deposit paid" metric), `src/components/admin/OrdersFilterBar.tsx` (the orders filter dropdown), `src/server/queries/orders.ts` (`getPaymentStatusCounts()` — a real `GROUP BY` query returning a dynamic `Record<string, number>`, and `isValidPaymentStatus()` — a plain array-membership check), and `src/components/admin/OrderPaymentStatusForm.tsx`/`src/server/mutate-order.ts` (the admin manual-status-change form and its Server Action). None of these use an exhaustive `switch`, so **every one of them is unaffected by adding new values** — confirmed by direct inspection, not assumed.

`PAYMENT_STATUSES` (`src/data/orders.ts`) widened from `["unpaid", "deposit-paid", "paid-in-full", "refunded"]` to:

```ts
["unpaid", "pending", "paid", "failed", "canceled", "deposit-paid", "paid-in-full", "refunded"]
```

**Nothing existing was removed, renamed, or reinterpreted.** `unpaid`/`deposit-paid`/`paid-in-full`/`refunded` keep their exact original meaning and remain the values used by manual/off-platform orders — unchanged since Phase 18B. `pending`/`paid`/`failed`/`canceled` are new: the future Stripe-linked path's own values. **`paid` is a deliberately separate, new value from `paid-in-full` — not a rename** — so a fully-paid manual order and a fully-paid Stripe order stay textually distinguishable, and no existing code checking for `"paid-in-full"` needs to also learn about `"paid"`. The one real order in production, `BRCP-1013`, has `paymentStatus: "unpaid"` — a value that remains valid unchanged; no real order currently uses `paid-in-full`/`refunded`, so there is no data-correction concern either way. The column itself is, and remains, plain `text` with no CHECK constraint (matching every other status column in this schema) — widening the allowed TypeScript values required **zero SQL migration**, the exact same precedent already established for Phase 18B's `ORDER_STATUSES` widening.

**One honestly-flagged, real naming inconsistency, not introduced by this phase**: the new `"canceled"` (US spelling) sits alongside `orders.status`'s own pre-existing `"cancelled"` (UK spelling, the unrelated work-status value). This is a genuine, easy-to-miss quirk between two independent enums — noted explicitly here rather than silently normalized, since correcting `orders.status`'s spelling is a separate, unrelated concern well outside this phase's scope.

### Transition table — additive, existing manual transitions byte-for-byte unchanged

```ts
export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ["pending", "deposit-paid", "paid-in-full"],   // "pending" is the one addition
  pending: ["paid", "failed", "canceled"],
  paid: [],
  failed: ["pending"],
  canceled: [],
  "deposit-paid": ["paid-in-full", "refunded"],       // unchanged
  "paid-in-full": ["refunded"],                // unchanged
  refunded: [],                        // unchanged
};
```

Matches the accepted transition model exactly:

```
unpaid → pending | deposit-paid | paid-in-full
pending → paid | failed | canceled
failed → pending
deposit-paid → paid-in-full | refunded
paid-in-full → refunded
paid / canceled / refunded → no outgoing transitions
```

**`paid` and `paid-in-full` were deliberately NOT collapsed into one value in this phase.** `paid` is reserved exclusively for the future Stripe-linked payment path; `paid-in-full` remains exactly its existing meaning for manual/off-platform compatibility. Both currently share the same "fully paid" business meaning from an outside observer's perspective, but keeping them textually distinct means no future Stripe-specific logic ever needs to also handle a manual-order code path (or vice versa) by accident, and no existing manual-order code needed to change at all to make room for Stripe. `paid` has no outgoing transition yet — refund transitions for Stripe-linked orders (`paid → partially_refunded`/`refunded`) are explicitly deferred to Phase 21C-2F, not added here, per instruction.

**The core semantic rule, enforced by construction, not just documentation**: no code anywhere in this phase ever performs the `unpaid → pending` transition — it exists in the table now only so a *future*, separately-approved PaymentIntent-creation step (21C-2B) has an already-reviewed transition to call `isValidPaymentStatusTransition()` against once it actually exists. An order remains `unpaid` until a real PaymentIntent has been successfully created **and** its identifier safely persisted — order creation alone never implies `pending`, and a Stripe outage during PaymentIntent creation must never leave a fake `pending` order behind (a real risk this phase's design explicitly guards against for 21C-2B to inherit correctly).

### Known, documented gap — closed by Phase 21C-2D

`OrderPaymentStatusForm` originally rendered **every** value in `PAYMENT_STATUS_TRANSITIONS[currentStatus]` as an admin-clickable option, with no awareness of whether an order was Stripe-linked. This was harmless at the time this note was written — no code in the codebase could yet set `stripePaymentIntentId` (that first happened in Phase 21C-2B), so no real order could yet be Stripe-linked and the gap was unreachable in practice. **Phase 21C-2D closed this gap** — see "Signed Stripe Webhooks (Phase 21C-2D)" → "Admin guard" below: `setOrderPaymentStatusAction` now rejects any manual `paymentStatus` mutation on a Stripe-linked order server-side (the real, authoritative boundary), and `OrderPaymentStatusForm` additionally hides the control entirely for one, as a courtesy.

### Manual vs. Stripe-linked payment handling — no new discriminator column needed

`orders.stripePaymentIntentId` (below) **is** the distinguishing signal between the two regimes — no separate column was added to distinguish them, per instruction to use the smallest solution that existing fields can support safely. A manual/off-platform order's `stripePaymentIntentId` stays `NULL` forever; a future Stripe-linked order gets it set exactly once, by the (not-yet-built) PaymentIntent-creation step. Combined with the payment-status vocabulary split above (manual orders use `deposit-paid`/`paid-in-full`; Stripe orders use `pending`/`paid`/`failed`/`canceled`), a future admin UI or webhook handler can always tell which regime an order belongs to from data already being added this phase — no new column was genuinely needed.

### Schema additions — `orders` gains 4 nullable columns, zero impact on existing rows

```ts
stripePaymentIntentId: text("stripe_payment_intent_id"),     // nullable, unique index — the ONE PaymentIntent linked to this order
stripePaymentStatus: text("stripe_payment_status"),        // nullable, informational only — NEVER authoritative
paidAt: timestamp("paid_at", { withTimezone: true }),       // nullable — set once, by a future verified webhook
paymentFailedAt: timestamp("payment_failed_at", { withTimezone: true }), // nullable — most-recent-attempt only, not history
```

**`refundedAmountCents` was deliberately NOT added this phase** — per instruction, refund fields belong to the later refund phase (21C-2F), once that architecture is separately approved. `stripePaymentStatus` is explicitly informational — business logic must never branch on it; `orders.paymentStatus` (the existing, transition-guarded column) remains the one authoritative business-state field, exactly mirroring how `orders.status` and `orders.paymentStatus` already stay independent axes today.

The new unique index (`orders_stripe_payment_intent_id_unique`) is a plain unique index over a nullable column — Postgres treats multiple `NULL`s as distinct for unique-index purposes, so this correctly allows unlimited manual orders (which stay `NULL` forever) while still guaranteeing at most one order per real Stripe PaymentIntent once that column is ever populated. No partial-index `WHERE` clause was needed to achieve this — standard Postgres unique-index behavior already provides it.

### `stripe_webhook_events` — the minimum table for future webhook idempotency

```ts
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),        // the future Stripe event's own "evt_..." id, verbatim
  type: text("type").notNull(),       // e.g. "payment_intent.succeeded" — debugging/observability only
  relatedOrderId: uuid("related_order_id").references(() => orders.id, { onDelete: "set null" }),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
```

`id` **is** the idempotency mechanism — a future webhook handler's first statement is `INSERT ... ON CONFLICT (id) DO NOTHING`; zero rows affected means "already processed, no-op," mirroring the exact race-safe pattern Phase 21C-1 just proved for `customers.email`/`orders.clientRequestId`. **No secondary index was added** — the primary key already covers the only query this table will ever need to serve (a lookup by event id), and adding one without a demonstrated query need would be exactly the kind of unjustified redundancy the approved scope asked to avoid. `relatedOrderId` uses `ON DELETE SET NULL` (never `CASCADE`), matching this schema's own standing convention that historical/audit-adjacent rows must never be deleted merely because the entity they reference changes or disappears. **No raw webhook body, no JSON Stripe object, no webhook signature, no customer PII, no payment method data, and no credential of any kind is stored here or anywhere in this phase.**

### Payment provider abstraction — interface only, no implementation, no registry

`src/server/payments/provider.ts` — deliberately narrower than `TextProvider`/`ImageProvider` (`src/server/brain/providers/text-provider.ts`, `src/server/creative-studio/providers/image-provider.ts`), which exist because Big Red Brain/Creative Studio needed a real provider-*selection* concept from day one. Payments do not: there is exactly one real-world target, no "which model" concept applies, and — per explicit instruction — **no registry file was created merely for symmetry**. A registry (`getConfiguredPaymentProvider()`-equivalent) is Phase 21C-2B's first deliverable, once a concrete implementation actually exists to select; creating one now would mean either a function with nothing real to return, or one that risks silently importing/constructing a real Stripe client ahead of approval — exactly what this phase's scope prohibits.

```ts
export type CreatePaymentIntentRequest = {
  orderId: string;       // this app's own permanent order id — never client-chosen
  amountCents: number;    // read from the order's own frozen total — never raw checkout/request-body input
  currency: "usd";      // fixed, server-decided — never client-selectable
  idempotencyKey: string;   // server-generated (e.g. from the order's own id) — never client-submitted
};

export type CreatePaymentIntentResult = {
  provider: string;
  providerPaymentIntentId: string;
  clientSecret: string;    // must never be logged or written to audit_log — short-lived, effectively a bearer credential
  status: string;
};

export interface PaymentProvider {
  readonly providerName: string;
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResult>;
}
```

Plus `PaymentProviderError` (a typed `Error` subclass carrying one of a small, closed `PaymentProviderErrorCategory` — `invalid_request` | `provider_unavailable` | `idempotency_conflict`), mirroring `TextProviderError`/`ImageProviderError`'s exact shape. This category vocabulary is explicitly a first-pass contract, not a finished taxonomy — a real implementation (21C-2B) may refine it once it's actually mapping a real SDK's error shapes onto it. **No concrete implementation exists.** Nothing in this codebase imports the `stripe` package (confirmed: not in `package.json`, not in `node_modules`), and nothing calls any method this interface describes.

### A real, honest operational finding from this phase's own verification — since resolved

Between generating the migration and applying it, applying the `schema.ts` change to the TypeScript definitions had an immediate, real side effect on this dev environment: any code path doing an unqualified `db.select()`/`db.query.orders.findFirst()` against `orders` generated SQL referencing the 4 new columns, which didn't exist in the live (not-yet-migrated) Neon database yet — confirmed directly: a plain Drizzle-query-builder read against `orders` returned a genuine `500` against the real running dev server during that window. This was expected, standard Drizzle workflow (a schema change and its migration are meant to be applied together, not left straddling) — not a defect — but meant this dev server's order-related admin/checkout pages were briefly non-functional. **Confirmed fully resolved after the migration was applied**: the exact same Drizzle query-builder functions the real admin pages use (`getOrderById()`, `listOrders()` from `src/server/queries/orders.ts`) were re-exercised directly and returned correct `200` results (`BRCP-1013` found, `paymentStatus: "unpaid"`, `listTotalCount: 1`) — not just a raw-SQL workaround, the actual application code path.

### Migration — generated, reviewed, and applied

`drizzle/0017_worthless_steel_serpent.sql` — one `CREATE TABLE` (`stripe_webhook_events`), four `ALTER TABLE ... ADD COLUMN` statements (all nullable, no default beyond what's declared above), one `ALTER TABLE ... ADD CONSTRAINT` (the `relatedOrderId` FK, `ON DELETE SET NULL`), one `CREATE UNIQUE INDEX`. No `DROP`, no destructive `ALTER`, no data-modifying statement of any kind, no hardcoded secret or default value. All 17 prior migration files (`0000`–`0016`) confirmed byte-identical via SHA-256 comparison before generation, again before applying, and a third time after applying. `drizzle/meta/_journal.json`'s diff confirmed strictly append-only (one new entry, nothing reordered or removed) at every check. `npm run db:migrate` applied successfully; `drizzle.__drizzle_migrations` confirms migration id `18` recorded with a `created_at` timestamp matching the journal's own `0017` entry exactly.

### Acceptance history — what was genuinely verified against the real, live Neon database

Using a temporary, read-only verification route (deleted immediately after each use, the same established pattern every prior phase in this codebase has used) against the real, running dev server and real Neon database:

- Migration `0017` applied successfully with no errors.
- All 4 new `orders` columns confirmed live with exact types (`text`, `text`, `timestamp with time zone`, `timestamp with time zone`), all nullable, no defaults.
- A direct query across **every** existing order (not just BRCP-1013) confirmed **zero** rows have a non-null value in any of the 4 new columns.
- `BRCP-1013` reconfirmed completely unchanged: same permanent id, same order number, `status: "approved"`, `paymentStatus: "unpaid"`, all 4 new fields `null`, same `customerId`/`createdAt`/`updatedAt`.
- `orders_stripe_payment_intent_id_unique` confirmed as a real unique btree index on exactly `stripe_payment_intent_id`; the full index list on `orders` shows exactly 4 indexes total — no unexpected extra index was created.
- `stripe_webhook_events`'s live schema confirmed to exactly match the design: `id` (text, PK), `type` (text, not null), `related_order_id` (uuid, nullable), `processed_at` (timestamptz, not null, default `now()`).
- `stripe_webhook_events` row count confirmed **0**.
- The FK (`stripe_webhook_events.related_order_id → orders.id`, `ON DELETE SET NULL`) confirmed exactly, with no CASCADE. A reverse-FK check (`orders` referencing `stripe_webhook_events`) confirmed empty. A trigger check on both tables confirmed empty. A function-name search for anything webhook/stripe/payment-related confirmed empty — no processing function exists anywhere in the database.
- The provider abstraction (`src/server/payments/provider.ts`) reconfirmed to contain zero Stripe import, zero network call, zero `fetch`, zero SDK client, zero registry/instantiation of any real provider.
- No Stripe dependency in `package.json`/`node_modules`; no Stripe environment variable anywhere in `.env.example` or the diff.
- No `clientSecret` persistence anywhere — a live, whole-database `information_schema.columns` scan for card-number/CVC/CVV/PaymentMethod/Stripe-secret/webhook-secret/signature/raw-body/client-secret/payment-credential-shaped column names returned **zero matches**.
- `audit_log` total confirmed unchanged (89, both before and after the migration) — the migration itself created **zero** application audit events, exactly as required.
- `rate_limit_events` confirmed to still show only the one legitimate, pre-existing `brain_admin` row — no leftover test rows of any kind.
- The complete real-data baseline (leads, notes, products, services, portfolio, media assets, Brain requests, Creative Studio jobs, Motion settings, Brand, Homepage Hero) reconfirmed byte-identical before and after.
- The order-query 500 caused by the temporary pre-migration schema/migration mismatch (documented above) confirmed fully resolved after migration, via the real application query functions, not just raw SQL.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all confirmed clean, both before and after migration application.

### What this phase deliberately did not add

Per the approved scope: no `stripe`/`@stripe/stripe-js`/`@stripe/react-stripe-js` package (confirmed absent from `package.json` and `node_modules`). No `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/publishable key of any kind (confirmed absent from `.env.example` and the full diff). No PaymentIntent ever created, no webhook endpoint, no `CheckoutView.tsx`/frontend/payment UI change, no CSP change (`next.config.ts` untouched). No refund fields/logic (`refundedAmountCents` deliberately deferred to 21C-2F). No Stripe deposit-collection redesign — `deposit-paid` remains exactly its existing manual-order meaning; whether Stripe deposits eventually need one PaymentIntent or two remains an explicitly open, separately-decided question for a later sub-phase. No real or test-mode money moved — no Stripe API request of any kind occurred anywhere in this phase.

## Payment Capability Foundation (Phase 21C-2B-0)

**Status: complete — a purpose-built payment authorization capability, entirely separate from `clientRequestId`, added ahead of any real PaymentIntent code. Migration applied and fully verified against real Neon. No Stripe package, no Stripe credentials, no PaymentIntent, no payment route, no checkout wiring, no webhook, no CSP change, and no payment capability actually enabled yet — the columns exist and the helper functions work, but nothing in this codebase calls them.**

### Why a separate capability, not `clientRequestId`

`clientRequestId` remains **exclusively** order-creation idempotency (`src/server/create-order.ts`'s existing `orders_client_request_id_unique` guarantee, unchanged since Phase 21C-1) — it was deliberately **not** reused as the authorization secret for a future payment-initialization endpoint, per explicit direction. Conflating the two would mean one value carrying two different trust boundaries: "prevents a duplicate order" and "proves you're allowed to move money for this order" are genuinely different concerns, and collapsing them risks a future change to one silently weakening the other. `paymentAccessToken` (design) / `paymentAccessTokenHash` (what's actually persisted) is the separate, purpose-built answer — it authorizes **payment initialization/resumption only**, and — once a future, separately-approved payment-status-lookup feature exists — **payment-status polling only**. It must never authorize order-line mutation, customer-info mutation, pricing mutation, direct `paymentStatus` mutation, refunds, cancellation, or any admin functionality — those all remain exclusively behind `requireAdminUser()`, unaffected by anything this phase adds.

### Token design

- **Generation**: `crypto.randomBytes(32)` — 32 bytes, exactly 256 bits of CSPRNG entropy, the approved minimum.
- **Representation**: hex-encoded to a fixed 64-character string (chosen over base64url for simplicity/predictable length — this token is never meant to appear in a URL, where base64url's compactness would matter more).
- **Persisted form**: plain `SHA-256` digest of the raw token — **the raw token itself is never stored anywhere**, only its hash.
- **Verification**: `crypto.timingSafeEqual()` on the two fixed-length digest buffers — constant-time by construction, so there's no timing side-channel on the comparison itself.
- **Lifetime**: 24 hours (`PAYMENT_ACCESS_TOKEN_LIFETIME_MS`) — long enough for a customer who steps away mid-checkout and returns the same day or overnight, short enough that the token isn't a long-lived standing credential. Not tied to any other constant elsewhere in the codebase, so this number can be revisited later without a migration.

### Hash choice — plain SHA-256, deliberately not HMAC-SHA256

This codebase's own existing precedent, `hashIpForRateLimit()` (Phase 21A-1C), uses a **keyed** HMAC-SHA256 specifically because an IPv4 address has only 32 bits of entropy and is fully enumerable — its own documented reasoning states plainly that a plain hash there would be "trivially reversible." **That reasoning does not transfer to this token.** The payment access token has 256 bits of machine-generated, cryptographically random entropy — a search space no realistic attacker can enumerate, with or without a server-side pepper. A leaked `payment_access_token_hash` value cannot be reversed to its original token by any known method regardless of whether an HMAC key was mixed in, so adding one (a new secret dependency, or reuse of `AUTH_SECRET` for an unrelated purpose) would add complexity without a corresponding real security gain for this specific threat model. Plain `SHA-256` is the correct, minimal choice here — the entropy profile, not the algorithm, is what does the real work.

### Schema — two additive, nullable columns on `orders`

```ts
paymentAccessTokenHash: text("payment_access_token_hash"),
paymentAccessTokenExpiresAt: timestamp("payment_access_token_expires_at", { withTimezone: true }),
```

Both nullable, no default, no backfill. **Every existing order — including the real `BRCP-1013`, every manual/off-platform order, and every inquiry-mode order — reads `NULL` for both, and will continue to for as long as nothing calls the token-generation helper**, which nothing does yet. **No index and no unique/other constraint was added on either column** — the future lookup pattern is always "fetch the order by its own primary key first, then compare the hash on that one already-fetched row," never "look up by hash value alone," so no index has a demonstrated query need; a SHA-256 collision across a 256-bit-entropy input space isn't a real concern a database constraint needs to guard against either. This mirrors the exact "add only indexes/constraints with a demonstrated need" discipline `stripe_webhook_events` already established in Phase 21C-2A.

### Helper module — pure functions, no wiring, no persistence logic of its own

`src/server/payments/access-token.ts` exports `generatePaymentAccessToken()` (returns `{rawToken, hash, expiresAt}` — the raw token is handed back exactly once, to whatever future caller is responsible for giving it to the customer and never logging/persisting it itself) and `verifyPaymentAccessToken(order, presentedRawToken, now?)` — a pure, DB-independent function taking an already-fetched order's two relevant fields directly, so it's fully unit-testable without a real database, a real HTTP request, or any Stripe involvement. It returns a plain `false` uniformly for every failure reason (no token issued, wrong token, expired token) — exactly the uniform result a future endpoint needs to build its "identical generic response either way" behavior on top of, so a wrong/missing/expired capability is never distinguishable from a nonexistent order.

### The future authorization boundary (documented now, not built)

A future `POST /api/orders/[id]/payment-intent` (Phase 21C-2B, not started) will require **both** the order id and the raw token, presented via a request body field — never a URL query parameter (mirroring the exact rule already established for Stripe's own `client_secret`). The server will: fetch the order by id, verify the presented raw token against the stored digest, verify it hasn't expired, and — for any failure among "order doesn't exist," "wrong token," "missing token," or "expired token" — return the **same generic response**, never revealing which case applied. Only after that capability check passes does the endpoint evaluate payment eligibility (`isStripePaymentEligible()`, from the Phase 21C-2 architecture report). This capability is scoped narrowly and permanently: payment initialization/resumption, and — only if separately approved later — payment-status polling. It is never a general-purpose order-access token.

### Test results — 13/13, before and after migration

Using a temporary, DB-independent test route exercising the pure helper functions directly (no real order, no real HTTP endpoint, no Stripe involvement exists yet to test against): token length confirms 64 hex characters (256 bits); two generated tokens differ; the hash differs from its own raw token; the correct token verifies; a wrong token is rejected; a token generated for one (synthetic) order cannot authorize a different one, in both directions; an empty/missing token is rejected; a token is valid one second before its 24-hour expiry and rejected one second after; an order with no token info at all (the same shape a real ineligible order has) is rejected with the identical `false` a wrong token produces; a `clientRequestId`-shaped value cannot substitute for the real token; and — confirmed by direct code review, not a runtime assertion, since nothing calls this module yet — zero `console.*` calls and zero audit-event writes exist anywhere in `access-token.ts`. **Re-run and reconfirmed 13/13 passing after the migration was applied**, identical results before and after (expected, since these are pure functions with no database dependency).

### Migration — applied and verified

`drizzle/0018_pretty_juggernaut.sql` — two `ALTER TABLE ... ADD COLUMN` statements, both nullable, no default, no data-modifying statement of any kind. All 18 prior migration files (`0000`–`0017`) confirmed byte-identical via SHA-256 before generation, before applying, and after applying. `drizzle/meta/_journal.json` confirmed strictly append-only at every check. Applied via `npm run db:migrate`; `drizzle.__drizzle_migrations` confirms migration id `19` recorded with a `created_at` matching the journal's own `0018` entry exactly, and remains the newest applied migration.

Post-migration, live-verified: both columns present with the exact designed types/nullability/no-default; every existing order (not just BRCP-1013) confirmed `NULL` in both; `BRCP-1013` itself confirmed completely unchanged (same id, same order number, `status: "approved"`, `paymentStatus: "unpaid"`); `orders`' full index list shows exactly its 4 pre-existing indexes — no new index was created; a live, whole-database `information_schema.columns` scan for `%payment_access_token%`/`%payment_token%`/`%raw_token%`-shaped names found only the two intended columns, confirming no raw-token column or any other unexpected credential-adjacent field exists anywhere. `audit_log` confirmed unchanged (the migration itself created zero application audit events); `rate_limit_events` confirmed to still show only the one legitimate `brain_admin` row; the complete real-data baseline (customers, products, leads, notes, services, portfolio, media assets, Brain requests, Creative Studio jobs, Motion settings, Brand, Homepage Hero) reconfirmed byte-identical.

### What this phase deliberately did not add

No `stripe` package, no `STRIPE_SECRET_KEY`, no PaymentIntent creation, no `/api/orders/[id]/payment-intent` route, no wiring of token issuance into `create-order.ts`/checkout (a future, separately-approved order-creation change), no webhook, no CSP change, no frontend/checkout UI change. **The payment capability described in this section exists as schema and pure helper functions only — nothing in this codebase currently generates, issues, or verifies a real payment access token for a real order.** Completion of this sub-phase does **not** imply approval of Phase 21C-2B — each remains separately gated.

## Payment Reconciliation Timestamp (Phase 21C-2B)

**Status: schema-only foundation. One new nullable column on `orders`, plus documentation of the future algorithm it exists to support. No Stripe package, no PaymentIntent creation, no payment-intent route, no Stripe API call of any kind occurred in this step.** This is a correction to the Phase 21C-2 architecture review's original cross-system-failure design, made before any of Phase 21C-2B proper is implemented.

### Why `orders.createdAt` is not a safe reconciliation anchor

The original architecture review assumed a deterministic Stripe idempotency key (`brcp_payment_<order-id>`) stays safely reusable for 24 hours from *order creation*. That's wrong: Stripe guarantees a key is honored for "at least 24 hours" from when it was **first used**, not from when the order was created — and a customer may create an order and not attempt payment until hours later. Anchoring reconciliation on `createdAt` would either fail closed on legitimate first-time attempts that happen to fall outside a 24-hour-from-creation window, or (worse) allow a stale-key retry past Stripe's real retention guarantee, risking exactly the "blind second PaymentIntent" scenario this design exists to prevent.

### The column

```ts
stripePaymentIntentAttemptedAt: timestamp("stripe_payment_intent_attempted_at", { withTimezone: true }),
```

Nullable, no default, additive — every existing order, including `BRCP-1013`, reads `NULL`. **Meaning**: the timestamp of the *first actual attempt* to create a Stripe PaymentIntent for this order — never order-creation time, payment-completion time, latest-retry time, or webhook time. A future payment-intent endpoint (Phase 21C-2B proper, not built) sets this exactly once, atomically, immediately before the first real `stripe.paymentIntents.create()` call — ordinary retries never reset it.

### Future algorithm this column supports (documented now, not implemented)

```
CASE 1 — stripePaymentIntentId null, stripePaymentIntentAttemptedAt null
  → first attempt allowed; set stripePaymentIntentAttemptedAt atomically,
    immediately before the provider create() call; never reset on retry

CASE 2 — stripePaymentIntentId null, stripePaymentIntentAttemptedAt < 24h old
  → retry using the same deterministic idempotency key; recovery allowed

CASE 3 — stripePaymentIntentId null, stripePaymentIntentAttemptedAt >= 24h old
  → FAIL CLOSED — no Stripe create call, no replacement PaymentIntent, no
    paymentStatus change — payment.reference_anomaly,
    reason: "reconciliation_window_expired"

CASE 4 — stripePaymentIntentId already set
  → the 24h reconciliation-window restriction no longer applies; retrieve/
    resume that exact persisted PaymentIntent — a resume is never blocked
    merely because stripePaymentIntentAttemptedAt is old

CASE 5 — stripePaymentIntentId set, but Stripe reports that exact object missing
  → FAIL CLOSED — never clear the id, never create a replacement, never
    change paymentStatus — payment.reference_anomaly,
    reason: "missing_provider_reference"
```

Cases 3 and 5 are deliberately symmetric: both are real anomalies requiring human investigation, never automatic repair. Neither the customer nor the server can safely guess the right recovery action — a corrupted reference, a wrong Stripe account/key, a test/live mismatch, or a genuinely pruned idempotency key all look the same from the order's own perspective, and only a human (using the already-existing, already-shipped admin `OrderPaymentStatusForm` capability) can correctly diagnose and resolve one.

### Future audit event (vocabulary only — not wired)

```
payment.reference_anomaly
metadata: { orderNumber, reason }   // reason: "missing_provider_reference" | "reconciliation_window_expired"
adminUserId: null
```
Never includes `clientSecret`, `paymentAccessToken`, the payment token hash, a Stripe secret, a raw provider response, customer PII, or card/payment-method data — matching every other audit event's minimal-metadata discipline in this codebase. Not implemented in this step — `audit_log` accepts arbitrary action strings already, so no schema change is needed to introduce this action name later.

### Future customer response (identical for both anomaly reasons)

```
HTTP 503
{ "error": "Payment setup is unavailable for this order. Please contact us for assistance." }
```
Deliberately identical regardless of which reason applies internally — the customer is never told which anomaly occurred, only that something requires the business's attention.

### Token rotation — concurrency semantics finalized (Option A, no advisory lock)

An `/api/orders` retry (same `clientRequestId`) may rotate a payment-eligible order's `paymentAccessToken`; the previous token becomes invalid immediately (the hash column is overwritten, never appended — at most one valid hash exists per order at any time). `clientRequestId` still never authorizes `/payment-intent` directly — it continues to authorize exactly one thing, retrying the order-creation request; token rotation is a side effect of that pre-existing, already-approved retry path, never a new grant of payment authority through a new channel. Under truly simultaneous retries, an earlier response's returned token can theoretically become stale relative to a later transaction's overwrite — accepted as a narrow, self-healing edge case (a stale token reads as "wrong token," and the same safe retry path resolves it) rather than adding row-level serialization for a risk this narrow. Hash-only persistence is unweakened.

### Remote branch cleanup (unrelated to this schema change, performed the same session)

`origin/phase-21c-payment-capability` was found to still exist on GitHub despite being believed deleted after Phase 21C-2B-0's merge. Verified fully merged into `origin/main` (`git merge-base --is-ancestor`) before deletion; deleted via `git push origin --delete`; `git fetch --prune` plus a live `git ls-remote --heads origin` both confirmed it genuinely gone afterward. No other branch was inspected or touched.

## Stripe PaymentIntent Creation (Phase 21C-2B)

**Status: COMPLETE. TEST MODE ONLY, implemented, mock-tested, and validated against one genuine real Stripe test-mode PaymentIntent — see "Real Stripe test-mode acceptance" below.** Builds directly on the schema (Phase 21C-2A), the payment capability token (Phase 21C-2B-0), and the reconciliation timestamp (immediately above) — this is the actual provider integration and endpoint those three prepared for.

**This phase proved PaymentIntent *creation* only.** It did **not** prove, and does **not** claim to prove: customer card collection, 3D Secure, a successful payment, webhook-based reconciliation, a `paid` status transition, or refunds — every one of those is explicitly out-of-scope future work (Phase 21C-2C onward, see the Roadmap).

### Provider abstraction

`src/server/payments/provider.ts` (the Phase 21C-2A interface, extended): `CreatePaymentIntentRequest` gained `orderNumber` (metadata-only, never used for authorization or lookup); `CreatePaymentIntentResult` gained `livemode: boolean` — the second, independent layer of the test-mode-only guard (see below); `PaymentProviderErrorCategory` gained `provider_rate_limited`, distinct from `provider_unavailable` specifically so a future backoff strategy can treat "Stripe is throttling us" differently from "Stripe is down," even though both currently map to the same safe customer message; the interface gained `retrievePaymentIntent(id): Promise<CreatePaymentIntentResult | null>`, returning `null` — not throwing — specifically and only for Stripe's own "no such payment_intent" case.

`src/server/payments/stripe.ts` — the **one** file in this codebase allowed to import the `stripe` package, mirroring the exact boundary `openai.ts`/`openai-image.ts` already established for their own providers. Pinned API version `"2026-06-24.dahlia"`, `maxNetworkRetries: 1`, `timeout: 20_000` (20s — the SDK's own 80s default is far too long for a synchronous, user-facing checkout call), lazy client construction (importing this file, or even constructing a `StripePaymentProvider`, never requires `STRIPE_SECRET_KEY` — the env var is read only the first time a method is actually called, which is what lets this file be type-checked and exercised entirely through `MockPaymentProvider` without a real key). `buildStripeIdempotencyKey(orderId)` fixes the approved format, `brcp_payment_<order-id>`, in exactly one place.

**Two-layer test-mode-only guard.** Layer one: `getClient()` refuses to construct a Stripe client at all unless the configured key starts with `sk_test_` — a live key (`sk_live_...`) or anything else is rejected with a `provider_unavailable` error before any network access, and the key's value is never logged, not even a prefix substring. Layer two: every `CreatePaymentIntentResult` carries the real `livemode` boolean Stripe itself reports on the actual object, and `handle-payment-intent.ts` independently re-checks it on every create **and** every retrieve — never trusting the key-prefix check alone. A live-mode object reaching either check is `unexpected_livemode` (see vocabulary below), never silently accepted.

`mapStripeError()` translates the raw Stripe SDK exception hierarchy into the closed `PaymentProviderErrorCategory` — nothing outside `stripe.ts` ever sees a raw Stripe error type: `StripeIdempotencyError`→`idempotency_conflict`, `StripeRateLimitError`→`provider_rate_limited`, `StripeInvalidRequestError`→`invalid_request`, `StripeAPIError`/`StripeConnectionError`/`StripeAuthenticationError`→`provider_unavailable`, anything unrecognized→`provider_unavailable` (the safest, fail-closed default). `resource_missing` on retrieve is special-cased to return `null` per the interface's own contract.

`src/server/payments/registry.ts` — `getConfiguredPaymentProvider()`, the one place a real provider is selected: zero arguments, always `new StripePaymentProvider()`, never influenced by request input. `src/server/payments/mock.ts` — `MockPaymentProvider`, a deterministic, network-free provider used only by the test suite; models real Stripe idempotency semantics faithfully enough for testing (same key + same amount/currency returns the cached result; same key + different params throws `idempotency_conflict`), plus a `markAsMissingOnRetrieve()` test hook for exercising Case 5.

### Eligibility

`src/server/payments/eligibility.ts` — `isStripePaymentEligible(order, lines)`, a pure, DB-independent function: `source === "checkout"`, `paymentStatus` ∈ {unpaid, pending, failed}, `!hasEstimatedPricing`, `depositDue === 0`, ≥1 line, integer `subtotal` ≥ `STRIPE_USD_MINIMUM_CENTS` (50¢, Stripe's own documented USD minimum), and every line's `purchaseMode` ∈ {fixed-price, full-payment}. Never evaluates anything the browser supplied directly — every field checked comes from an already-persisted, server-fetched order/line row.

### Token issuance and rotation — wired into `create-order.ts`

`src/server/payments/issue-token.ts`'s `issueOrRotatePaymentAccessToken()` is called from **all three** of `createOrder()`'s return paths (fresh insert, the fast-path idempotent-retry branch, and the `orders_client_request_id_unique` race-recovery branch) — every path that can hand an order back to a payment-eligible checkout gets the identical issue-or-rotate treatment. No-op (both token columns stay whatever they already were) for a non-eligible order. For an eligible order, every call — first creation or a later retry — generates a brand-new random token and overwrites the stored hash/expiry, per the approved Option A rotation semantics (see the reconciliation-timestamp section above). `POST /api/orders`'s response now conditionally spreads `paymentAccessToken` — present only when truthy, otherwise the key is fully absent, never `null`.

### `POST /api/orders/[id]/payment-intent`

`src/app/api/orders/[id]/payment-intent/route.ts` — public, no session, mirroring `POST /api/orders`'s own trust model exactly: authorization comes entirely from the request body's `paymentAccessToken`. The route itself contains only steps 1–2 of the approved ordering (rate limit, then zod body parsing — accepting *only* `paymentAccessToken`, no amount/currency/email/anything else) plus response-shape mapping; every other step lives in `src/server/payments/handle-payment-intent.ts`'s `handlePaymentIntentRequest()`, which takes an injected `PaymentProvider` so the entire test suite exercises it through `MockPaymentProvider`, never a real route, never a real Stripe key.

**Rate limiting**: a new `payment_initiation_ip` scope (`src/server/rate-limit.ts`) — 5/5min burst, 15/hr (slightly more permissive than `order_creation_ip`'s 10/hr, since a legitimate customer retrying a declined card a few times within an hour is normal, non-abusive behavior), IP-HMAC-keyed identically to every other IP-scoped limiter, checked strictly before `request.json()`. Infra failure (e.g. `AUTH_SECRET` unavailable) fails closed to `503`, matching `order_creation_ip`'s own precedent.

`handlePaymentIntentRequest()` implements the full approved flow in order: fetch order → verify token (identical `not_found` result for a wrong token, a missing token, an expired token, *or* a genuinely nonexistent order — never distinguishable) → eligibility (terminal `already_paid`/`canceled` get distinguishable reasons; everything else collapses to generic `ineligible`) → compute the authoritative amount fresh from `SUM(order_lines.lineSubtotal)`, cross-checked against the frozen `pricingSummary.subtotal` (a mismatch is a hard `amount_mismatch` anomaly, never silently resolved either way) → the full 5-case reconciliation algorithm documented above, now actually implemented: Case 1/2 fall through to a conditional `UPDATE ... WHERE stripePaymentIntentAttemptedAt IS NULL` (set once, atomically, never reset by an ordinary retry — the WHERE-null guard is what makes this safe under concurrency, mirroring Phase 21C-1's own `onConflictDoNothing` pattern applied to an UPDATE instead of an INSERT, since there's no natural unique-constraint shape for "claim this order") then a real provider call; Case 3 fails closed with zero provider calls; Case 4 resumes via `retrievePaymentIntent`; Case 5 fails closed, never clears the id. A genuinely concurrent request that loses the conditional-UPDATE race (Case D) re-fetches and resumes the winner's own PaymentIntent rather than creating a duplicate or erroring.

### Final, fully-approved anomaly vocabulary

```ts
export type PaymentAnomalyReason =
  | "missing_provider_reference"    // Case 5 — Stripe reports a persisted PaymentIntent id as gone
  | "reconciliation_window_expired"  // Case 3 — no PaymentIntent id yet, and the first attempt is ≥24h stale
  | "idempotency_conflict"       // the SAME idempotency key was reused with a genuinely different amount/currency
  | "amount_mismatch"          // order_lines total disagrees with the frozen pricingSummary.subtotal
  | "unexpected_livemode";       // a returned/retrieved PaymentIntent reports livemode:true — critical, must never happen in this TEST-MODE-ONLY phase
```

`unexpected_livemode` was proposed mid-implementation (the approved "never persist a live-mode object" safety requirement had no home in the other four) and was **explicitly approved** as the fifth member on review — a live-mode object appearing in this test-only payment path is a genuinely distinct critical configuration/provider anomaly, not a fit for any of the other four labels. Every anomaly writes a `payment.reference_anomaly` audit event (`adminUserId: null` — a real, unauthenticated customer path, same convention as `order.created`) with metadata limited to exactly `{orderNumber, reason}`; a successful new link writes `payment.intent_created` with `{orderNumber, provider}`. No audit event is written for an ordinary, retriable provider failure (`provider_unavailable`/`provider_rate_limited`/`invalid_request`) or for a plain resume — those are expected conditions, not anomalies. Both anomaly cases (Case 3 fail-closed, Case 5 fail-closed) and the live-mode guard (at both creation and at resume) return the identical customer-facing `503`: `"Payment setup is unavailable for this order. Please contact us for assistance."` — the customer is never told which internal reason applied.

### Logging discipline — a real, reviewed correction

The first implementation's outer catch-all logged `console.error("Payment intent handling failed", { orderId, error })` — flagged on review as unacceptable for a payment-adjacent path even though the error was believed sanitized: an `Error` object can carry a `.message`/`.stack` (or, from a misbehaving future provider implementation, a raw Stripe response) that no reviewer can fully guarantee is safe to persist to logs. **Corrected** to log only a safe order identifier plus a single, fixed, closed-vocabulary category we control:

```ts
console.error("Payment intent request failed.", { orderId, category: "unexpected_error" });
```

By the point this outer catch is reached, every classifiable failure (a `PaymentProviderError`, a real `payment.reference_anomaly`) has already been handled and returned above with its own specific, already-audited result — this catch only ever reaches a genuinely unexpected condition (e.g. a database error, or a provider throwing something other than `PaymentProviderError`), for which no further detail is logged at all. No `Error` object, `.message`, `.stack`, Stripe response/request object, `PaymentIntent` object, `providerPaymentIntentId`, `clientSecret`, `paymentAccessToken`, raw request body, customer information, IP/IP-hash, Stripe request id, Stripe header, or unmapped Stripe error code is ever logged anywhere in `src/server/payments/` or the payment-intent route — confirmed by direct enumeration of every `console.*` call in both locations (exactly two: this one, and the route's own static, contentless `"Payment initiation rate limiter unavailable"` line, identical in shape to `order_creation_ip`'s own precedent).

`clientSecret` itself is confirmed to appear only where structurally necessary: in-memory typed fields (`CreatePaymentIntentResult`, `PaymentIntentHandlerResult`) and the one success-path JSON response field — never in a `console.*` call, never in any `recordAuditEvent` metadata payload (all 8 metadata call sites in `handle-payment-intent.ts` are exactly `{orderNumber, reason}` or `{orderNumber, provider}`). The raw `paymentAccessToken`/`rawToken` is confirmed to reach only in-memory typed return values and the request/response JSON shape — the only database write involving it (`issue-token.ts`) persists `hash`/`expiresAt`, never `rawToken` itself.

### Mock test results — 24/24 (targeted re-verification after the logging fix)

Re-run against a temporary route (deleted immediately after) exercising `handlePaymentIntentRequest()` directly with `MockPaymentProvider`, using one real temporary fixture product and real order creation through the unmodified `createOrder()`: core eligibility/token-issuance/success flow, resume with an identical `clientSecret`, wrong-token and nonexistent-order both correctly collapsing to `not_found`, live-mode rejection at creation (id/paymentStatus confirmed untouched afterward), idempotency conflict, Case 3 (stale `attemptedAt`, confirmed **zero** provider calls made), Case 5 (missing-reference on resume, id confirmed **not** cleared), amount mismatch, every `payment.*` audit row's metadata confirmed to contain no secret/token/provider-id substring and confirmed to match the exact `{orderNumber, reason}`/`{orderNumber, provider}` key shape, 5-way genuine concurrency (`Promise.all`) sharing exactly one `clientSecret` with exactly one `isNew: true` winner — and, specifically targeting this session's fix, a provider deliberately throwing a plain `Error` containing an embedded fake secret/card/email string, confirmed to produce **exactly one** `console.error` call whose logged payload is **exactly** `{orderId, category: "unexpected_error"}` with the embedded sensitive string appearing nowhere in the captured log. All temporary rows (1 product, several orders/customers/order_lines/audit rows) deleted in a `finally` block; independently re-verified via a fresh, separate read-only query afterward — zero leftover rows of any kind, and the real `BRCP-1013` order confirmed completely untouched throughout (`payment_status: "unpaid"`, every new payment column still `null`, exactly as before this session).

### Real-data baseline — confirmed unchanged, before and after the mock suite

`leads`=1, `notes`=4, `services`=7, `portfolio_projects`=4, `media_assets`=4, `audit_log`=89, `brain_requests`=9, `ai_generation_jobs`=2, `motion_settings`=2, `orders`=1 (`BRCP-1013` only), `rate_limit_events`=1 (the one real, pre-existing `brain_admin` row) — all identical before this session's mock-testing work and after.

### Real Stripe test-mode acceptance — the first real Stripe API request in this project's history

Using a real, running dev server with a real Stripe **test-mode** secret key configured in `.env.local` (never committed, never printed, never logged), one clearly-tagged synthetic fixture was pushed through the actual, unmodified public pipeline — `POST /api/orders` → `POST /api/orders/[id]/payment-intent` — exactly once each, with no shortcuts and no direct function calls bypassing either route:

- **Synthetic product**: `prod_test-21c2b-live-accept` (`fixed-price`, `basePrice: 5000`).
- **Synthetic order**: `BRCP-1362` / `ca2f3953-80cc-48d9-abc6-a77e0a5139c0`, created via a real `POST /api/orders` call (`201`), correctly returning a `paymentAccessToken`.
- **Pre-call verification** (read-only, before any Stripe call): `paymentStatus: unpaid`, every Stripe/reconciliation column `null`, `paymentAccessTokenHash`/`paymentAccessTokenExpiresAt` populated, `SUM(order_lines.lineSubtotal) = 5000` matching `pricingSummary.subtotal = 5000` exactly, expected idempotency key `brcp_payment_ca2f3953-80cc-48d9-abc6-a77e0a5139c0` — all 8 preconditions passed before the Stripe call was ever attempted.
- **The one real Stripe request**: `POST /api/orders/ca2f3953-80cc-48d9-abc6-a77e0a5139c0/payment-intent` → `201`, `clientSecret` present (never printed/logged/persisted/audited).
- **Stripe PaymentIntent `pi_3Ty23PFjnSocD8E80CAd9jKx`**: `livemode: false`, `amount: 5000`, `currency: usd`, `status: requires_payment_method`, `payment_method: null`, `latest_charge: null` — confirmed via exactly one dedicated, strictly-necessary-for-verification read-only `retrieve()` call (the app's own JSON response doesn't expose `livemode`/`amount`/`currency`/`status`, so this was the only way to confirm them). This PaymentIntent is **left permanently intact in Stripe** as durable, external acceptance evidence — never canceled, confirmed, or attached to a card.
- **Database state after**: `paymentStatus: pending`, `stripePaymentIntentId`/`stripePaymentStatus`/`stripePaymentIntentAttemptedAt` all populated correctly, `paymentAccessTokenHash` still hash-only (64 hex chars).
- **Exactly one** `payment.intent_created` audit event (`adminUserId: null`, metadata exactly `{orderNumber: "BRCP-1362", provider: "stripe"}`). **Zero** `payment.reference_anomaly` events. A separate, ordinary `order.created` event was also written at order-creation time (unrelated to payment, same as every checkout order).
- **Whole-database leakage scan**: zero clientSecret-shaped, Stripe-key-shaped, card-number-shaped, or PII-shaped strings anywhere in `audit_log` or the dev server log. Only two token-related columns exist anywhere in the schema (`payment_access_token_hash`, `payment_access_token_expires_at`) — no column anywhere holds a raw token.
- **Real money moved: $0.** No card was attached, no `PaymentMethod` was confirmed, the PaymentIntent never reached `succeeded`, no charge exists, no webhook processing exists anywhere in this codebase. The synthetic order is `pending`, never `paid`.
- **Real business data**: fully unaffected throughout — `BRCP-1013` untouched (`unpaid`, every Stripe/token column `null`), the one real customer untouched, the real inquiry-mode product (`custom-graphic-design`) untouched and structurally could never have reached this path at all (`isCartEligible()` rejects `inquiry` mode before an order can even be created).
- **Synthetic DB fixture cleanup — and a real, honest discovery made along the way.** Before deleting the fixture product, a cleanup safety check (matching this project's standing "verify references before deleting anything" discipline) found an *unexpected second order*, `BRCP-1363`, referencing the same fixture product — created moments after the acceptance run, under your own real name and business email (`quotes@bigredcreativeproductions.com`), with a real `paymentAccessToken` issued but no PaymentIntent ever requested for it. This was **your own genuine manual test of the live checkout flow** against the fixture product while it was still published — not leftover script data, and not anticipated by the original cleanup plan. Nothing was deleted until this was reported and you confirmed it was your own test and safe to remove.

  Independent reference checks (no other order, lead, or note referenced either synthetic customer) confirmed both were safe to delete. The final cleanup: `BRCP-1363`'s `order_lines` (cascade-deleted with its order), its `orders` row, and its `customers` row were removed; `BRCP-1362`'s `order_lines` (cascade-deleted), `orders` row, and `customers` row were removed; the synthetic `products` row was removed. **Every retained audit row was verified byte-for-byte before and after deletion, not merely assumed**: `BRCP-1362` keeps both `order.created` and `payment.intent_created`; `BRCP-1363` keeps its own `order.created` (retained as honest historical test activity, per your explicit instruction) — `audit_log.entity_id` carries no foreign key (a plain text column, by design, matching every other entity type this table logs), so deleting either synthetic order neither destroys nor can destroy its audit history. **Neither `BRCP-1362` nor `BRCP-1363` is reclaimed or reused** — `order_number_seq` is a monotonic Postgres sequence with no reset mechanism (confirmed at `1363` after cleanup); both numbers stay permanently retired, exactly like every other test-consumed `BRCP-####` value in this project's history (see "BRCP sequence honesty" under Phase 18B). The real Stripe test-mode PaymentIntent `pi_3Ty23PFjnSocD8E80CAd9jKx` remains the durable, independent acceptance record in Stripe's own system — nothing in this local cleanup can reach or affect it. The 3 `order_creation_ip`/`payment_initiation_ip` rate-limit events these two real HTTP-driven test runs generated were **not** deleted — they're accurate historical records of the rate limiter genuinely working under real traffic, not fixture data.

  Full post-cleanup verification, independently re-run: `BRCP-1013` unchanged (`unpaid`, no Stripe fields); exactly 1 real customer remains; the real inquiry product (`custom-graphic-design`) unchanged, still `inquiry` mode; zero synthetic orders remain; zero synthetic products remain; zero orphaned `order_lines`; both retained audit histories confirmed exactly matching their pre-deletion snapshots; `audit_log` at 92 (89 baseline + 2 for `BRCP-1362`'s `order.created`/`payment.intent_created` + 1 for `BRCP-1363`'s `order.created`); published brand color still `#E70810`; published Homepage Hero media asset unchanged; leads=1, notes=4, services=7, portfolio_projects=4, media_assets=4, brain_requests=9, ai_generation_jobs=2, motion_settings=2 — all exactly matching the expected baseline.
- **One real `payment_initiation_ip` rate-limit event** was created by this run's real HTTP call — correctly reflects genuine rate-limiter consumption from a real request, IP-HMAC-keyed, no raw IP stored; not "fixture" data requiring cleanup, since it's an accurate historical record of the limiter actually working, not a business record.

### What this phase deliberately did not add

No Stripe Elements or any frontend/checkout UI change (`CheckoutView.tsx` does not read the new `paymentAccessToken` response field yet). No webhook endpoint of any kind. No CSP change. No refund/deposit logic. No live-mode key was ever accepted (test-mode-only guard held throughout, including during the real acceptance run). No second PaymentIntent was ever created for the synthetic order — the conditional `UPDATE ... WHERE stripePaymentIntentId IS NULL` guard was exercised for real, for the first time, and held correctly.

## Stripe Payment Element Checkout (Phase 21C-2C)

**Status: COMPLETE. TEST MODE ONLY.** Builds the actual customer-facing Stripe Payment Element on top of Phase 21C-2B's PaymentIntent-creation endpoint. **This phase proves real browser payment *submission* only** — it does not, and cannot, authorize `paymentStatus="paid"`. That transition remains exclusively Phase 21C-2D's future signed-webhook authority; nothing in this phase writes it, and the real acceptance test below proves the boundary held even though the underlying Stripe payment genuinely succeeded.

### Packages

`@stripe/stripe-js@9.12.1`, `@stripe/react-stripe-js@6.8.0` — both exact-pinned (registry-confirmed at implementation time, React-19-compatible peer ranges), matching this project's existing `"stripe": "22.3.2"` exact-pin convention on the server side (retained, unchanged).

### Environment variables

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — the one new variable, deliberately browser-visible (publishable keys are designed by Stripe to be exposed client-side; they can create tokens/confirm payments but never move money or read account data on their own). `STRIPE_SECRET_KEY` is unchanged — server-only, never touched by this phase. Both variable **names** (never values) are documented in `.env.example`.

**Two independent test-mode guards, one per side of the trust boundary**: server-side, `stripe.ts`'s existing `getClient()` refuses any key not prefixed `sk_test_`, before any network access. Client-side, `CheckoutPaymentStep.tsx`'s `getStripePromise()` refuses to call `loadStripe()` at all unless the configured publishable key starts with `pk_test_` — failing safely to a `null` Stripe promise otherwise, never throwing, never silently proceeding with an unrecognized key.

### Card-only PaymentIntent restriction

`stripe.ts`'s `createPaymentIntent()` now passes an explicit `payment_method_types: ["card"]`, replacing the earlier `automatic_payment_methods: { enabled: true }`. This was a deliberate choice, confirmed correct by real acceptance testing (see "Bank/Klarna investigation" below): it sidesteps the `Permissions-Policy: payment=()` conflict entirely (wallets/the Payment Request API require that permission; this app's header stays untouched), avoids redirect-based payment methods (so `return_url` stays a required-but-essentially-unused parameter for card payments), and matches this codebase's standing preference for a closed, code-owned enum over Stripe-Dashboard-configurable behavior — the same reasoning already applied to `PURCHASE_MODES`/`PRODUCT_CATEGORIES` everywhere else in this app.

### Payment Element integration

`src/components/CheckoutPaymentStep.tsx` (new) owns all Stripe.js/Elements interaction — `<Elements stripe={getStripePromise()} options={{clientSecret}}>` wrapping an inner `PaymentForm` that calls `useStripe()`/`useElements()` and, on submit, `stripe.confirmPayment({elements, confirmParams: {return_url: \`${origin}/checkout\`}, redirect: "if_required"})`. `CheckoutView.tsx` owns the surrounding state machine (unchanged responsibility split from before this phase) — it fetches the PaymentIntent, passes `clientSecret` down, and receives only a `onConfirmed()` callback back, never a Stripe object of any kind.

### Exact CSP additions

Four directive changes, every one an exact Stripe hostname, sourced directly from Stripe's own current official security guide (`docs.stripe.com/security/guide`, fetched live at implementation time, not assumed):

```
script-src: + https://js.stripe.com https://*.js.stripe.com
connect-src: + https://api.stripe.com
frame-src (new directive): https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com
img-src: + https://*.stripe.com
```

`frame-ancestors`/`object-src`/`base-uri`/`form-action` are byte-identical to before this phase — confirmed by diff, not assumed.

**Why `*.js.stripe.com` is kept**: Stripe's own guide states it exists so "Stripe.js [can] improve performance by starting frames on different origins, where possible" — a real Stripe-side optimization, not a wildcard this app introduced for its own convenience. Real browser acceptance testing (headless Chrome, full network capture) confirmed every resource in that session — the main script, the controller iframe, every Elements sub-frame — actually loaded from the exact origin `js.stripe.com`, never a genuine subdomain. The wildcard was **not** exercised in that one session, but is kept anyway per Stripe's own documented reasoning, since a single session can't rule out Stripe's own infrastructure using a subdomain under different network/rollout conditions. Narrowing it based on one acceptance run would risk silently breaking a legitimate, Stripe-documented path the moment Stripe's own infrastructure decides to use it.

**`Permissions-Policy: payment=()` deliberately unchanged.** This phase is scoped to card-only, so no wallet/Payment-Request-API capability is needed — relaxing this header was explicitly avoided, matching the exact "do not weaken unrelated directives" discipline already established in Phase 21A-2.

### `paymentAccessToken` / `clientSecret` — memory-only, by construction

Both live only in `CheckoutState` (a `useReducer` value) for the life of the component tree. Neither is ever written to `sessionStorage`, `localStorage`, a log, an audit-metadata payload, or a URL/query parameter that this app's own code controls. Confirmed by direct code review: `persistCheckout()`'s object literal (the one `sessionStorage.setItem` call site in this feature) contains exactly 7 fields — `version`, `step`, `customer`, `notes`, `clientRequestId`, `pendingOrderId`, `pendingOrderNumber` — never the token or secret.

**One honest, unavoidable platform-level exception, not glossed over**: if a payment method or 3DS flow ever triggers Stripe's own redirect-based confirmation (not exercised by card-only + `redirect:"if_required"` in either real acceptance test), **Stripe's own platform** appends `payment_intent_client_secret` to the `return_url` as a query parameter — this is Stripe's documented, standard mechanism for every redirect-based Elements integration, entirely outside this application's control once a redirect is triggered. `CheckoutView.tsx`'s return-redirect detection (`window.location.search`, read in a mount-only `useEffect`, never `useSearchParams()` — deliberately, so `/checkout` stays statically rendered) treats these parameters as **display/recovery inputs only**, never authoritative proof of payment, and immediately cleans them from the URL via `history.replaceState` so they don't linger in the address bar/history longer than necessary.

### Recovery persistence — exactly three new sessionStorage fields

`PersistedCheckoutState` gained `pendingOrderId`/`pendingOrderNumber` (both safe, non-secret identifiers) and a new `step: "payment"` value — `CHECKOUT_SCHEMA_VERSION` bumped `1 → 2` accordingly, so old sessionStorage data is safely discarded, not misread. Nothing else was added.

### Cart retained through payment, cleared only after `confirmPayment()` returns without error

A deliberate, approved deviation from the original design assumption: for Stripe-eligible orders, `clearCart()` no longer fires immediately on order creation — it's deferred until `CheckoutPaymentStep`'s `onConfirmed()` callback fires (i.e., Stripe's own `confirmPayment()` resolved with no `error`). This is **UX state only** — it has no bearing on `paymentStatus`, which stays server-authoritative and untouched by this event. Keeping the cart (via `items` from `useCart()`, itself persisted independently in `localStorage` by `CartProvider`, unrelated to and unaffected by this change) intact through the whole payment step is what lets refresh-recovery reconstruct the exact original `/api/orders` request body using the same, already-proven `cartItemToOrderLineRequest(items)` mapping — with zero new persisted line-item data beyond the three fields above. Non-Stripe orders are completely unaffected — their cart still clears immediately on order creation, exactly as before this phase.

### The browser never writes `paid` — verified, not just asserted

Confirmed by direct grep across every file this phase touched: the only `paymentStatus` value ever written anywhere in this phase's code is `"pending"` (unchanged from Phase 21C-2B); `"paid"` appears only in comments explaining that it does *not* happen here. `CheckoutPaymentStep`'s `onConfirmed()` callback is a pure client-side signal — the caller never inspects `result.paymentIntent.status` for anything beyond "no error occurred," and never calls any endpoint that could write `paymentStatus`. **A future, signed Stripe webhook (Phase 21C-2D) remains the sole, exclusive authority for that transition.**

### Bounded refresh/recovery and explicit Retry — no automatic loop, ever

A single `autoAttemptedOrderId` ref bounds automatic payment-initialization to **exactly once per order id**, covering both paths uniformly: a fresh order (token already in memory) calls `initializePaymentIntent()` directly; a genuine page refresh (token wiped, `pendingOrderId` restored from sessionStorage, `items` still populated) calls `resumePendingPayment()` — the full bounded chain: re-`POST /api/orders` with the same `clientRequestId` (idempotent — returns the same order plus a freshly-rotated `paymentAccessToken`) → one `POST /api/orders/[id]/payment-intent` call → stop on any failure. **Neither path ever automatically retries a second time** — per your explicit correction to the original design, a bare failure (404/409/429/503/network error, all treated identically) always surfaces one generic message and an explicit "Retry" button; only a customer's own click re-invokes `resumePendingPayment()`'s full chain. The distinction matters because a `404` "intentionally hides multiple authorization/capability failures" (your own framing) — automatically chaining into a fresh-token retry without the customer's own action would have papered over that ambiguity.

### Stale wording fix — `OrderReview`'s payment note

`OrderReview.tsx` gained one optional prop, `hidePaymentNote?: boolean` (default `false`, fully backward compatible). `CheckoutView.tsx`'s payment-confirmed screen is the **only** call site that passes it — suppressing the pre-existing "No payment is being collected at this step." note, which would otherwise render directly beneath "Payment submitted. We're confirming your payment..." and read as self-contradictory. The review step and the original non-Stripe "submitted" screen are byte-for-byte unchanged.

### Bank/Klarna investigation — resolved, real evidence, no code change

During real acceptance testing, the Payment Element displayed **Card**, **Bank** ("$5 back"), and **Klarna** ("Powered by Link") tabs — despite the actual retrieved PaymentIntent confirming `payment_method_types: ["card"]` from Stripe's own server. Rather than guess, a direct, safe, read-only empirical check was performed: reconnecting to the still-open `BRCP-1390` fixture (payment never submitted) and clicking the "Bank" tab. This revealed **Stripe's own test-mode bank-connection simulator** — a "Search for your bank" field followed by tiles literally labeled **"Success," "Blocked," "Disputed," "Bank (Non-OAuth)," "Bank (OAuth)," "Down (Scheduled)," "Down (Unscheduled)," "Down (Error)"** — Stripe's well-documented Financial Connections/ACH test institutions, never real bank names a production integration would show. **Conclusion: Stripe test-mode/demo presentation, not a real additional payment method** — the actual authoritative enforcement remains at the PaymentIntent level (`payment_method_types: ["card"]`), confirmed live from Stripe. Per explicit approval, **no code change was made** — `payment_method_types: ["card"]` remains exactly as implemented, and no `paymentMethodOrder` or other Elements client-side restriction was added, since none was needed.

### Real acceptance — `BRCP-1389`, a successful test-mode payment

Using a real, running dev server, a real browser (headless Chrome, driven via raw Chrome DevTools Protocol over the existing `ws` dependency — mirroring Phase 21A-2's own CSP-verification approach), and a synthetic fixed-price fixture, the actual customer checkout flow was exercised end to end: cart → details → review → submit → `POST /api/orders` (`201`, `paymentAccessToken` returned) → payment step → Payment Element rendered (Card/Bank/Klarna tabs, Card expanding to number/expiration/CVC/ZIP fields) → Stripe's official test card `4242 4242 4242 4242` (exp `12/34`, CVC `123`, ZIP `10001`) filled via real keyboard/mouse input events into Stripe's own iframe → "Pay $50.00" clicked once → `confirmPayment()` resolved without error.

- **Stripe's real PaymentIntent, `pi_3TyZygFjnSocD8E81eiXVOyv`**: `livemode: false`, `amount: 5000` ($50.00 USD), `currency: usd`, `payment_method_types: ["card"]`, and — retrieved live from Stripe after the test — **`status: "succeeded"`**. The real test payment genuinely completed on Stripe's side.
- **This application's own `paymentStatus` remained `"pending"`** — confirmed directly against the database, even though Stripe's own live status was `"succeeded"`. This is the exact, correct authority-boundary behavior this phase exists to prove: our database has no live view of Stripe's status beyond its creation-time snapshot until a future webhook updates it, and nothing anywhere manually wrote `"paid"`.
- **Approved confirmation wording displayed verbatim**: *"Payment submitted. We're confirming your payment — you'll receive a follow-up once it's fully processed. No further action is needed right now."* Confirmed by direct text scan: zero occurrences of "Paid"/"Payment successful"/"Payment complete"/"Payment received" anywhere in the rendered page.
- **Cart cleared** (`localStorage["brcp-cart"]` → `{"version":1,"items":[]}`) immediately after `confirmPayment()` resolved, not before.
- **Exactly one `payment.intent_created` audit event, zero `payment.reference_anomaly` events.**
- **$0 real money moved** — Stripe test mode only, no live key ever accepted, no card charged in the real-money sense.

### Real acceptance — `BRCP-1390`, bounded refresh-recovery

A second synthetic fixture reached the payment step (Payment Element rendered, "Pay $50.00" visible) with **no card data entered**. A genuine full-page browser refresh (`Page.reload`, wiping all in-memory React state) was performed. Result: the Payment Element **re-rendered successfully** after exactly one bounded automatic recovery cycle — confirmed via real network capture showing exactly one `POST /api/orders` and one `POST /api/orders/[id]/payment-intent` call after the refresh, and **zero** additional calls even after an extended wait (proving no loop).

- **Same order** (`b3e781a6-e86b-49d9-bd9a-4be597c7a948`) before and after refresh — no duplicate order.
- **Same underlying PaymentIntent** (`pi_3Tya7VFjnSocD8E81PfsvktR`) before and after — genuinely **resumed**, not duplicated.
- **`stripePaymentIntentAttemptedAt` unchanged** across the refresh — never reset by the retry, confirming the WHERE-null guard held.
- **`paymentAccessTokenHash` genuinely rotated** (a different hash value before vs. after) — confirming a fresh token was issued on resume, per design.
- **No payment was ever submitted** for this fixture — the recovery test stopped at the rendered Payment Element, exactly as instructed.

### Acceptance fixture cleanup

After both real acceptance tests were fully documented, the synthetic DB rows were independently re-confirmed as synthetic (exact order number match, exact customer email match, zero other legitimate references) and deleted: `BRCP-1389`/`BRCP-1390` orders (their `order_lines` cascade-deleted automatically), the two synthetic customers (`buyer@test-21c2c-browser-accept.invalid`, `recovery@test-21c2c-browser-accept.invalid` — confirmed to have zero other orders/leads/notes referencing them), and the two synthetic published products (confirmed referenced only by their own synthetic order lines). **Permanently retained**: both orders' complete audit trails (`order.created` + `payment.intent_created` each — `audit_log.entity_id` carries no foreign key, so deletion neither destroys nor can destroy this history) and both real Stripe test-mode PaymentIntents (`pi_3TyZygFjnSocD8E81eiXVOyv`, `pi_3Tya7VFjnSocD8E81PfsvktR`), which remain untouched in Stripe's own system — nothing in this local cleanup can reach or affect them. Neither `BRCP-1389` nor `BRCP-1390` is reclaimed or reused — `order_number_seq` is a monotonic Postgres sequence with no reset mechanism, confirmed at `1397` after cleanup. Post-cleanup, independently re-verified: `products`/`customers`/`orders` all back to their legitimate real counts (1 each), zero orphaned `order_lines`, `BRCP-1013` unchanged (`unpaid`, no Stripe fields), the real inquiry product unchanged, both retained audit trails confirmed byte-identical to their pre-deletion snapshots.

### What this phase deliberately did not add

No webhook endpoint of any kind (Phase 21C-2D). No `paymentStatus="paid"` transition anywhere, automatic or manual. No live-mode key ever accepted (both the server `sk_test_` guard and the new client `pk_test_` guard held throughout, including during real acceptance). No wallet/Payment-Request-API support (card-only, `Permissions-Policy: payment=()` untouched). No refund or deposit logic. No dedicated `/checkout/return` route — `/checkout` itself is reused as the `return_url`, with query-param detection living entirely in the client component tree.

## Signed Stripe Webhooks (Phase 21C-2D)

**Status: COMPLETE. TEST MODE ONLY.** This is the piece that closes the gap Phase 21C-2C's own scope note left open: a real, signature-authenticated `paymentStatus="paid"` transition. Offline/mock testing (30/30, against synthetic `Stripe.Event` objects), `tsc`/lint/build, and — as of this update — a **real, live Stripe test-mode signed webhook, delivered via the Stripe CLI and correctly processed end to end** all pass. See "Real Stripe test-mode signed-webhook acceptance" below for the full, independently-verified evidence.

### Trust boundary — signature verification, not session/CSRF

`POST /api/stripe/webhook` (`src/app/api/stripe/webhook/route.ts`) is public and carries no admin session — deliberately outside the `(protected)` route group and outside Phase 21B's Origin/same-origin check (that check exists specifically for cookie-authenticated routes carrying ambient session authority; this route has none). Its entire authorization boundary is a **verified Stripe signature** — a fundamentally different, and in this one narrow case higher-trust, model than every other route in this codebase: `POST /api/orders` trusts nothing from the client and recomputes every dollar amount server-side; this route instead trusts Stripe's own cryptographic assertion, once and only once that assertion has been independently verified.

### Raw-body requirement

The route reads the request body **exactly once**, as raw text (`await request.text()`), and **never** calls `request.json()` before — or instead of — that read. Stripe's signature is computed over the exact raw bytes of the payload; parsing (or re-serializing) the body before verification would produce different bytes than what was signed, invalidating the check, and a `Request` body stream can only be consumed once regardless. The `Stripe-Signature` header is read via `request.headers.get("stripe-signature")`.

### Signature verification — `stripe.ts` remains the one file that imports `stripe`

`verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)` was added to `src/server/payments/stripe.ts` — kept there, not in the route or the handler, so the "one file allowed to import the `stripe` package" boundary established in Phase 21C-2B holds unchanged. It calls `getClient().webhooks.constructEventAsync(rawBody, signatureHeader, webhookSecret)` — pure local HMAC verification, no network call to Stripe. Reuses `getClient()`'s existing `sk_test_`-only guard on purpose: this ties webhook processing to the identical "is Stripe genuinely configured for this TEST-MODE-ONLY phase" gate every other payment code path already uses, rather than inventing a second, independent notion of "configured." The route fails closed at each stage, checked in order:

1. `STRIPE_WEBHOOK_SECRET` missing → `500`, generic body, one static (non-interpolated) `console.error` line.
2. `Stripe-Signature` header missing → `400`.
3. Signature verification throws (invalid signature, malformed payload, wrong secret) → `400`, one static `console.error` line.

**Never logged, anywhere in this feature, under any condition**: the webhook secret's value, the raw `Stripe-Signature` header value, the raw request body, the full parsed `Stripe.Event` object, the `PaymentIntent` object, or the verification library's own thrown error/message (which can echo back parts of the payload) — confirmed by direct enumeration of every `console.*` call across `route.ts` and `handle-stripe-webhook.ts` (exactly three, all fixed, static strings with only a safe id/category as structured context).

### Test-mode-only guard — `event.livemode`, never a `whsec_` prefix

Unlike a Stripe secret/publishable key, a webhook signing secret (`whsec_...`) carries no mode-indicating prefix — `event.livemode`, read from the already-verified event body, is the sole and correct signal, checked explicitly rather than inferred. A `livemode: true` event is classified as the terminal `unexpected_livemode` anomaly (see vocabulary below), durably deduped, safely audited, and returned `200` — Stripe must never be asked to retry an event this TEST-MODE-ONLY phase will never accept. This check runs with priority over "order not found" (see "Order matching" below) specifically because a livemode event's lack of a matching local order is fully explained by, and subordinate to, the livemode problem itself — retrying can never fix it, so it must never be misclassified as the retryable `order_not_found`, which would incorrectly imply a future retry might succeed.

### Event allowlist — exactly three types

```ts
const ALLOWED_EVENT_TYPES = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);
```

A validly-signed event of any other type returns `200` with **zero** mutation, **zero** audit event, and **no** `stripe_webhook_events` row at all — this app must never accumulate dedup rows for, or ask Stripe to retry, an event type it has no opinion about.

### Order matching — `PaymentIntent.id` only

`event.data.object.id` (the PaymentIntent id) is matched against `orders.stripePaymentIntentId` — the **only** lookup key. Email, customer name, order number, browser-supplied state, and Stripe's own `metadata` object are never used to locate an order; `metadata.internal_order_id` (set at PaymentIntent-creation time, Phase 21C-2B) exists for Stripe Dashboard reconciliation only and is never read back by this handler. The lookup is attempted **before** the livemode/anomaly classification decision (see above) specifically so an anomaly's audit metadata can include a real `orderNumber` whenever one genuinely resolves — but the livemode check still takes classification priority over "not found" once both facts are known.

### Authoritative amount — recomputed, cross-checked, never trusted from the event alone

For a `succeeded` event, `SUM(order_lines.lineSubtotal)` is recomputed fresh (never read from the event), then cross-checked in two independent steps: first against the order's own frozen `pricingSummary.subtotal` (an integrity check on this app's *own* data — a mismatch here is `integrity_invalid_state`, since it can only mean something is already wrong with the stored order, not with Stripe's report), then against `paymentIntent.amount_received` (a mismatch here is `amount_mismatch`). `paymentIntent.currency !== "usd"` is checked separately as `currency_mismatch`. Any of the three blocks the `paid` write entirely, durably dedupes the event, and writes a `payment.webhook_anomaly` audit event — never a partial or best-guess write.

### State precedence — paid is the highest-authority, never-downgraded terminal state

```
succeeded:       pending | failed | canceled -> paid   (also: paid -> paid, no-op)
payment_failed:    pending -> failed             (failed/canceled -> same, no-op; paid NEVER downgrades, no-op)
canceled:        pending | failed -> canceled      (canceled -> same, no-op; paid NEVER downgrades, no-op)
```

`paidAt`/`paymentFailedAt` are always set to server processing/receipt time (`new Date()`), never a timestamp read from the Stripe event — matching this schema's existing convention that these two columns record *this app's own* observation time, not Stripe's. The `canceled` write sets only `paymentStatus` and `stripePaymentStatus` — no `canceledAt` column exists and none was invented; only fields with a real, already-approved home are ever written.

### Webhook-specific transition authority — deliberately separate from `PAYMENT_STATUS_TRANSITIONS`

`PAYMENT_STATUS_TRANSITIONS`/`isValidPaymentStatusTransition` (`src/data/orders.ts`) governs **ordinary, non-cryptographically-authenticated admin transitions only**, and was **not** widened for this phase — it still, correctly, does not permit `canceled -> paid` or `failed -> paid`, since an admin manually declaring a canceled/failed order "paid" with no real payment evidence must never be allowed. The state-precedence logic above lives entirely inside `src/server/payments/handle-stripe-webhook.ts` (`applySucceeded`/`applyFailed`/`applyCanceled`) as a small set of explicit `if` checks against `order.paymentStatus` — a genuinely separate, higher-trust authority layer, representing a signature-verified Stripe financial assertion (already independently cross-checked against amount/currency/livemode by the time these functions are reached), never a silent bypass of the shared admin model. The two vocabularies are documented here as intentionally distinct, not accidentally divergent.

### Closed anomaly/failure vocabulary — 7 total categories/reasons: 5 terminal, 2 retryable

```ts
export type WebhookTerminalReason =
  | "unexpected_livemode"
  | "amount_mismatch"
  | "currency_mismatch"
  | "provider_reference_mismatch"
  | "integrity_invalid_state";

export type WebhookRetryableReason = "order_not_found" | "database_error";
```

No arbitrary or free-text reason string ever reaches audit metadata — every anomaly/failure is one of these seven fixed values. `provider_reference_mismatch` is a defensive integrity check (`order.stripePaymentIntentId !== paymentIntent.id` after a lookup that was already keyed by that exact value) — structurally shouldn't be reachable, but checked and classified explicitly rather than silently assumed.

**Terminal** (will never become processable no matter how many times Stripe retries delivery): durably deduped, `200`, a `payment.webhook_anomaly` audit event, no mutation.
**Retryable** (might become processable on a later delivery attempt): **not** durably deduped — the dedup insert is rolled back along with everything else — `5xx`, no audit event (there is nothing yet to safely attribute one to).

### Transaction + dedup semantics — one transaction per event, rollback-everything on retryable failure

One `db.transaction()` per allowlisted, signature-verified event. The very first statement inside it is `INSERT INTO stripe_webhook_events (id, type, related_order_id) VALUES (...) ON CONFLICT (id) DO NOTHING` — the exact `evt_...` id Stripe itself assigns, reusing the identical race-safe idempotency pattern already proven for `customers.email`/`orders.clientRequestId` in Phase 21C-1. If that insert affects zero rows, the event was already durably recorded by an earlier delivery (either a successful mutation/no-op, or a previously-committed terminal anomaly) — return `{ kind: "duplicate" }` immediately, zero further work, zero new audit event.

For a genuinely new event: order lookup, livemode check, integrity checks, the state-precedence mutation (or no-op), and the resulting audit event all happen **inside this same transaction**. A successful mutation or no-op **commits** the dedup row together with everything else. A terminal anomaly **commits** the dedup row together with its anomaly audit event — durable, never retried. A retryable failure (`order_not_found`, or any unexpected error caught by the outer `try`/`catch`) is signaled by **throwing** inside the transaction callback (`RetryableWebhookError` for the explicit case; the outer `catch` defaults anything else to `database_error`) — Drizzle's `db.transaction()` rolls back everything on a thrown error, which is what makes the dedup insert itself disappear too, leaving a retried delivery of the identical `event.id` fully reprocessable rather than silently swallowed as a false "duplicate."

### Retryable vs. terminal — why `order_not_found` must never be permanently acknowledged

A webhook can genuinely arrive before this app's own order-creation transaction has committed, or reference an order this app has some other, currently-unknown-but-real reason not to have yet — Stripe's own retry schedule is the mechanism that gives a legitimate late-arriving match a real chance to be found on a later delivery attempt. Treating `order_not_found` as terminal (durably deduped) would permanently and silently drop a payment confirmation that could have succeeded on retry. It is therefore always `5xx`, never durably recorded, and never produces a `payment.webhook_anomaly` audit event (there is no order to safely attach one to, and orphaned/business-adjacent audit noise for a condition that may simply resolve itself on retry was deliberately avoided).

### Audit events

`payment.succeeded`, `payment.failed`, `payment.canceled` (one per genuine state-changing transition — never written for an idempotent no-op, per the approved "avoid duplicate business audit noise" rule) and `payment.webhook_anomaly` (one per terminal anomaly). All four: `adminUserId: null` (a real, unauthenticated Stripe-originated event — the same honest convention `order.created`/`payment.intent_created` already established for admin-less events), `entityType: "order"`, `entityId` = the internal order id (or, for the one genuine edge case where `unexpected_livemode` fires with no resolvable local order at all, the raw PaymentIntent id — never an internal id that doesn't exist). Metadata: `{orderNumber, provider: "stripe", eventType}` for the three success actions; `{orderNumber, provider: "stripe", eventType, reason}` for anomalies (with `orderNumber` correctly omitted, never null/placeholder, in that one no-order-resolved edge case). Never the raw event, the raw body, the signature, the secret, the `PaymentIntent` object, `clientSecret`, `paymentAccessToken`, or any customer PII/card data.

### Admin guard — a Stripe-linked order locks out manual payment-status edits, enforced server-side

`setOrderPaymentStatusAction` (`src/server/mutate-order.ts`) now checks `existing.stripePaymentIntentId !== null` immediately after fetching the order and before evaluating any transition — if true, it throws `STRIPE_LINKED_ORDER`, mapped to the specific, safe error *"This order's payment is managed by Stripe and updates automatically."* **This is the real, authoritative enforcement point** — server-side, inside the same `requireAdminUser()`-gated Server Action every other order mutation already goes through, not merely a UI-level hide. `OrderPaymentStatusForm.tsx` additionally hides the manual form entirely for a Stripe-linked order (a new `stripePaymentIntentId` prop, threaded through `OrderDetail`/`getOrderById()` in `src/server/queries/orders.ts` and the order detail page) as a courtesy, so an admin never even sees a control that would be rejected — but a direct POST to the action bypassing that UI is rejected identically either way. No new admin payment authority was added anywhere — this is strictly a lockout, never a grant.

### `stripe_webhook_events` — the existing Phase 21C-2A table, unmigrated

No new migration was needed — this table was built in Phase 21C-2A specifically for this future handler. `processedAt` reflects the time a delivery was successfully/finally handled (its `defaultNow()` column default). Durable rows exist for: every successfully-handled allowlisted event, every idempotent handled no-op, and every terminal anomaly. **No durable row is ever created for**: a retryable failure, or an unhandled (non-allowlisted) event type. No raw Stripe payload is ever persisted — the table's own four columns (`id`, `type`, `relatedOrderId`, `processedAt`) structurally cannot hold one.

### HTTP response matrix

| Condition | Status |
|---|---|
| Successful processing (mutation or no-op), idempotent duplicate, valid unhandled event type, terminal anomaly | `200` |
| Missing or invalid `Stripe-Signature` / payload fails cryptographic verification | `400` |
| Missing `STRIPE_WEBHOOK_SECRET` / database or infrastructure failure / `order_not_found` / other genuinely retryable processing failure | `500` |

Every response body is a small, fixed, generic JSON object (`{received:true}` or `{error:"..."}") — never internal failure detail, never which of the seven closed reasons applied.

### What this phase deliberately did not add

No application-level IP rate limiting on this route (per approved design — Stripe's own delivering IPs vary and aren't a meaningful abuse signal here; signature verification is the real, cheap-to-fail-fast boundary). No CSP change (`next.config.ts` untouched — this is a server-to-server endpoint, never loaded in a browser context). No refund handling. No live-mode acceptance of any kind (the test-mode-only guard held throughout, including during real acceptance). No Phase 21C-2E work (a full, single-session `unpaid → pending → paid` real payment flow — this phase's own real acceptance proved the `pending → paid` webhook-driven leg specifically; the `unpaid → pending` leg was already separately proven in Phase 21C-2B/C). No commit, no push, no merge — implementation and real acceptance both happened on the `phase-21c-stripe-webhooks` branch, uncommitted.

### Offline/mock test results — 30/30

Run via a temporary, non-destructive Route Handler (this codebase's established pattern — no jest/vitest/RTL exists; every regression check in this project's history has been a temporary script/route run against the real dev server, then deleted), using **synthetic `Stripe.Event`-shaped objects passed directly to `handleStripeWebhookEvent()`** (never real HTTP to this app's own webhook route for the business-logic cases, never real Stripe servers) plus Stripe's **static**, no-API-key-required `Stripe.webhooks.generateTestHeaderString()`/`constructEventAsync` helpers with a **locally-invented** test secret (`whsec_local_offline_test_secret_never_the_real_one`) for the two pure signature-verification checks — `process.env.STRIPE_WEBHOOK_SECRET` was read, never written, throughout, and remained genuinely unset the entire time. All fixture rows were clearly tagged (`test-21c2d-webhook.invalid` emails, `TEST 21C2D WEBHOOK FIXTURE` line titles, `pi_test_...`/`evt_test21c2d_...` ids) and deleted in a `finally` block; the suite was run twice in immediate succession with identical 30/30 results both times, confirming both correctness and clean, idempotent fixture cleanup.

Coverage: valid signature verifies / invalid signature (wrong secret) throws; missing signature header and missing `STRIPE_WEBHOOK_SECRET` against the real route (both correctly `500` in this genuinely-unconfigured environment — see the honest note below); a valid unhandled event type is ignored with zero mutation and no dedup row; `succeeded` correctly promotes `pending`/`failed`/`canceled` to `paid` with `paidAt` set and exactly one audit event each; `succeeded` on an already-`paid` order is a silent no-op with zero new audit events; `payment_failed` and `canceled` both correctly refuse to downgrade `paid` (silent no-op) and correctly apply from `pending`/`failed` where valid; an internal `pricingSummary`/`order_lines` integrity mismatch, a Stripe `amount_received` mismatch, and a currency mismatch each correctly produce their own distinct terminal anomaly with no `paid` write and a durable dedup row; `unexpected_livemode` correctly fires (including the edge case of a livemode event with *no* matching local order at all, correctly still classified as `unexpected_livemode` rather than the retryable `order_not_found` — see "Test-mode-only guard" above for why); `order_not_found` is correctly retryable with **no** durable dedup row; a sequential duplicate delivery of the same `event.id` is a no-op on its second delivery; a **genuinely concurrent** duplicate delivery (`Promise.all`, two real overlapping transactions) resolves to exactly one `processed` and one `duplicate`, with exactly one audit event, never two of either; a terminal anomaly's audit metadata is confirmed to contain exactly the approved key set; a synthetic malformed event correctly rolls back its dedup row on a retryable failure, and a later, well-formed retry of the **identical** `event.id` then correctly succeeds; every `payment.*` audit row this run produced was scanned and confirmed free of any secret/PII-shaped string and confirmed `adminUserId: null` throughout; `stripe_webhook_events`' own row shape was confirmed to carry no raw-payload-shaped column; the Stripe-linked admin-guard logic (faithfully replicated from `setOrderPaymentStatusAction`, since `requireAdminUser()` needs live session context this temporary route doesn't have — the same documented, established constraint every prior admin-action regression test in this codebase's history has hit) correctly rejects a manual mutation on a Stripe-linked fixture and correctly leaves a non-Stripe-linked (manual) order completely unaffected; and `BRCP-1013` was confirmed completely untouched throughout.

**One honest, non-blocking finding from this offline testing, documented rather than smoothed over**: the route checks `STRIPE_WEBHOOK_SECRET` presence *before* the `Stripe-Signature` header, per the approved response-priority ordering. In this real, current environment the secret is genuinely unset, so a request missing *both* correctly returns `500` (the missing-secret check wins first, exactly as designed) rather than `400` — meaning "missing signature header, with a secret present" could not be exercised at the real HTTP layer without configuring a secret, which this phase was explicitly instructed not to do. That specific sub-case is verified by direct code review of the route's own strict statement order (secret check, then header check, then verification) rather than by a live HTTP assertion — stated here explicitly rather than left implicit.

### Real-data baseline — confirmed unaffected, before and after

A direct, read-only check both before this phase's own work began and again immediately after the offline test suite's final run (twice, back to back) confirmed: `orders` = 1 (`BRCP-1013` only), `customers` = 1, `products` = 1, `order_lines` = 1, `leads` = 1, `notes` = 4, `stripe_webhook_events` = **0** (correctly zero — no real webhook has been sent), zero leftover `test-21c2d`-tagged customers or orders of any kind. `BRCP-1013` itself confirmed completely unchanged throughout: `paymentStatus: "unpaid"`, `stripePaymentIntentId: null`, `stripePaymentStatus: null`, `paidAt: null`, `paymentFailedAt: null` — exactly as it has been since Phase 21C-2A.

### Real Stripe test-mode signed-webhook acceptance

Using the real, owner-operated Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`) and a real `STRIPE_WEBHOOK_SECRET` configured in `.env.local` (never a value read, printed, or exposed by any code in this session — every check performed was presence-only, `Boolean(process.env.STRIPE_WEBHOOK_SECRET)`), a genuine synthetic fixture was pushed through the real, unmodified public pipeline — `POST /api/orders` → `POST /api/orders/[id]/payment-intent` → a real Stripe API `paymentIntents.confirm()` call (test-mode PaymentMethod `pm_card_visa`, no browser/Elements UI involved — deliberately isolating the *webhook* pipeline specifically, since Payment Element/browser submission was already proven in Phase 21C-2C) — with no shortcut bypassing any of these real endpoints.

- **Fixture**: order `BRCP-1501`, a synthetic fixed-price product ($12.34), a synthetic customer.
- **Real Stripe PaymentIntent**: `pi_3TyeIFFjnSocD8E80DCVtNEg` — confirmed `succeeded`, `amount_received: 1234`, `livemode: false`.
- **Real Stripe event**: `evt_3TyeIFFjnSocD8E80HVKgsZm`, type `payment_intent.succeeded`, delivered by the real Stripe CLI listener to the real, running `/api/stripe/webhook` route, which returned a real `200`.

**Post-processing verification (independent, read-only, run twice — immediately after and again after fixture cleanup):**

- `orders.paymentStatus`: `"paid"`. `paidAt`: a real timestamp. `stripePaymentStatus`: `"succeeded"`.
- Exactly one `stripe_webhook_events` row: `id: "evt_3TyeIFFjnSocD8E80HVKgsZm"`, `type: "payment_intent.succeeded"`, a real `processedAt` timestamp.
- Exactly one `payment.succeeded` audit event, `adminUserId: null`, metadata exactly `{provider: "stripe", eventType: "payment_intent.succeeded", orderNumber: "BRCP-1501"}` — a full scan of every audit row this fixture produced (`order.created`, `payment.intent_created`, `payment.succeeded`) found zero secret/PII-shaped strings anywhere.
- `BRCP-1013` (the one real production order) confirmed completely unaffected throughout: `paymentStatus: "unpaid"`, `stripePaymentIntentId: null`, `paidAt: null`.
- After cleanup (deleting the fixture order/customer/product — never the audit trail or the webhook-event row, matching this project's standing precedent): `orders`/`customers`/`products` all back to exactly `1` (the one real row each), the `stripe_webhook_events` row **still present** (its `relatedOrderId` auto-nulled via its `ON DELETE SET NULL` FK, exactly as designed — the row itself is never deleted), and all three audit rows still present and byte-identical to their pre-cleanup values (`audit_log.entity_id` carries no FK, so deleting the order neither destroys nor can destroy this history).

**Honest process history — several real environment/tooling obstacles were hit and resolved along the way, preserved here rather than smoothed over:**

1. The first several attempts failed with `STRIPE_WEBHOOK_SECRET present=false` despite repeated claims of a dev-server restart — direct process inspection (`Get-NetTCPConnection` + `Get-Process` start-time checks) proved, twice, that the process actually bound to port 3000 had **not** in fact changed, meaning `.env.local` was never re-read. A later attempt showed a genuinely fresh PID/start-time, yet the secret was *still* absent — which led to discovering the line simply didn't exist in the file yet; it was then genuinely added, and a fresh process picked it up correctly.
2. Once the secret was present, the first real `paymentIntents.confirm()` call succeeded at Stripe (external, durable evidence — a real test-mode payment) but **no webhook arrived** even after 30+ seconds of polling, across two separate attempts. Root cause: `stripe listen` forwards events **live** — it does not replay events that fired before the listener session and its secret were fully synced, unlike a registered Dashboard endpoint's own retry logic. The original event for that first PaymentIntent was genuinely lost to this timing gap, not to any defect in this app's own webhook handler (already separately proven by the 30/30 offline suite).
3. Rather than create a second real PaymentIntent, the *original* real event was located and **resent** via the Stripe CLI/Dashboard's own resend mechanism (`stripe events resend <evt_id>`) — the CLI delivered it, and the real running route returned a genuine `200`, which is what the verification above confirms. No second fixture, no second `paymentIntents.confirm()` call, was ever needed.
4. Throughout every one of these steps, `STRIPE_WEBHOOK_SECRET`/`STRIPE_SECRET_KEY` values were never read, echoed, hashed-and-shown, or exposed in any tool output — every check was a plain boolean presence check, confirmed by direct review of the diagnostic route's own source.

**This is real, permanent, live acceptance evidence — not a placeholder, not simulated, not to be re-run casually.** `BRCP-1501` is retired (its order number will never be reused, per this project's standing `order_number_seq`-is-monotonic convention); its full audit trail and the real `stripe_webhook_events` row are permanent history.

## Roadmap

**This section is the single, authoritative statement of the phase timeline from here forward.** It is documentation only — nothing described below as a future phase has been implemented, scheduled with a date, or approved for implementation merely by appearing here. Every phase-specific section elsewhere in this file (Video Media Foundation, Portfolio/Service Video Support, etc.) remains the authoritative record of what has **already shipped** and its own real acceptance-test history — this section does not rewrite or supersede any of that. When a future phase below actually starts, it gets its own dedicated section (following this file's established pattern) with real architecture decisions, real test results, and real acceptance history — the entries below are deliberately kept at planning-level detail, not implementation detail, until that happens.

The roadmap stays **open**: a new idea raised in conversation gets evaluated and slotted into the appropriate phase below (or added as a new future phase) — it is never treated as automatically approved for immediate implementation just because it was mentioned.

### Phase 19D-1 — Motion System + Admin Controls — **complete**

Done — see "Motion System (Phase 19D-1)" above for the full architecture and real acceptance-test history. Database-backed motion settings (`motion_settings`, draft/published two-row pattern), a Save Draft → Preview → Publish workflow at `/admin/website/motion`, a reusable `MotionSection`/`useMotionEntrance` architecture, a small closed set of animation presets (`none`/`fade`/`fade_up`/`fade_down`/`slide_left`/`slide_right`/`scale_in`/`reveal`), a global motion-intensity setting (`subtle`/`standard`/`bold`), per-section stagger controls (Services/Portfolio/Process, capped at 6 children), a coordinated "Cinematic Reveal" entrance for the Hero's existing typography (no hero media involved), mandatory `prefers-reduced-motion` support, and a lightweight shared-`IntersectionObserver` implementation (no animation library). Wired into Hero, Services, Statement, Portfolio, Studio, and Process; Header, Ticker, Manifesto, Contact, and Footer deliberately excluded. **No homepage video/image media activation happened in this phase** — that was, and remains, explicitly Phase 19D-2's scope.

### Phase 19D-2 — Cinematic Homepage Hero Media — **complete**

Done — see "Cinematic Homepage Hero Media (Phase 19D-2)" above for the full architecture and real acceptance-test history. The homepage hero's Media Library integration: `None`/`Image`/`Video` modes, a permanent `heroMediaAssetId` reference (mirroring the exact pattern already proven on Product, Brand, Service hero, and Portfolio hero), video poster resolution from the video asset's own `posterMediaAssetId` (no separate hero-specific poster column), responsive inline presentation, poster-first loading, `controls`, `playsInline`, `preload="metadata"`, mobile-safe fallback behavior, and no forced autoplay/mute/loop. Your real, live, currently-published Homepage Hero now references the exact same Media Library video already used by SP Juices (Portfolio, Phase 19B) and Graphic Design (Services, Phase 19C). A background/autoplay cinematic hero treatment remains a later, deliberately separate enhancement, attempted only once the safe inline video path has more real usage behind it — not part of this phase.

### Phase 20A — Big Red Brain Foundation — **complete**

Done — see "Big Red Brain Foundation (Phase 20A)" above for the full architecture and real acceptance-test history. A real, working READ + RECOMMEND AI assistant at `/admin/brain`: a provider-neutral `TextProvider` abstraction (only one concrete implementation, `gpt-5.6-luna` via OpenAI's Responses API, ever imports the `openai` package), an aggregate-only dashboard context builder (no PII, no message/note text), system-instructions/DATA prompt separation, six supported request types, integer-microdollar cost accounting with correct cached-input pricing, a 20/day hard request cap plus a $20/month warning (not a block), safe-summary-only persistence in a new `brain_requests` table (migration `0014`), and full audit logging (`brain.requested`/`brain.recommendation_generated`/`brain.request_failed`). Zero database mutation tools exist anywhere in this phase — Big Red Brain can read and recommend, nothing more. Real-tested against two genuine requests: one honest billing/quota failure, one successful sub-cent-cost recommendation ($0.001843), both permanently preserved as acceptance history.

### Phase 20B — Context-Aware Brain Entry Points — **complete**

Done — see "Big Red Brain Context-Aware Entry Points (Phase 20B)" above for the full architecture and real acceptance-test history. Entity-specific context builders and "Ask Big Red Brain" entry points on the Customer, Order, Portfolio, Service, and Media detail pages (`buildCustomerContext()`, `buildOrderContext()`, `buildPortfolioContext()`, `buildServiceContext()`, `buildMediaContext()` — each its own fixed, reviewable shape, never a general-purpose "fetch anything about entity X" helper), a `requestSource`/`requestType`/`relatedEntityType` compatibility matrix enforced server-side, independent entity re-fetch on every request (no client-submitted context is ever trusted), and defensive per-field truncation for long-form Portfolio/Service text. Remains **READ + RECOMMEND only** — no DRAFT-write capability was added in this subphase either. Real-tested against all five entity types in one session: 5/5 succeeded, $0.013507 combined cost, zero PII/business-content leakage into audit metadata.

### Phase 20C-1 — AI Creative Studio: Image Generation — **complete**

Done — see "AI Creative Studio — Image Generation (Phase 20C-1)" above for the full architecture and real acceptance-test history. A real image-generation admin tool at `/admin/creative-studio`: a two-gate Idea → Build Creative Brief → Review → Generate Image → Preview → Save/Discard workflow, a separate `ImageProvider` abstraction (`gpt-image-1.5` via OpenAI, official per-image pricing table, `moderation: "auto"`, zero automatic retries), a closed 8-preset/4-context-source/4-reference-image vocabulary, independent daily (10/day) and per-brief-variation (4) caps plus a $15/month spend warning, real byte-validated Blob storage with zero pre-Save Media Library visibility, Save-reuses-the-Blob semantics, reverse-lookup-only provenance (no `media_assets` migration), and a write surface structurally confined to exactly two tables (`ai_generation_jobs`, `media_assets`) with **no** path to autonomous publish/attach/delete anywhere. Real-tested against two genuine paid generations ($0.034 + $0.009 = $0.043 total), both explicitly saved — Discard is verified by 76/76 automated Mock-provider tests plus direct code review only, honestly documented as **not** having a real paid human-clicked acceptance test, per an explicit decision not to spend money on a third, disposable generation solely to force one.

### Phase 20C-2 — Creative Studio Production Workflow — **complete**

Done — see "Creative Studio Production Workflow (Phase 20C-2)" above for the full architecture and real acceptance-test history. Generation History (`/admin/creative-studio/history`, paginated, newest-first), Reopen (`/admin/creative-studio/[id]`, never calls `ImageProvider`, shows the full reviewed brief and historical references including archived ones), explicit Restore for discarded-unsaved generations, save-time human-readable filename (server-derived extension, path-traversal-structurally-impossible via `slugify()`) plus editable alt/caption, an improved reference-image picker (selected preview, remove, reorder), a cost dashboard, and a safe Homepage Hero "Use in..." preselection (query-param hint only, independently re-verified server-side, zero automatic Save Draft/Publish) with Portfolio/Service/Product left navigation-only per approval. **Zero migration, zero new provider capability, zero new autonomous-mutation path.** Real-tested at **zero additional OpenAI cost**, using the two existing real generations from Phase 20C-1 — Restore is the one piece without a real human-clicked acceptance test (no real generation was left in a discarded state to exercise it against), covered instead by the 47/47 automated Mock-provider suite plus direct code review, documented honestly rather than claimed as accepted.

### Phase 20D — AI Creative Studio: Video Generation — **not started, requires its own separate architecture/security/cost review before starting**

Extends Phase 20C-1/20C-2's foundation to video: branding-presentation and logo-reveal video, animated mockups, product/package showcase videos, cinematic portfolio reels, social-media promo videos, motion graphics, testimonial-reel generation (using a real, business-supplied testimonial quote — AI may design visuals/animation/typography around it, never fabricate the endorsement text itself; a dedicated `testimonials` table is the recommended future model for this). Generated video must enter the **existing** Media Library exactly like Phase 20C-1's images do — the same `mediaAssetId`-plus-live-resolution mechanism already proven for human-uploaded video (Phase 19A) and now for AI-generated images. A video `ImageProvider`-equivalent abstraction is a separate, deliberately unchosen capability (mirroring both `TextProvider` and `ImageProvider`'s own pattern) — current API capabilities, pricing, sync-vs-async behavior, and output rules must be re-verified from official documentation at implementation time, not assumed from this roadmap entry or from Phase 20C-1/20C-2's own now-outdated-by-then research. **Explicitly requires its own architecture report, its own security review, and its own cost analysis before any implementation begins** — approval of Phase 20C-1 or 20C-2 is not approval of Phase 20D by extension, the same "no phase implies the next" discipline this roadmap has followed throughout.

**AI safety model, unchanged across every future subphase:** `READ → ANALYZE → RECOMMEND → CREATE DRAFT/PREVIEW → OWNER REVIEWS → OWNER APPROVES (Generate/Save)`. AI must **never**, autonomously: publish website changes, attach generated media to public content, delete customer/business/Media-Library data, change payment records, issue refunds, send customer communications, modify security settings, expose credentials, or perform any destructive operation. Important changes always require explicit owner approval — the same draft/publish staging discipline already proven throughout this codebase (and now proven again by Phase 20C-1's Generate/Save/Discard three-gate split), extended to AI-generated media specifically, never a new mechanism invented for AI.

### Phase 21 — Security Hardening + Penetration Testing — **in progress**

**A required production/launch security gate — not optional, not satisfied merely because admin authentication already works.** Must cover the entire application, targeting professional small-business application security using OWASP ASVS Level 2-style controls where applicable. A full audit (21A–21K below) was completed first, architecture/report only, before any implementation began. Implementation is proceeding as its own sequence of numbered sub-phases, tracked here:

- **Phase 21A-1B — Rate Limit Schema — complete.** See "Rate Limiting (Phase 21A-1B / 21A-1C)" above.
- **Phase 21A-1C — Shared Application Rate Limiter — complete.** Same section — exact scopes/limits, advisory-lock concurrency, HMAC IP privacy, real acceptance history.
- **Phase 21A-2 — Security Headers & CSP — complete.** See "Security Headers & CSP (Phase 21A-2)" above — full header set, final CSP, HSTS/Permissions-Policy/COOP, resource-needs audit, real production browser verification, real manual acceptance.
- **Phase 21B — Auth/Session + Origin/CSRF Hardening — complete.** See "Auth/Session + Origin/CSRF Hardening (Phase 21B)" above — a full architecture audit of the original "21A — Admin + Authentication" bullet's scope (session security/expiration, logout behavior, direct-request authorization-bypass attempts, CSRF, privilege escalation, IDOR) found the existing model already sound almost everywhere, and implemented only the smallest justified set the audit's evidence actually supported: an Origin/same-origin check scoped to the one Route Handler that needed it (`/api/media/video-upload-token`), an explicit 7-day session `maxAge` (replacing Auth.js's inherited 30-day default), and a documented emergency-revocation procedure. **Naming note**: this "Phase 21B" label refers to this specific auth/session/CSRF work, and is distinct from the original audit's own "21B — Store + Checkout + Orders" bullet immediately below (kept at its original letter so it stays consistent with every other original 21A–21K reference elsewhere in this file, including "the rate-limiting portion of 21H"). Don't conflate the two. Not addressed by this phase, and remaining open from the original 21A scope: MFA expectations for privileged accounts, a broader logout-behavior review, and a one-click admin deactivation UI (deliberately deferred, per approval).
- **Phase 21C-1 — Store/Checkout Rate Limiting + `order.created` Audit — complete.** See "Store/Checkout/Order Security — Rate Limiting + `order.created` Audit (Phase 21C-1)" above — a full read-only 24-point audit of the original "21B — Store + Checkout + Orders" bullet found the checkout/order pipeline already fully server-authoritative for pricing with a real, race-safe idempotency guarantee and zero IDOR surface (zero Critical findings), and implemented only the two real gaps the audit's evidence actually supported: a new `order_creation_ip` rate-limit scope on `POST /api/orders` (5/5min burst, 10/hr, fail-closed `503` on limiter infrastructure failure), and the checkout path's first `order.created` audit event (the admin-manual-order path already had one). **Naming note**: same pattern as "Phase 21B" above — this label is distinct from the original audit's own "21B — Store + Checkout + Orders" bullet immediately below (kept at its original letter for cross-reference continuity). Genuine-concurrency testing then exposed and led to fixing two real reliability bugs, both documented in full above: a customer-email creation race (no recovery path for a concurrent insert conflict), and a deeper, shared `isUniqueViolation()` defect (never matched this Drizzle version's wrapped driver errors, so the pre-existing order-level `clientRequestId` race recovery had never actually been reachable) plus an unsafe same-transaction recovery pattern once it was. Both fixed using `INSERT ... ON CONFLICT DO NOTHING` + re-query, which never poisons the surrounding transaction — confirmed zero HTTP 500s across 5 independent full concurrency-test runs. Not addressed by this phase, and remaining open from the original 21B scope: Vercel Firewall's own public/IP-level configuration (still not applied, per its own documented dashboard-limitation finding), order-number-manipulation/manual-order-security/order-status-and-payment-status-manipulation adversarial testing.
- **Phase 21C-2A — Payment schema/provider abstraction — complete.** See "Payment Schema + Provider Abstraction (Phase 21C-2A)" above — additively-widened `PaymentStatus`/transition table, 4 new nullable `orders` columns plus the new `stripe_webhook_events` idempotency table, and a `PaymentProvider` interface with zero concrete implementation. Migration `0017_worthless_steel_serpent.sql` generated, reviewed, applied, and fully verified against real Neon (see "Acceptance history" above). No Stripe package, no Stripe API request, no PaymentIntent, no webhook, no frontend/CSP change, and no money movement of any kind occurred in this sub-phase. **Completion of 21C-2A does not imply approval of any later 21C-2 sub-phase** — each of 21C-2B–F requires its own separate approval.
- **Phase 21C-2B-0 — Payment capability foundation — complete.** See "Payment Capability Foundation (Phase 21C-2B-0)" above — a dedicated, `clientRequestId`-independent payment authorization capability (256-bit CSPRNG token, SHA-256 hash-only persistence, 24-hour expiry, two new nullable `orders` columns, zero index/constraint added). Migration `0018_pretty_juggernaut.sql` generated, reviewed, applied, and fully verified against real Neon. 13/13 tests passing before and after migration. No Stripe package, no Stripe credentials, no PaymentIntent, no payment route, no checkout wiring, no webhook, no CSP change — the capability exists as schema and pure helper functions only, not yet issued or checked anywhere. **Completion of 21C-2B-0 does not imply approval of Phase 21C-2B.**
- **Phase 21C-2B — Stripe PaymentIntent Creation — COMPLETE.** See "Stripe PaymentIntent Creation (Phase 21C-2B)" above — `StripePaymentProvider` (`stripe@22.3.2`, pinned API version `2026-06-24.dahlia`, `maxNetworkRetries: 1`, `timeout: 20_000`, test-mode-only key guard), `POST /api/orders/[id]/payment-intent` (rate-limited via the new `payment_initiation_ip` scope), the dedicated `paymentAccessToken` capability (hash-only persistence, never the raw value), eligibility, token issuance/rotation wired into `create-order.ts`, authoritative-amount cross-check against the frozen `pricingSummary`, the full 5-case reconciliation algorithm (`stripePaymentIntentAttemptedAt`-anchored, fail-closed on both "missing provider reference" and ">24h unresolved"), the final 5-value `PaymentAnomalyReason` vocabulary (including the explicitly-approved `unexpected_livemode`), `payment.intent_created` audit logging, and a reviewed/corrected logging discipline (no `Error` object, message, stack, or provider response ever logged — only `{orderId, category}` from a closed vocabulary). 24/24 mock tests passing. **Validated against one real Stripe test-mode acceptance**: PaymentIntent `pi_3Ty23PFjnSocD8E80CAd9jKx` (`livemode: false`, `$50.00` USD, `requires_payment_method`), `$0` real money moved, no card/PaymentMethod/charge/webhook/paid-transition of any kind — proved PaymentIntent *creation* only (see the phase's own "This phase proved..." caveat above for exactly what it did not prove). Synthetic DB fixture cleaned up post-documentation — including a real, honestly-documented mid-cleanup discovery (your own manual test checkout, `BRCP-1363`, found referencing the fixture product before any deletion occurred, confirmed by you as safe to remove); the Stripe PaymentIntent itself and both orders' audit history (`BRCP-1362`'s `order.created`/`payment.intent_created`, `BRCP-1363`'s `order.created`) are permanently retained as acceptance evidence. Neither `BRCP-1362` nor `BRCP-1363` is reclaimed. Real business data confirmed unaffected throughout.
- **Phase 21C-2C — Stripe Payment Element Frontend — COMPLETE.** See "Stripe Payment Element Checkout (Phase 21C-2C)" above — `@stripe/stripe-js@9.12.1`/`@stripe/react-stripe-js@6.8.0` (exact-pinned), a card-only `payment_method_types: ["card"]` PaymentIntent configuration, a two-layer test-mode guard (server `sk_test_`, client `pk_test_`), 4 exact-hostname CSP additions (`Permissions-Policy: payment=()` deliberately untouched), memory-only `paymentAccessToken`/`clientSecret` handling, a 3-field sessionStorage recovery model, cart retained through payment and cleared only after `confirmPayment()` resolves without error, and a bounded (never-looping) refresh-recovery/explicit-Retry design. **Proves browser payment *submission* only — never authorizes `paymentStatus="paid"`,** which remains exclusively Phase 21C-2D's future webhook authority. Validated against two real Stripe test-mode browser acceptances: `BRCP-1389` (real PaymentIntent `pi_3TyZygFjnSocD8E81eiXVOyv` succeeded at Stripe, `$50.00` USD, while this app's own `paymentStatus` correctly stayed `pending`) and `BRCP-1390` (refresh-recovery reused the identical order and PaymentIntent, rotated the capability token, never looped, no payment submitted). The Bank/Klarna tabs observed during testing were investigated and confirmed, via direct empirical evidence, to be Stripe's own test-mode bank-simulator presentation, not a real additional payment method — no code change was needed. Both acceptance fixtures cleaned up post-documentation; both Stripe PaymentIntents and both orders' full audit trails permanently retained as evidence; `BRCP-1389`/`BRCP-1390` are not reclaimed.
- **Phase 21C-2D — Signed webhook processing — COMPLETE. TEST MODE ONLY.** See "Signed Stripe Webhooks (Phase 21C-2D)" above — `POST /api/stripe/webhook` (signature-verified via `stripe.webhooks.constructEventAsync`, raw body read exactly once, fails closed on missing secret/signature/invalid signature), the 3-event allowlist, `PaymentIntent.id`-only order matching, authoritative-amount/currency/livemode verification, a webhook-specific state-precedence authority (deliberately separate from the shared admin `PAYMENT_STATUS_TRANSITIONS`) with `paid` as the highest-authority never-downgraded terminal state, one-transaction-per-event `stripe_webhook_events` dedup (rolled back entirely on a retryable failure so a retried `event.id` stays reprocessable), the 7-value closed anomaly/failure vocabulary (5 terminal, 2 retryable), `payment.succeeded`/`payment.failed`/`payment.canceled`/`payment.webhook_anomaly` audit events, and a server-side admin guard locking out manual `paymentStatus` edits on any Stripe-linked order. 30/30 offline/mock tests passing, `tsc`/lint/build all clean, **and validated against one real, live Stripe test-mode signed webhook** — see "Real Stripe test-mode signed-webhook acceptance" above: order `BRCP-1501`, real PaymentIntent `pi_3TyeIFFjnSocD8E80DCVtNEg`, real event `evt_3TyeIFFjnSocD8E80HVKgsZm`, delivered via the real Stripe CLI and correctly processed end to end (`paymentStatus` → `paid`, correct audit trail, zero leaks), independently re-verified twice. `BRCP-1013` and all other real business data confirmed unaffected throughout.
- **Phase 21C-2E — Full, single-session end-to-end test-mode payment acceptance — not started.** Not to be confused with Phase 21C-2B's own real acceptance (PaymentIntent *creation* only), Phase 21C-2C's own real acceptance (browser payment *submission* only), or Phase 21C-2D's own real acceptance (a real, signature-verified webhook driving `pending → paid` — all three documented above, each independently real and verified) — this sub-phase is the one remaining piece: a single, continuous real session proving the *entire* chain — a real browser checkout submission (Stripe Elements, as in 21C-2C) whose resulting real payment is confirmed via a real, live-delivered webhook (as in 21C-2D) in one unbroken flow, rather than each leg proven independently as it has been so far.
- **Phase 21C-2F — Refunds — not started.** Stripe deposit-payment architecture (one PaymentIntent vs. two for deposit-then-balance) remains separately unresolved/deferred, not decided by 21C-2A.
- **Everything else in the original 21A–21K breakdown below** (the rest of 21A's original scope now tracked as Phase 21B above; the rest of 21B now tracked as Phase 21C-1 above; 21C–21G; the rest of 21H — Vercel Firewall's own dashboard configuration for public/IP-level surfaces, contact form, checkout, order creation, admin login; 21I–21K) — **not started.**
- **Phase 20D — AI Video Generation — not started**, unrelated to Phase 21, requires its own separate architecture/security/cost review before starting (see its own Roadmap entry above).

The original audit's lettered subsections (kept exactly as first written, for continuity with existing cross-references):

- **21A — Admin + Authentication**: Google auth, owner/admin authorization, MFA expectations for privileged accounts, session security/expiration, logout behavior, protected admin routes, Server Actions, API Route Handlers, direct-request authorization-bypass attempts, CSRF, privilege escalation, IDOR/broken access control, unauthorized mutations. Every sensitive mutation must independently authorize the admin (the standing rule since Phase 12 — this phase is where it gets attack-tested, not just followed).
- **21B — Store + Checkout + Orders** (high priority): price/quantity/subtotal/deposit/total manipulation, negative quantities, fake or manipulated product IDs, checkout request replay, malformed requests, duplicate submissions, direct API/Server Action calls bypassing the UI, order-number manipulation, unauthorized order access/modification, manual-order security, order-status and payment-status manipulation. The browser must never be authoritative for money — the server already is (see "Backend + database foundation" → "Security"); this phase is where that guarantee gets adversarially tested, not assumed. Integer-cents money representation continues unchanged.
- **21C — Payment Security Gate**: a genuinely **separate**, additional checkpoint required before accepting the first real production payment, whenever real online payments are eventually introduced (no Stripe or any processor exists in this codebase today — see "Checkout + Order foundation"). Never store raw card numbers, CVV/CVC, or full payment credentials; use a reputable processor (e.g. Stripe); cryptographically verify webhooks; a browser request must never be able to declare an order paid. Tests: forged/replayed webhooks, duplicate events, altered amounts, mismatched order/payment amounts, refund authorization, payment-status spoofing, failed-payment behavior.
- **21D — Customer Data + Privacy**: names, emails, phone numbers, companies, leads, customers, orders, notes, and any future addresses/uploads. Tests: unauthorized reads, IDOR, data leakage, audit-log leakage, accidental PII exposure, excessive logging, API response exposure. Continues the standing "no PII in audit metadata" rule already followed since Phase 18A.
- **21E — Input + Application Security**: XSS (stored and reflected), SQL injection, malformed JSON, unexpected enum values, malicious URLs, oversized payloads, Unicode/control-character edge cases, HTML/script injection, path manipulation — across both public and admin inputs, server-validated even where the UI already constrains input (the existing closed-enum discipline proven in Motion/Portfolio/Services is exactly the kind of defense this phase verifies, not invents).
- **21F — Media + File Upload Security**: full Media Library review — unauthorized uploads/replacement, MIME/extension spoofing, malformed image/video files, oversized uploads, storage abuse, malicious filenames, archived-asset behavior, Blob authorization, upload-token exposure, upload rate limiting. `BLOB_READ_WRITE_TOKEN` and all other credentials stay server-side, never exposed to the browser (already true — see "Video Media Foundation (Phase 19A)"; this phase verifies it under attack). If sensitive customer documents, invoices, contracts, or private project files are ever stored, they must NOT default into the current public media store — a private-file architecture would need designing first.
- **21G — Big Red Brain / AI Security**: treats AI as an untrusted assistant, never an administrator. Tests: prompt injection (direct and indirect via malicious customer content), attempts to expose system prompts/secrets, unauthorized tool/action requests, destructive suggestions, AI-generated XSS/HTML, API-credit abuse, generation spam, oversized requests. Requires: AI-specific rate limiting, usage quotas/cost controls, server-side-only provider credentials, permission boundaries, approval gates, safe output validation, auditability. Big Red Brain must never obtain unrestricted database/admin authority — the architecture stays `READ → ANALYZE → RECOMMEND → DRAFT → OWNER APPROVES → MUTATION/PUBLISH`, identical to Phase 20's own safety model above.
- **21H — Rate Limiting + Abuse Protection** — **partially complete**: Big Red Brain, Creative Studio image generation, video-upload-token issuance, and now `POST /api/orders` (Phase 21C-1) are rate-limited (see "Rate Limiting (Phase 21A-1B / 21A-1C)" and "Store/Checkout/Order Security (Phase 21C-1)" above). Still open: contact form and authentication-sensitive endpoints (admin login/OAuth) — both planned for Vercel Firewall (public/IP-level, dashboard-configured), not yet applied; Phase 21C-1's own architecture inspection found Vercel Firewall's current dashboard controls don't yet provide the path-targeting/machine-readable-429 behavior needed, which is why `/api/orders` used the application-level limiter instead of waiting on Firewall. The existing contact-form same-email cooldown (Phase 18A) is useful but explicitly does **not** substitute for general abuse/rate-limit protection.
- **21I — Browser + HTTP Security** — **partially complete**: production headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors`, `Cross-Origin-Opener-Policy`) are now implemented and real-tested — see "Security Headers & CSP (Phase 21A-2)" above. Still open: secure cookie attributes/`SameSite` behavior review, HTTPS-only behavior/production redirects, and a broader external-resource-policy review beyond what this phase's CSP already covers.
- **21J — Infrastructure + Secrets**: Vercel/Neon/Blob configuration, Development/Preview/Production separation, environment variables, Google OAuth configuration, future AI-provider credentials, npm dependencies, and a scan of both the current repository and **Git history** for accidentally committed secrets. No credential should exist in source code, ever.
- **21K — Dependency + Production Testing**: npm dependency/security audit, a real production build, security-header tests, authorization/CSRF/XSS/SQL-injection/IDOR/upload-abuse/checkout-manipulation/rate-limit tests, an OWASP ZAP baseline scan against an appropriate Preview deployment, and manual attack testing. Destructive penetration testing is never performed against real production business data — Preview/test data only where anything destructive is required.

**Phase 21 completion requirement** — cannot be marked complete until: (1) admin/authentication passes, (2) store/checkout/order security passes, (3) customer-data authorization passes, (4) media/upload security passes, (5) Big Red Brain/AI boundaries pass if AI is enabled by then, (6) production headers/configuration pass, (7) critical/high findings are fixed and retested, (8) security acceptance results are documented (following this file's own established "what was genuinely verified" honesty standard). If real payments have been implemented by this point, (9) the Payment Security Gate (21C) must also separately pass before accepting production payments.

### Phase 22 — Production Polish + Launch Readiness

After security hardening. Potential scope: final responsive QA, accessibility review, performance optimization, Core Web Vitals, SEO validation, metadata/Open Graph, sitemap/robots, 404/error states, final copy/content QA, backup/recovery procedures, operational monitoring, analytics, production-domain checks, and a launch checklist. Security findings from Phase 21 always take priority over cosmetic launch work — this phase does not start fixing paint while Phase 21 still has open critical/high findings.

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
