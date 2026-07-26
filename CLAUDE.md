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

### Phase 19 (Phase 19A and 19B complete — see below)

This section originally noted that the next major phase would bring Media Library video uploads. That work is now done — see "Video Media Foundation (Phase 19A)" below for the complete architecture. Phase 19B then wired that foundation into the first real public consumer — Portfolio gallery video — see "Portfolio Video Support (Phase 19B)" below. Still not started: video on Services/Product/the homepage (Phase 19B was deliberately scoped to Portfolio only — see that section's "Not built this phase"), and admin-controlled website animations/motion, now referred to as Phase 19C.

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
- **Homepage video** — inspected in detail during Phase 19C's architecture report; deliberately not started. See "Service Gallery Video Support (Phase 19C)" → "Homepage findings" below for the full, honest writeup of what's there today and why it was deferred.
- **Phase 19D — Cinematic Homepage + Motion/Animation Controls** — admin-controlled website animations (fade/slide/scale/reveal/parallax/hover motion/video entrance treatment, with real `prefers-reduced-motion` support), plus the homepage cinematic/background video work explicitly deferred out of Phase 19C — designed together on purpose, since the homepage's eventual "cinematic hero" look and any admin-controlled entrance/motion treatment are the same design problem, not two unrelated features. Renumbered from a bare "animation controls" placeholder once 19C itself became Service Gallery Video Support. Not started; no schema, no UI, no design decisions made yet — see "Service Gallery Video Support (Phase 19C)" → "Homepage findings" for the concrete constraints (LCP, poster-first loading, autoplay/muted/loop tradeoffs, reduced-motion, image fallback) this phase will need to design around.
- **Phase 20 — Big Red Brain + AI Creative Studio** — the long-standing, explicitly permission-controlled future AI layer documented since Checkout/Orders (Phase 10), now paired with an AI Creative Studio capability to actually generate branding/showcase video and other creative assets. Still no implementation, no schema, no architecture decided — referenced here only so it isn't invented from scratch without this note. The intended flow, preserved for when this phase starts: Design/Media Library assets → Big Red Brain → AI Creative Studio → generate branding/showcase video → save the generated video to the Media Library → set its poster → use it in Portfolio/Services (and, once Phase 19D ships, the homepage) — the Media Library remains the central source of truth for generated video, exactly as it already is for human-uploaded video. The private/public data boundary already documented everywhere else in this file applies unchanged regardless: customer/order/payment/internal-note data stays private no matter what else this future layer can see.
- **AI-generated branding videos** — the original motivating use case named when Phase 19B's architecture was first approved (an eventual Big Red Brain / AI Creative Studio capability to generate on-brand promotional video). Nothing about that generation pipeline exists yet — Phase 19B/19C only built the places such a video would eventually be *displayed* (a real Media Library video asset, attached to a Portfolio or Service gallery item, rendered by `VideoMedia`). The display path is real, proven twice now, and requires zero changes to accept an AI-generated video instead of a human-uploaded one — it would enter through the exact same Media Library upload/poster/replace path. The generation path itself is entirely Phase 20 future work.
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

Homepage video, in any form (see above) — no homepage video was implemented this phase. Product gallery video (`Product.media` untouched, still no `type` field). No animation, autoplay, or motion controls of any kind (Phase 19D — Cinematic Homepage + Motion/Animation Controls). No AI-generated video of any kind (Phase 20 — Big Red Brain + AI Creative Studio). No new CSS — `ServiceGallery` deliberately reuses Portfolio's existing gallery classes rather than introducing Service-specific ones.

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
