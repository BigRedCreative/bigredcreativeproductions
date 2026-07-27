import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCartItem, isCartEligible, isConfigurationValid } from "@/data/cart";
import type { CartItem, ProductConfiguration } from "@/data/cart";
import { getAuthoritativeProduct } from "@/server/product-source";
import { verifyConfigurationAgainstProduct } from "@/server/verify-configuration";
import { createOrder } from "@/server/create-order";
import { checkOrderCreationRateLimit, extractClientIp } from "@/server/rate-limit";

// This endpoint NEVER trusts client-calculated prices. The client sends
// only *configuration* (which product, which package/options/add-ons,
// what quantity) — every price on the resulting order is computed here,
// server-side, from the current authoritative product definition. See
// CLAUDE.md "Backend + database foundation" for the full reconciliation
// writeup.

const orderLineRequestSchema = z.object({
  productId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(100000),
  selectedPackageSlug: z.string().max(200).optional(),
  selectedOptionValues: z.record(z.string(), z.string()).default({}),
  selectedAddOnSlugs: z.array(z.string().max(200)).default([]),
});

const orderRequestSchema = z.object({
  // Idempotency key — see src/server/create-order.ts. Generated once
  // client-side per checkout attempt and persisted across refreshes.
  clientRequestId: z.string().uuid(),
  customer: z.object({
    firstName: z.string().trim().min(1).max(200),
    lastName: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(50).optional(),
    company: z.string().trim().max(200).optional(),
  }),
  notes: z.string().trim().max(4000).optional(),
  lines: z.array(orderLineRequestSchema).min(1).max(50),
});

export async function POST(request: Request) {
  // Phase 21C-1 — abuse/rate-limit protection, checked BEFORE anything
  // else, including request.json() — a blocked request never spends any
  // work parsing/validating a potentially large or malicious body. Keyed
  // on the HMAC of the requester's IP only (never email/name/order id/
  // request-body content — this route is intentionally public, with no
  // session to key against). See CLAUDE.md's Phase 21C-1 writeup for the
  // full design.
  //
  // A limiter INFRASTRUCTURE failure (DB unreachable, AUTH_SECRET
  // unavailable) is caught here and turned into a controlled, fail-closed
  // 503 — never an uncaught exception, and never a false "allowed". No
  // customer/order/order-line/audit row of any kind is created on this
  // path; nothing about the failure (raw IP, HMAC key, DB error detail)
  // is exposed to the client or logged beyond a minimal, sanitized line.
  let rateLimitResult: Awaited<ReturnType<typeof checkOrderCreationRateLimit>>;
  try {
    const clientIp = extractClientIp(request.headers);
    rateLimitResult = await checkOrderCreationRateLimit(clientIp);
  } catch {
    console.error("Order creation rate limiter unavailable");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { clientRequestId, customer, notes, lines } = parsed.data;
  const verifiedItems: CartItem[] = [];

  for (let index = 0; index < lines.length; index++) {
    const requested = lines[index];
    const label = `Item ${index + 1}`;

    const product = await getAuthoritativeProduct(requested.productId);
    if (!product) {
      return NextResponse.json({ error: `${label}: product not found.` }, { status: 400 });
    }
    if (product.status !== "published") {
      return NextResponse.json(
        { error: `${label}: "${product.title}" is not currently available.` },
        { status: 409 },
      );
    }
    if (!isCartEligible(product)) {
      return NextResponse.json(
        { error: `${label}: "${product.title}" is not eligible for direct order.` },
        { status: 409 },
      );
    }

    const configuration: ProductConfiguration = {
      selectedPackageSlug: requested.selectedPackageSlug,
      selectedOptionValues: requested.selectedOptionValues,
      selectedAddOnSlugs: requested.selectedAddOnSlugs,
      quantity: requested.quantity,
    };

    const configError = verifyConfigurationAgainstProduct(product, configuration);
    if (configError) {
      return NextResponse.json({ error: `${label}: ${configError}` }, { status: 400 });
    }
    if (!isConfigurationValid(product, configuration)) {
      return NextResponse.json(
        { error: `${label}: required configuration is incomplete for "${product.title}".` },
        { status: 400 },
      );
    }

    // The one place price is computed for this order — reused verbatim
    // from the cart layer, run here against the authoritative product
    // instead of a client-held copy. Never derived from anything the
    // client submitted.
    const verifiedItem = buildCartItem(product, configuration);
    if (!verifiedItem) {
      return NextResponse.json(
        {
          error: `${label}: pricing could not be resolved for "${product.title}". It may have changed — please review your cart.`,
        },
        { status: 409 },
      );
    }

    verifiedItems.push(verifiedItem);
  }

  const result = await createOrder(clientRequestId, customer, notes, verifiedItems);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    { id: result.id, orderNumber: result.orderNumber, status: result.status },
    { status: 201 },
  );
}
