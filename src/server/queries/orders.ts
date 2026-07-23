import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orders } from "@/db/schema";
import { ORDER_STATUSES } from "@/data/orders";
import type { OrderStatus } from "@/data/orders";
import { isValidUuid } from "@/server/is-uuid";

// Server-only, never imported by a client component — matches the pattern
// already established by src/server/create-order.ts etc. All admin order
// reads go through this module; nothing else queries `orders` directly.

export const ORDERS_PAGE_SIZE = 25;

export type OrderListRow = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  depositDue: number;
  hasEstimatedPricing: boolean;
  createdAt: Date;
};

export type ListOrdersParams = {
  page?: number;
  status?: string;
  search?: string;
};

export type ListOrdersResult = {
  rows: OrderListRow[];
  totalCount: number;
  page: number;
  pageCount: number;
};

function isValidOrderStatus(value: string | undefined): value is OrderStatus {
  return !!value && (ORDER_STATUSES as readonly string[]).includes(value);
}

// URL-driven filter/search/pagination (?page=&status=&q=) — offset-based
// LIMIT/OFFSET, plain Postgres ILIKE search. Adequate at this business's
// scale; see CLAUDE.md "Admin foundation" for why this beats a heavier
// cursor/full-text setup here.
export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * ORDERS_PAGE_SIZE;

  const conditions = [];
  if (isValidOrderStatus(params.status)) {
    conditions.push(eq(orders.status, params.status));
  }
  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, pattern),
        ilike(customers.firstName, pattern),
        ilike(customers.lastName, pattern),
        ilike(customers.email, pattern),
      ),
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        pricingSummary: orders.pricingSummary,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(ORDERS_PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: count() })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause),
  ]);

  const totalCount = totalResult[0]?.value ?? 0;

  return {
    rows: rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      customerName: `${row.customerFirstName} ${row.customerLastName}`.trim(),
      customerEmail: row.customerEmail,
      subtotal: row.pricingSummary.subtotal,
      depositDue: row.pricingSummary.depositDue,
      hasEstimatedPricing: row.pricingSummary.hasEstimatedPricing,
      createdAt: row.createdAt,
    })),
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / ORDERS_PAGE_SIZE)),
  };
}

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  pricingSummary: { subtotal: number; depositDue: number; hasEstimatedPricing: boolean };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    company: string | null;
  };
  lines: Array<{
    id: string;
    productTitle: string;
    productType: string;
    purchaseMode: string;
    quantity: number;
    selectedPackage: { packageSlug: string; label: string; price?: number; startingPrice?: number } | null;
    selectedOptions: Array<{ optionKey: string; optionLabel: string; value: string; valueLabel: string; priceDelta: number }>;
    selectedAddOns: Array<{ addOnSlug: string; label: string; price?: number; chargeType: string }>;
    unitPrice: number;
    depositAmount: number | null;
    lineSubtotal: number;
    intakeRequired: boolean | null;
    intakeFormSlug: string | null;
    intakeStatus: string | null;
  }>;
};

// Reads exclusively from the frozen orders/order_lines snapshot — this
// function never joins against, or falls back to, live product data. See
// CLAUDE.md: historical orders must remain renderable independent of the
// current catalog.
export async function getOrderById(id: string): Promise<OrderDetail | null> {
  if (!isValidUuid(id)) return null;

  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { customer: true, lines: true },
  });
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    notes: order.notes,
    pricingSummary: order.pricingSummary,
    customer: order.customer,
    lines: order.lines,
  };
}

export async function getOrderStatusCounts(): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db.select({ status: orders.status, value: count() }).from(orders).groupBy(orders.status);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.value;
  }
  return result;
}
