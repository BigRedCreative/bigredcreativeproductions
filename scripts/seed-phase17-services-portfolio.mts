// Phase 17 — one-time seed: copies the existing, content-approved
// src/data/services.ts and src/data/projects.ts arrays into the new
// services/service_versions/portfolio_projects/portfolio_project_versions
// tables, verbatim. This script imports the real TypeScript source
// directly — nothing here is hand-transcribed — so content fidelity is
// structural, not something that needs proofreading.
//
// For each existing service/project: one permanent entity row, plus a
// `draft` version row and a `published` version row seeded with
// IDENTICAL content, so the first DB-backed public render is byte-for-byte
// what's live today AND a private draft immediately exists to edit without
// disturbing anything live. A project whose current source has
// `status: "draft"` seeds ONLY a draft version row (no published row is
// created, since nothing has ever gone live for it) — see isPublished()
// below.
//
// Run with: npx tsx scripts/seed-phase17-services-portfolio.mts
// Delete this file once the migration has been verified and accepted —
// it is a one-time operation, not part of the running application.

import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql as rawSql } from "drizzle-orm";
import ws from "ws";
import * as schema from "../src/db/schema";
import { services as sourceServices } from "../src/data/services";
import { projects as sourceProjects, isPublished } from "../src/data/projects";

neonConfig.webSocketConstructor = ws;

// Same safe .env.local parsing pattern used by every read-only
// verification script in this project — never logs the file's contents.
function loadEnvLocal(path: string): Record<string, string> {
  const text = readFileSync(path, "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal(new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found in .env.local — aborting before any connection is made.");
}

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Step of 10 between sortOrder values (10, 20, 30, ...) — leaves room to
// insert a future entity between two existing ones without renumbering
// everything, mirroring navigation_items' existing sortOrder convention.
const SORT_ORDER_STEP = 10;

function serviceVersionContent(service: (typeof sourceServices)[number]) {
  return {
    slug: service.slug,
    title: service.title,
    shortTitle: service.shortTitle,
    serviceNumber: service.serviceNumber,
    featured: service.featured,
    summary: service.summary,
    fullDescription: service.fullDescription,
    capabilities: service.capabilities,
    deliverables: service.deliverables,
    process: service.process,
    ctaLabel: service.ctaLabel,
    // No current service references a Media Library asset — every hero
    // today is either absent or a legacy local path.
    heroMediaAssetId: null,
    heroImageSrc: service.heroImage?.src ?? null,
    heroImageAlt: service.heroImage?.alt ?? null,
    gallery: service.gallery ?? null,
    seo: service.seo,
    // Dormant commerce fields — every current entry leaves these unset;
    // seeded as explicit NULL, never fabricated as 0/false.
    startingPrice: service.startingPrice ?? null,
    pricingNote: service.pricingNote ?? null,
    turnaround: service.turnaround ?? null,
    revisions: service.revisions ?? null,
    depositAmount: service.depositAmount ?? null,
    purchasable: service.purchasable ?? null,
    intakeFormSlug: service.intakeFormSlug ?? null,
    cartEligible: service.cartEligible ?? null,
  };
}

function projectVersionContent(project: (typeof sourceProjects)[number]) {
  return {
    slug: project.slug,
    title: project.title,
    shortTitle: project.shortTitle,
    category: project.category,
    services: project.services,
    summary: project.summary,
    fullDescription: project.fullDescription,
    client: project.client ?? null,
    year: project.year ?? null,
    featured: project.featured,
    className: project.className,
    stamp: project.stamp,
    heroMediaAssetId: null,
    heroImageSrc: project.heroImage?.src ?? null,
    heroImageAlt: project.heroImage?.alt ?? null,
    // Verbatim array copy — preserves gallery order, alt text, and
    // lightBackground exactly, including the honest placeholder entries
    // for Crash the Stove and Mental Town Exotics unchanged.
    gallery: project.gallery ?? null,
    externalLink: project.externalLink ?? null,
    results: project.results ?? null,
    credits: project.credits ?? null,
    seo: project.seo,
    // thumbnail is deliberately NOT mapped — confirmed dead/unrendered,
    // omitted from the schema per approval.
  };
}

async function assertDestinationTablesEmpty(): Promise<void> {
  const [servicesCount, serviceVersionsCount, projectsCount, projectVersionsCount] = await Promise.all([
    db.select({ value: rawSql<number>`count(*)` }).from(schema.services),
    db.select({ value: rawSql<number>`count(*)` }).from(schema.serviceVersions),
    db.select({ value: rawSql<number>`count(*)` }).from(schema.portfolioProjects),
    db.select({ value: rawSql<number>`count(*)` }).from(schema.portfolioProjectVersions),
  ]);

  const counts = {
    services: Number(servicesCount[0]?.value ?? 0),
    service_versions: Number(serviceVersionsCount[0]?.value ?? 0),
    portfolio_projects: Number(projectsCount[0]?.value ?? 0),
    portfolio_project_versions: Number(projectVersionsCount[0]?.value ?? 0),
  };

  const nonEmpty = Object.entries(counts).filter(([, count]) => count > 0);
  if (nonEmpty.length > 0) {
    throw new Error(
      `Refusing to seed: the following destination tables already contain rows: ${nonEmpty
        .map(([table, count]) => `${table} (${count})`)
        .join(", ")}. This script only ever runs against tables confirmed empty.`,
    );
  }
}

async function main() {
  await assertDestinationTablesEmpty();

  let serviceEntityCount = 0;
  let serviceVersionCount = 0;
  let projectEntityCount = 0;
  let projectVersionCount = 0;

  await db.transaction(async (tx) => {
    for (const [index, service] of sourceServices.entries()) {
      const id = `service_${crypto.randomUUID()}`;
      await tx.insert(schema.services).values({
        id,
        status: "published",
        sortOrder: (index + 1) * SORT_ORDER_STEP,
      });
      serviceEntityCount += 1;

      const content = serviceVersionContent(service);
      await tx.insert(schema.serviceVersions).values({ ...content, serviceId: id, versionType: "draft" });
      await tx.insert(schema.serviceVersions).values({ ...content, serviceId: id, versionType: "published" });
      serviceVersionCount += 2;
    }

    for (const [index, project] of sourceProjects.entries()) {
      const id = `project_${crypto.randomUUID()}`;
      const published = isPublished(project);

      await tx.insert(schema.portfolioProjects).values({
        id,
        status: published ? "published" : "draft",
        sortOrder: (index + 1) * SORT_ORDER_STEP,
      });
      projectEntityCount += 1;

      const content = projectVersionContent(project);
      await tx.insert(schema.portfolioProjectVersions).values({ ...content, projectId: id, versionType: "draft" });
      projectVersionCount += 1;

      if (published) {
        await tx.insert(schema.portfolioProjectVersions).values({ ...content, projectId: id, versionType: "published" });
        projectVersionCount += 1;
      }
      // If not published: only the draft row above was created. No
      // published row exists yet, matching "draft: admin-visible,
      // previewable, not public" — there is nothing to make public.
    }
  });

  console.log("Phase 17 seed complete.");
  console.log(`  services entity rows inserted:            ${serviceEntityCount}`);
  console.log(`  service_versions rows inserted:            ${serviceVersionCount}`);
  console.log(`  portfolio_projects entity rows inserted:   ${projectEntityCount}`);
  console.log(`  portfolio_project_versions rows inserted:  ${projectVersionCount}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed — transaction rolled back, no partial rows were left behind.");
    console.error("Reason:", error instanceof Error ? error.message : "unknown error");
    process.exit(1);
  });
