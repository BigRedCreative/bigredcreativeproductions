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
} from "@/server/queries/media";

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
