import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/payments/stripe";
import { handleStripeWebhookEvent } from "@/server/payments/handle-stripe-webhook";

// Phase 21C-2D — POST /api/stripe/webhook. Public, intentionally: no admin
// session, no CSRF Origin check (per approved design — Next.js's own
// Server Action Origin/Host protection is specific to the 'use server'
// invocation path and does not, and should not, apply here). Authenticated
// EXCLUSIVELY by a verified Stripe signature — this is a fundamentally
// different trust model from every other public route in this codebase
// (POST /api/orders trusts nothing and recomputes everything server-side;
// this route trusts Stripe's own cryptographic assertion once verified).
//
// No application-level IP rate limiting on this route, per approved
// design — Stripe's own delivering IPs vary and aren't a meaningful
// abuse signal here; the real security boundary is signature verification
// itself, which is cheap to fail fast on and requires no state.
//
// No CSP change was made for this route — CSP governs browser-rendered
// content; this is a server-to-server JSON endpoint Stripe's own
// infrastructure calls, never loaded in a browser context.
//
// This file deliberately stays thin — every real decision (event
// allowlist, order matching, amount/currency verification, state
// precedence, transaction/dedup semantics, audit logging) lives in
// handleStripeWebhookEvent (src/server/payments/handle-stripe-webhook.ts),
// which takes an already-verified Stripe.Event as a plain parameter so it
// can be exercised by the offline test suite with zero real Stripe
// signature machinery involved.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fails closed. Never logs anything beyond this fixed, static string —
    // no header, no body, no environment detail.
    console.error("Stripe webhook secret is not configured.");
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Read the raw body EXACTLY ONCE, as text — never request.json() first.
  // Stripe's signature is computed over the exact raw bytes; parsing (or
  // re-serializing) the body before verification would invalidate the
  // signature check entirely, and a Request body can only be consumed once.
  const rawBody = await request.text();

  let event;
  try {
    event = await verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
  } catch {
    // Invalid signature, malformed payload, or any other verification
    // failure. Never log the raw body, the signature header value, the
    // configured secret, or the verification library's own error message
    // (which can echo back parts of the payload) — only this fixed,
    // static string.
    console.error("Stripe webhook signature verification failed.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const result = await handleStripeWebhookEvent(event);

  switch (result.kind) {
    case "ignored_unhandled_type":
    case "duplicate":
    case "processed":
    case "anomaly":
      // 200 in every one of these cases — Stripe must never retry a
      // delivery that has already been durably and correctly handled
      // (including a terminal anomaly, which by definition will never
      // become processable no matter how many times it's retried).
      return NextResponse.json({ received: true }, { status: 200 });
    case "retryable":
      // 5xx — signals Stripe to retry this exact delivery later. Never
      // exposes which retryable reason applied, or any other internal
      // detail, in the response body.
      return NextResponse.json({ error: "Temporary processing failure." }, { status: 500 });
  }
}
