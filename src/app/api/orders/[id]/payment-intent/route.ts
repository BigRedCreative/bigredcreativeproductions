import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPaymentInitiationRateLimit, extractClientIp } from "@/server/rate-limit";
import { handlePaymentIntentRequest } from "@/server/payments/handle-payment-intent";
import { getConfiguredPaymentProvider } from "@/server/payments/registry";

// Phase 21C-2B — POST /api/orders/[id]/payment-intent. Public, intentionally
// (mirrors POST /api/orders's own trust model — no session, no ambient
// authority; authorization here comes entirely from the request body's
// paymentAccessToken, verified inside handlePaymentIntentRequest). See
// CLAUDE.md "Stripe PaymentIntent Creation (Phase 21C-2B)" for the full
// design this implements.
//
// This file deliberately contains ONLY steps 1-2 of the approved request
// ordering (rate limit, body parsing) plus response-shape mapping — every
// other step (token verification, eligibility, amount authority,
// reconciliation, provider calls, persistence, audit) lives in
// handlePaymentIntentRequest, which takes an injected PaymentProvider so
// the entire automated test suite can exercise it with a
// MockPaymentProvider, never this route, never a real Stripe key.

const MAX_TOKEN_LENGTH = 128; // generous upper bound above the real 64-char token length

const bodySchema = z.object({
  paymentAccessToken: z.string().trim().min(1).max(MAX_TOKEN_LENGTH),
});

const GENERIC_NOT_FOUND = NextResponse.json({ error: "Order not found." }, { status: 404 });
const GENERIC_ANOMALY = NextResponse.json(
  { error: "Payment setup is unavailable for this order. Please contact us for assistance." },
  { status: 503 },
);
const GENERIC_PROVIDER_UNAVAILABLE = NextResponse.json(
  { error: "Payment setup is temporarily unavailable. Please try again shortly." },
  { status: 503 },
);
const GENERIC_PERSISTENCE_FAILURE = NextResponse.json(
  { error: "We couldn't set up payment for this order. Please try again." },
  { status: 500 },
);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  // Step 1 — rate limit, BEFORE body parsing or any provider work, mirroring
  // POST /api/orders's exact precedent. A blocked or infrastructure-failed
  // request never spends any work parsing the body or touching the order.
  let rateLimitResult: Awaited<ReturnType<typeof checkPaymentInitiationRateLimit>>;
  try {
    const clientIp = extractClientIp(request.headers);
    rateLimitResult = await checkPaymentInitiationRateLimit(clientIp);
  } catch {
    console.error("Payment initiation rate limiter unavailable");
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    );
  }

  // Step 2 — parse/validate body. No amount, currency, total, email, or
  // clientRequestId is ever accepted here — the ONLY field this endpoint
  // reads from the request body is paymentAccessToken.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { id } = await context.params;

  const result = await handlePaymentIntentRequest(getConfiguredPaymentProvider(), id, parsed.data.paymentAccessToken);

  switch (result.kind) {
    case "success":
      return NextResponse.json(
        { orderId: result.orderId, orderNumber: result.orderNumber, paymentStatus: "pending", clientSecret: result.clientSecret },
        { status: result.isNew ? 201 : 200 },
      );
    case "not_found":
      return GENERIC_NOT_FOUND;
    case "not_eligible": {
      const messages: Record<typeof result.reason, string> = {
        ineligible: "This order isn't eligible for online payment.",
        already_paid: "This order has already been paid.",
        canceled: "This order has been canceled.",
      };
      return NextResponse.json({ error: messages[result.reason] }, { status: 409 });
    }
    case "anomaly":
      return GENERIC_ANOMALY;
    case "provider_unavailable":
      return GENERIC_PROVIDER_UNAVAILABLE;
    case "persistence_failure":
      return GENERIC_PERSISTENCE_FAILURE;
  }
}
