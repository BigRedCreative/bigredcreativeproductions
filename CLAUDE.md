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
    projects.ts        — the full portfolio data model + helpers (see "Portfolio system" below)
    projects.validate.ts — runtime validation for project data, run automatically on import
    project.template.ts    — copy-paste starter template for a new project (not used by the app)
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
