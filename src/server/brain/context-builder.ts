import "server-only";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  leads,
  serviceVersions,
  portfolioProjectVersions,
  mediaAssets,
  motionSettings,
  brandSettings,
} from "@/db/schema";
import {
  findProductsReferencingMediaAsset,
  findServicesReferencingMediaAsset,
  findProjectsReferencingMediaAsset,
  findHeroMediaUsage,
  findAssetsUsingAsPoster,
  getMediaAssetById,
} from "@/server/queries/media";
import { getCustomerById } from "@/server/queries/customers";
import { getOrderById } from "@/server/queries/orders";
import { getPortfolioEntityForAdmin } from "@/server/queries/portfolio";
import { getServiceEntityForAdmin } from "@/server/queries/services";
import { getPublishedBrandTokens } from "@/server/queries/brand";
import { getSiteSettings } from "@/server/queries/site-content";
import {
  truncateContextField,
  capContextList,
  MAX_CONTEXT_SHORT_FIELD_LENGTH,
  MAX_CONTEXT_MEDIUM_FIELD_LENGTH,
  MAX_CONTEXT_LONG_FIELD_LENGTH,
} from "./context-truncation";

// Phase 20A — the ONLY context builder wired to a real provider-backed
// request this phase. See CLAUDE.md's Phase 20 architecture report,
// "Context retrieval architecture": each builder is a fixed, reviewable
// shape, never a general-purpose "fetch anything" capability. This one
// returns small AGGREGATE counts/labels only — no lead/customer names, no
// emails, no messages, no notes, no order line items. A free-text
// dashboard question can only ever see what THIS function decided to
// include, regardless of what it asks for — there is no code path from a
// question string to a broader database read.
//
// A future buildOrderContext()/buildCustomerContext()/etc. (Phase 20B)
// would each be their own similarly-scoped function — never a shared
// "give me everything about entity X" helper.

export type DashboardContext = {
  leadCounts: { new: number; contacted: number; qualified: number; won: number; lost: number };
  leadsNeedingFollowUpCount: number;
  orderPaymentCounts: { unpaid: number; depositPaid: number; paidInFull: number; refunded: number };
  activeProjectCount: number;
  awaitingClientCount: number;
  servicesMissingGalleryCount: number;
  portfolioThinSeoCount: number;
  orphanedMediaAssetCount: number;
  motion: { intensity: string; heroEntrance: string };
  brandConfigured: boolean;
};

const MIN_SEO_DESCRIPTION_LENGTH = 60;

export async function buildDashboardContext(): Promise<DashboardContext> {
  const db = getDb();

  const leadRows = await db.query.leads.findMany({ where: isNull(leads.archivedAt) });
  const leadCounts = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
  for (const lead of leadRows) {
    if (lead.status in leadCounts) {
      leadCounts[lead.status as keyof typeof leadCounts]++;
    }
  }
  const leadsNeedingFollowUpCount = leadCounts.new + leadCounts.contacted;

  const orderRows = await db.query.orders.findMany();
  const orderPaymentCounts = { unpaid: 0, depositPaid: 0, paidInFull: 0, refunded: 0 };
  let activeProjectCount = 0;
  let awaitingClientCount = 0;
  for (const order of orderRows) {
    if (order.paymentStatus === "unpaid") orderPaymentCounts.unpaid++;
    else if (order.paymentStatus === "deposit-paid") orderPaymentCounts.depositPaid++;
    else if (order.paymentStatus === "paid-in-full") orderPaymentCounts.paidInFull++;
    else if (order.paymentStatus === "refunded") orderPaymentCounts.refunded++;

    if (order.status === "approved" || order.status === "in-progress") activeProjectCount++;
    if (order.status === "awaiting-client") awaitingClientCount++;
  }

  const publishedServices = await db.query.serviceVersions.findMany({
    where: eq(serviceVersions.versionType, "published"),
  });
  const servicesMissingGalleryCount = publishedServices.filter(
    (s) => !s.gallery || (Array.isArray(s.gallery) && s.gallery.length === 0),
  ).length;

  const publishedPortfolio = await db.query.portfolioProjectVersions.findMany({
    where: eq(portfolioProjectVersions.versionType, "published"),
  });
  const portfolioThinSeoCount = publishedPortfolio.filter(
    (p) => !p.seo?.description || p.seo.description.length < MIN_SEO_DESCRIPTION_LENGTH,
  ).length;

  const activeAssets = await db.query.mediaAssets.findMany({ where: eq(mediaAssets.status, "active") });
  let orphanedMediaAssetCount = 0;
  for (const asset of activeAssets) {
    const [productRefs, serviceRefs, projectRefs, heroRefs, posterRefs] = await Promise.all([
      findProductsReferencingMediaAsset(asset.id),
      findServicesReferencingMediaAsset(asset.id),
      findProjectsReferencingMediaAsset(asset.id),
      findHeroMediaUsage(asset.id),
      findAssetsUsingAsPoster(asset.id),
    ]);
    const totalUsage = productRefs.length + serviceRefs.length + projectRefs.length + heroRefs.length + posterRefs.length;
    if (totalUsage === 0) orphanedMediaAssetCount++;
  }

  const motionRow = await db.query.motionSettings.findFirst({ where: eq(motionSettings.status, "published") });
  const brandRow = await db.query.brandSettings.findFirst({ where: eq(brandSettings.status, "published") });

  return {
    leadCounts,
    leadsNeedingFollowUpCount,
    orderPaymentCounts,
    activeProjectCount,
    awaitingClientCount,
    servicesMissingGalleryCount,
    portfolioThinSeoCount,
    orphanedMediaAssetCount,
    motion: { intensity: motionRow?.intensity ?? "unknown", heroEntrance: motionRow?.heroEntrance ?? "unknown" },
    brandConfigured: !!brandRow,
  };
}

// ---------------------------------------------------------------------
// Phase 20B — entity-specific context builders. Each mirrors
// buildDashboardContext()'s own rule: a fixed, explicit ALLOWLIST of
// fields, never a spread of the underlying database/query-layer row.
// Every builder independently re-fetches its entity by id (reusing the
// EXISTING, already-safe admin query functions — getCustomerById() etc.
// already validate id shape and return null/undefined for a bad or
// nonexistent id) and returns { ok: false } for that case — the caller
// (handle-request.ts) is what turns that into a clean validation error,
// never a fallback to a different context. Text fields likely to run long
// (summary, fullDescription, seo description, list items) are truncated
// via context-truncation.ts BEFORE this object is ever handed to
// buildUserPrompt() — see that module's own comment for why truncation
// happens here, not after.
// ---------------------------------------------------------------------

export type EntityContextResult<T> = { ok: true; context: T } | { ok: false };

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function monthYearLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// --- Customer -----------------------------------------------------------

export type CustomerContext = {
  displayName: string;
  company: string | null;
  customerSinceLabel: string;
  orderCount: number;
  mostRecentOrderStatus: string | null;
  daysSinceMostRecentOrder: number | null;
  leadCount: number;
  mostRecentLeadStatus: string | null;
  hasRecentNote: boolean;
  daysSinceLastNote: number | null;
};

export async function buildCustomerContext(customerId: string): Promise<EntityContextResult<CustomerContext>> {
  const customer = await getCustomerById(customerId);
  if (!customer) return { ok: false };

  const mostRecentOrder = customer.orders[0] ?? null; // already newest-first
  const mostRecentLead = customer.leads[0] ?? null; // already newest-first
  const lastNote = customer.notes.length > 0 ? customer.notes[customer.notes.length - 1] : null; // notes are oldest-first

  return {
    ok: true,
    context: {
      displayName: `${customer.firstName} ${customer.lastName}`.trim(),
      company: customer.company,
      customerSinceLabel: monthYearLabel(customer.createdAt),
      orderCount: customer.orders.length,
      mostRecentOrderStatus: mostRecentOrder?.status ?? null,
      daysSinceMostRecentOrder: mostRecentOrder ? daysSince(mostRecentOrder.createdAt) : null,
      leadCount: customer.leads.length,
      mostRecentLeadStatus: mostRecentLead?.status ?? null,
      hasRecentNote: customer.notes.length > 0,
      daysSinceLastNote: lastNote ? daysSince(lastNote.createdAt) : null,
    },
  };
}

// --- Order ---------------------------------------------------------------

export type OrderContext = {
  orderNumber: string;
  workStatus: string;
  paymentStatus: string;
  source: string;
  subtotal: number;
  depositDue: number;
  hasEstimatedPricing: boolean;
  lineItems: Array<{ title: string; description: string | null; quantity: number }>;
  customerDisplayName: string;
  hasCustomerMessage: boolean;
  internalNoteCount: number;
  daysSinceLastNote: number | null;
  daysSinceCreated: number;
  daysSinceUpdated: number;
  // Local, deterministic fact — computed here so Brain never has to guess
  // something the application already knows exactly. See "Local facts."
  isUnpaid: boolean;
};

export async function buildOrderContext(orderId: string): Promise<EntityContextResult<OrderContext>> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false };

  const lastNote = order.internalNotes.length > 0 ? order.internalNotes[order.internalNotes.length - 1] : null;

  return {
    ok: true,
    context: {
      orderNumber: order.orderNumber,
      workStatus: order.status,
      paymentStatus: order.paymentStatus,
      source: order.source,
      subtotal: order.pricingSummary.subtotal,
      depositDue: order.pricingSummary.depositDue,
      hasEstimatedPricing: order.pricingSummary.hasEstimatedPricing,
      lineItems: capContextList(order.lines).map((line) => ({
        title: truncateContextField(line.productTitle, MAX_CONTEXT_SHORT_FIELD_LENGTH),
        description: line.description ? truncateContextField(line.description, MAX_CONTEXT_MEDIUM_FIELD_LENGTH) : null,
        quantity: line.quantity,
      })),
      customerDisplayName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      hasCustomerMessage: !!order.customerMessage,
      internalNoteCount: order.internalNotes.length,
      daysSinceLastNote: lastNote ? daysSince(lastNote.createdAt) : null,
      daysSinceCreated: daysSince(order.createdAt),
      daysSinceUpdated: daysSince(order.updatedAt),
      isUnpaid: order.paymentStatus === "unpaid",
    },
  };
}

// --- Portfolio -------------------------------------------------------------


export type PortfolioContext = {
  title: string;
  category: string;
  servicesTags: string[];
  summary: string;
  fullDescription: string;
  client: string | null;
  year: string | null;
  entityStatus: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  galleryImageCount: number;
  galleryVideoCount: number;
  galleryAltTexts: string[];
  results: Array<{ label: string; value: string }>;
  // Local, deterministic facts.
  hasMissingGallery: boolean;
  hasThinSeoDescription: boolean;
};

export async function buildPortfolioContext(projectId: string): Promise<EntityContextResult<PortfolioContext>> {
  const entity = await getPortfolioEntityForAdmin(projectId);
  if (!entity) return { ok: false };

  // Reads the DRAFT content — what the admin is actively working on, the
  // same reasoning `resolveHeroMedia()`-style "draft is the working copy"
  // convention already established elsewhere in this codebase.
  const project = entity.draft;
  const gallery = project.gallery ?? [];

  return {
    ok: true,
    context: {
      title: project.title,
      category: project.category,
      servicesTags: capContextList(project.services).map((s) => truncateContextField(s, MAX_CONTEXT_SHORT_FIELD_LENGTH)),
      summary: truncateContextField(project.summary, MAX_CONTEXT_MEDIUM_FIELD_LENGTH),
      fullDescription: truncateContextField(project.fullDescription, MAX_CONTEXT_LONG_FIELD_LENGTH),
      client: project.client ?? null,
      year: project.year ?? null,
      entityStatus: entity.entity.status,
      featured: project.featured,
      seoTitle: truncateContextField(project.seo.title, MAX_CONTEXT_SHORT_FIELD_LENGTH),
      seoDescription: truncateContextField(project.seo.description, MAX_CONTEXT_SHORT_FIELD_LENGTH),
      galleryImageCount: gallery.filter((g) => g.type !== "video").length,
      galleryVideoCount: gallery.filter((g) => g.type === "video").length,
      galleryAltTexts: capContextList(gallery).map((g) => truncateContextField(g.alt, MAX_CONTEXT_SHORT_FIELD_LENGTH)),
      results: capContextList(project.results ?? []).map((r) => ({
        label: truncateContextField(r.label, MAX_CONTEXT_SHORT_FIELD_LENGTH),
        value: truncateContextField(r.value, MAX_CONTEXT_SHORT_FIELD_LENGTH),
      })),
      hasMissingGallery: gallery.length === 0,
      hasThinSeoDescription: !project.seo.description || project.seo.description.length < MIN_SEO_DESCRIPTION_LENGTH,
    },
  };
}

// --- Service ---------------------------------------------------------------

export type ServiceContext = {
  title: string;
  summary: string;
  fullDescription: string;
  capabilities: string[];
  deliverables: string[];
  process: Array<{ title: string; description: string }>;
  entityStatus: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  galleryImageCount: number;
  galleryVideoCount: number;
  galleryAltTexts: string[];
  // Commerce fields — only included when genuinely populated (currently
  // always null/undefined for every real service in this codebase).
  startingPrice: number | null;
  pricingNote: string | null;
  turnaround: string | null;
  // Local, deterministic facts.
  hasMissingGallery: boolean;
  hasThinSeoDescription: boolean;
};

export async function buildServiceContext(serviceId: string): Promise<EntityContextResult<ServiceContext>> {
  const entity = await getServiceEntityForAdmin(serviceId);
  if (!entity) return { ok: false };

  const service = entity.draft;
  const gallery = service.gallery ?? [];

  return {
    ok: true,
    context: {
      title: service.title,
      summary: truncateContextField(service.summary, MAX_CONTEXT_MEDIUM_FIELD_LENGTH),
      fullDescription: truncateContextField(service.fullDescription, MAX_CONTEXT_LONG_FIELD_LENGTH),
      capabilities: capContextList(service.capabilities).map((c) => truncateContextField(c, MAX_CONTEXT_SHORT_FIELD_LENGTH)),
      deliverables: capContextList(service.deliverables).map((d) => truncateContextField(d, MAX_CONTEXT_SHORT_FIELD_LENGTH)),
      process: capContextList(service.process).map((p) => ({
        title: truncateContextField(p.title, MAX_CONTEXT_SHORT_FIELD_LENGTH),
        description: truncateContextField(p.description, MAX_CONTEXT_MEDIUM_FIELD_LENGTH),
      })),
      entityStatus: entity.entity.status,
      featured: service.featured,
      seoTitle: truncateContextField(service.seo.title, MAX_CONTEXT_SHORT_FIELD_LENGTH),
      seoDescription: truncateContextField(service.seo.description, MAX_CONTEXT_SHORT_FIELD_LENGTH),
      galleryImageCount: gallery.filter((g) => g.type !== "video").length,
      galleryVideoCount: gallery.filter((g) => g.type === "video").length,
      galleryAltTexts: capContextList(gallery).map((g) => truncateContextField(g.alt, MAX_CONTEXT_SHORT_FIELD_LENGTH)),
      startingPrice: service.startingPrice ?? null,
      pricingNote: service.pricingNote ? truncateContextField(service.pricingNote, MAX_CONTEXT_SHORT_FIELD_LENGTH) : null,
      turnaround: service.turnaround ? truncateContextField(service.turnaround, MAX_CONTEXT_SHORT_FIELD_LENGTH) : null,
      hasMissingGallery: gallery.length === 0,
      hasThinSeoDescription: !service.seo.description || service.seo.description.length < MIN_SEO_DESCRIPTION_LENGTH,
    },
  };
}

// --- Media -----------------------------------------------------------------

export type MediaContext = {
  filename: string;
  altText: string;
  caption: string | null;
  type: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  status: string;
  daysSinceCreated: number;
  hasPoster: boolean | null; // null for images (concept doesn't apply)
  usedByProductCount: number;
  usedByServiceCount: number;
  usedByPortfolioCount: number;
  usedAsHomepageHero: boolean;
  usedAsPosterForCount: number;
  // Local, deterministic facts.
  isOrphaned: boolean;
  hasMissingAltText: boolean;
  isArchived: boolean;
};

export async function buildMediaContext(mediaAssetId: string): Promise<EntityContextResult<MediaContext>> {
  const asset = await getMediaAssetById(mediaAssetId);
  if (!asset) return { ok: false };

  const [productRefs, serviceRefs, projectRefs, heroRefs, posterRefs] = await Promise.all([
    findProductsReferencingMediaAsset(asset.id),
    findServicesReferencingMediaAsset(asset.id),
    findProjectsReferencingMediaAsset(asset.id),
    findHeroMediaUsage(asset.id),
    findAssetsUsingAsPoster(asset.id),
  ]);
  const totalUsage = productRefs.length + serviceRefs.length + projectRefs.length + heroRefs.length + posterRefs.length;

  return {
    ok: true,
    context: {
      filename: asset.filename,
      altText: truncateContextField(asset.alt, MAX_CONTEXT_SHORT_FIELD_LENGTH),
      caption: asset.caption ? truncateContextField(asset.caption, MAX_CONTEXT_SHORT_FIELD_LENGTH) : null,
      type: asset.type,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      status: asset.status,
      daysSinceCreated: daysSince(asset.createdAt),
      hasPoster: asset.type === "video" ? !!asset.posterMediaAssetId : null,
      usedByProductCount: productRefs.length,
      usedByServiceCount: serviceRefs.length,
      usedByPortfolioCount: projectRefs.length,
      usedAsHomepageHero: heroRefs.length > 0,
      usedAsPosterForCount: posterRefs.length,
      isOrphaned: totalUsage === 0,
      hasMissingAltText: !asset.alt || asset.alt.trim() === "",
      isArchived: asset.status === "archived",
    },
  };
}

// --- Brand ------------------------------------------------------------------
// Phase 20C-1 — Creative Studio's "Brand" context source. Deliberately
// uses ONLY real, existing, admin-editable Brand configuration — the
// published site name and the published brand_settings colors — never a
// hardcoded "brand voice" string derived from CLAUDE.md or any other
// documentation file (CLAUDE.md is documentation, not production
// configuration, per explicit approval). brand_settings has no editable
// "voice/tone" field today, so this context simply omits that concept
// entirely rather than inventing one; a future phase could add a real,
// admin-editable Brand Voice field to brand_settings and extend this
// function then, without needing to revisit this decision.
export type BrandContext = {
  siteName: string;
  primaryColor: string;
  accentColor: string;
  buttonBackground: string;
  buttonText: string;
};

export async function buildBrandContext(): Promise<BrandContext> {
  const [tokens, settings] = await Promise.all([getPublishedBrandTokens(), getSiteSettings()]);
  return {
    siteName: settings.siteName,
    primaryColor: tokens.primaryColor,
    accentColor: tokens.accentColor,
    buttonBackground: tokens.buttonBackground,
    buttonText: tokens.buttonText,
  };
}
