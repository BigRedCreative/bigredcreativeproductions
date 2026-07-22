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

  components/ui/
    Button.tsx, SectionHeading.tsx, ProjectCard.tsx, ServiceCard.tsx, Badge.tsx
      — shared, generic UI primitives with zero hardcoded business content

  data/
    homepage.ts    — all homepage copy (hero, ticker, manifesto, statement, studio,
                       process, contact form labels, footer wording)
    services.ts      — the services list (title/description/tags)
    projects.ts        — the full portfolio data model + helpers (see "Portfolio system" below)
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

Every project lives as one object in the `projects` array in `src/data/projects.ts`, typed by the `Project` interface defined at the top of that file. Adding a project to that array automatically:

- generates a static page at `/work/[slug]` (via `generateStaticParams`)
- generates that page's `<title>`/meta description (via `generateMetadata`, from the project's `seo` field)
- adds it to the homepage "Selected work" grid, **if** `featured: true`
- wires up Previous/Next navigation on every project's detail page, in array order (wraps around)

### How featured projects are selected

The homepage only renders projects where `featured: true` (see `getFeaturedProjects()` in `src/data/projects.ts`, used by `src/components/Portfolio.tsx`). A project with `featured: false` still gets its own `/work/[slug]` page and still appears in Previous/Next navigation — it just doesn't show up in the homepage grid. Use this to keep the homepage curated as the portfolio grows.

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

Reference them from `src/data/projects.ts` as `/images/projects/[project-slug]/hero.jpg`, etc. (Next.js serves anything in `public/` from the site root.) All project images use `next/image`, and every image field is `{ src, alt }` — the type system will not let you add an image without alt text.

**If a project has no real photography yet:** leave `thumbnail`/`heroImage`/`gallery` undefined. `ProjectHero` automatically falls back to the same bold typographic treatment already used for every card in the homepage grid (the big split-word `.project-art` display) — this is the site's actual placeholder pattern, not a generic gray box, and it's what all three current projects use today.

### How to add a new portfolio project

1. Add a new object to the `projects` array in `src/data/projects.ts`, following the `Project` type. Use the example below as a template.
2. If you have real photos, drop them in `public/images/projects/[slug]/` and reference them in the `thumbnail`/`heroImage`/`gallery` fields. Otherwise leave those fields out entirely.
3. Set `featured: true` if it should appear on the homepage.
4. Run `npm run build` — the new `/work/[slug]` route generates automatically, no other file needs to change.

### Example project entry

```ts
{
  slug: "acme-relaunch",
  title: "Acme Relaunch",
  shortTitle: "Acme Relaunch",
  category: "Brand identity",
  services: ["Brand identity", "Packaging", "Web"],
  summary: "A full brand relaunch for Acme, from logo to launch site.",
  fullDescription:
    "Acme needed a full identity relaunch that could carry across packaging, retail, and a new website. The project covered brand identity, packaging design, and a launch site built to match.",
  client: "Acme Co.",       // only if confirmed real — omit otherwise
  year: "2026",                    // only if confirmed real — omit otherwise
  featured: true,
  className: "project-red",          // project-red | project-dark | project-cream
  stamp: "NEW DROP",
  heroImage: {
    src: "/images/projects/acme-relaunch/hero.jpg",
    alt: "Acme product packaging on a retail shelf",
  },
  gallery: [
    { src: "/images/projects/acme-relaunch/gallery-1.jpg", alt: "Acme logo system on black" },
  ],
  results: [
    { label: "Sell-through increase", value: "18%" },  // only with real, confirmed numbers
  ],
  credits: [
    { role: "Creative Direction", name: "Big Red Creative Productions" },
  ],
  seo: {
    title: "Acme Relaunch — Brand Identity | Big Red Creative Productions",
    description: "A full brand relaunch for Acme, from logo to launch site.",
  },
},
```

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
