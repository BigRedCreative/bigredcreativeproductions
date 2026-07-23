import "server-only";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orders } from "@/db/schema";
import { isValidUuid } from "@/server/is-uuid";

export const CUSTOMERS_PAGE_SIZE = 25;

export type CustomerListRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  orderCount: number;
  lastOrderAt: Date | null;
};

export type ListCustomersParams = {
  page?: number;
  search?: string;
};

export type ListCustomersResult = {
  rows: CustomerListRow[];
  totalCount: number;
  page: number;
  pageCount: number;
};

export async function listCustomers(params: ListCustomersParams): Promise<ListCustomersResult> {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * CUSTOMERS_PAGE_SIZE;

  const search = params.search?.trim();
  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(customers.firstName, pattern),
        ilike(customers.lastName, pattern),
        ilike(customers.email, pattern),
        ilike(customers.company, pattern),
      ),
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        company: customers.company,
        phone: customers.phone,
        orderCount: count(orders.id),
        lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(whereClause)
      .groupBy(customers.id)
      .orderBy(desc(customers.createdAt))
      .limit(CUSTOMERS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(customers).where(whereClause),
  ]);

  const totalCount = totalResult[0]?.value ?? 0;

  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      company: row.company,
      phone: row.phone,
      orderCount: row.orderCount,
      lastOrderAt: row.lastOrderAt,
    })),
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE)),
  };
}

export type CustomerDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  createdAt: Date;
  orders: Array<{ id: string; orderNumber: string; status: string; createdAt: Date; subtotal: number }>;
};

export async function getCustomerCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ value: count() }).from(customers);
  return result[0]?.value ?? 0;
}

export async function getCustomerById(id: string): Promise<CustomerDetail | null> {
  if (!isValidUuid(id)) return null;

  const db = getDb();
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: { orders: true },
  });
  if (!customer) return null;

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    createdAt: customer.createdAt,
    orders: customer.orders
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        subtotal: order.pricingSummary.subtotal,
      })),
  };
}
