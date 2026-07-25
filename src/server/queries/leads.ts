import "server-only";
import { and, count, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { isValidUuid } from "@/server/is-uuid";
import { getNotesForEntity } from "@/server/notes";
import type { NoteWithAuthor } from "@/server/notes";
import { LEAD_STATUSES } from "@/data/leads";
import type { LeadStatus } from "@/data/leads";

// Server-only, read-only admin lead queries — mirrors queries/orders.ts's
// exact offset-pagination/ILIKE-search/URL-driven-filter pattern. Never
// imported by a client component; nothing else queries `leads` directly.

export const LEADS_PAGE_SIZE = 25;

export type LeadListRow = {
  id: string;
  name: string;
  email: string;
  requestedService: string | null;
  status: string;
  createdAt: Date;
  archivedAt: Date | null;
};

export type ListLeadsParams = {
  page?: number;
  status?: string;
  archived?: "only" | "exclude";
  search?: string;
};

export type ListLeadsResult = {
  rows: LeadListRow[];
  totalCount: number;
  page: number;
  pageCount: number;
};

function isValidLeadStatus(value: string | undefined): value is LeadStatus {
  return !!value && (LEAD_STATUSES as readonly string[]).includes(value);
}

export async function listLeadsForAdmin(params: ListLeadsParams): Promise<ListLeadsResult> {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * LEADS_PAGE_SIZE;

  const conditions = [];
  if (isValidLeadStatus(params.status)) {
    conditions.push(eq(leads.status, params.status));
  }
  if (params.archived === "only") {
    conditions.push(isNotNull(leads.archivedAt));
  } else if (params.archived === "exclude") {
    conditions.push(isNull(leads.archivedAt));
  }
  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(leads.name, pattern), ilike(leads.email, pattern), ilike(leads.company, pattern)));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        requestedService: leads.requestedService,
        status: leads.status,
        createdAt: leads.createdAt,
        archivedAt: leads.archivedAt,
      })
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(LEADS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(leads).where(whereClause),
  ]);

  const totalCount = totalResult[0]?.value ?? 0;

  return {
    rows,
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / LEADS_PAGE_SIZE)),
  };
}

export type LeadDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  requestedService: string | null;
  message: string;
  source: string;
  status: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; firstName: string; lastName: string; email: string } | null;
  notes: NoteWithAuthor[];
};

export async function getLeadById(id: string): Promise<LeadDetail | null> {
  if (!isValidUuid(id)) return null;

  const db = getDb();
  const row = await db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: { customer: true },
  });
  if (!row) return null;

  const notesForLead = await getNotesForEntity(db, "lead", id);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    requestedService: row.requestedService,
    message: row.message,
    source: row.source,
    status: row.status,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer
      ? { id: row.customer.id, firstName: row.customer.firstName, lastName: row.customer.lastName, email: row.customer.email }
      : null,
    notes: notesForLead,
  };
}

export async function getLeadStatusCounts(): Promise<{ newCount: number; needsFollowUpCount: number }> {
  const db = getDb();
  const rows = await db
    .select({ status: leads.status, value: count() })
    .from(leads)
    .where(isNull(leads.archivedAt))
    .groupBy(leads.status);

  let newCount = 0;
  let needsFollowUpCount = 0;
  for (const row of rows) {
    if (row.status === "new") newCount += row.value;
    if (row.status === "new" || row.status === "contacted") needsFollowUpCount += row.value;
  }
  return { newCount, needsFollowUpCount };
}
