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

  components/
    Header.tsx, Hero.tsx, Ticker.tsx, Manifesto.tsx, Statement.tsx,
    Services.tsx, Portfolio.tsx, Studio.tsx, Process.tsx, ContactForm.tsx, Footer.tsx
      — one component per homepage section; presentation + structure only

  components/ui/
    Button.tsx, SectionHeading.tsx, ProjectCard.tsx, ServiceCard.tsx, Badge.tsx
      — shared, generic UI primitives with zero hardcoded business content

  data/
    homepage.ts    — all homepage copy (hero, ticker, manifesto, statement, studio,
                       process, contact form labels, footer wording)
    services.ts      — the services list (title/description/tags)
    projects.ts        — the portfolio/project list
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
