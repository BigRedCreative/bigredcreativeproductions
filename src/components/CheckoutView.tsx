"use client";

import { useEffect, useRef, useReducer } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { STORE_INDEX_HREF } from "@/data/products";
import { buildOrderDraft, buildOrderRequestMailto } from "@/data/orders";
import type { OrderCustomer, OrderDraft } from "@/data/orders";
import { validateOrderDraft } from "@/data/orders.validate";
import { calculateCartSubtotal } from "@/data/cart-pricing";
import { formatMoney } from "@/data/money";
import type { CartItem } from "@/data/cart";
import { useCart } from "./CartProvider";
import CheckoutCustomerForm from "./CheckoutCustomerForm";
import OrderReview from "./OrderReview";
import CheckoutPaymentStep, { type PaymentInitStatus } from "./CheckoutPaymentStep";

const CHECKOUT_STORAGE_KEY = "brcp-checkout";
export const CHECKOUT_SCHEMA_VERSION = 2;

// Phase 21C-2C — a single, fixed, customer-safe message for every
// payment-initialization/resume failure (404/429/503/network/anything
// else) — the customer is never told which internal reason applied,
// matching the server's own generic-error design (see CLAUDE.md "Stripe
// PaymentIntent Creation (Phase 21C-2B)").
const GENERIC_PAYMENT_ERROR_MESSAGE =
  "We couldn't set up payment for this order right now. Please try again, or email us directly below.";

type CheckoutStep = "details" | "review" | "payment" | "submitted";

type OrderResult = { id: string; orderNumber: string; status: string };

const emptyCustomer: OrderCustomer = { firstName: "", lastName: "", email: "", phone: "", company: "" };

const initialPaymentInit: PaymentInitStatus = { kind: "idle" };

export type CheckoutState = {
  step: CheckoutStep;
  customer: OrderCustomer;
  notes: string;
  errors: string[];
  draft: OrderDraft | null;
  // Idempotency key for POST /api/orders — see src/app/api/orders/route.ts
  // and src/server/create-order.ts. Generated once per checkout session and
  // persisted so it survives a refresh (a retried submit with the same key
  // returns the original order instead of creating a duplicate).
  clientRequestId: string;
  isSubmitting: boolean;
  submissionError: string | null;
  orderResult: OrderResult | null;
  // --- Phase 21C-2C — Stripe payment step ---------------------------------
  // paymentAccessToken is MEMORY-ONLY — never written to sessionStorage,
  // localStorage, any log, or any URL. It authorizes exactly one thing:
  // POST /api/orders/[id]/payment-intent for this one order. See CLAUDE.md
  // "Stripe Payment UI (Phase 21C-2C)" for the full lifecycle design.
  paymentAccessToken: string | null;
  // Safe, non-secret recovery metadata — approved for sessionStorage
  // persistence. Lets a refresh mid-payment know there's a pending order to
  // resume, without ever persisting the token/secret themselves.
  pendingOrderId: string | null;
  pendingOrderNumber: string | null;
  // clientSecret lives only inside paymentInit ({kind:"ready",clientSecret})
  // — memory-only, never persisted, never logged, never audited. Handed
  // directly to Stripe's <Elements> and read nowhere else.
  paymentInit: PaymentInitStatus;
  // Set only after Stripe's own confirmPayment() resolves without an
  // error — a CLIENT-SIDE signal only. NEVER authoritative proof of a
  // completed payment; the real paymentStatus="paid" transition happens
  // exclusively via a future, verified Stripe webhook (Phase 21C-2D). This
  // flag only controls which safe wording the "submitted" screen shows.
  paymentConfirmed: boolean;
};

export const initialCheckoutState: CheckoutState = {
  step: "details",
  customer: emptyCustomer,
  notes: "",
  errors: [],
  draft: null,
  clientRequestId: "",
  isSubmitting: false,
  submissionError: null,
  orderResult: null,
  paymentAccessToken: null,
  pendingOrderId: null,
  pendingOrderNumber: null,
  paymentInit: initialPaymentInit,
  paymentConfirmed: false,
};

export type CheckoutAction =
  | { type: "SET_CUSTOMER"; customer: OrderCustomer }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_ERRORS"; errors: string[] }
  | { type: "GO_TO_REVIEW"; draft: OrderDraft }
  | { type: "GO_TO_DETAILS" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; result: OrderResult; paymentAccessToken?: string }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "PAYMENT_INIT_START" }
  | { type: "PAYMENT_INIT_SUCCESS"; clientSecret: string }
  | { type: "PAYMENT_INIT_ERROR"; message: string }
  | { type: "SET_PAYMENT_TOKEN"; token: string }
  | { type: "PAYMENT_CONFIRMED" }
  | { type: "PAYMENT_REDIRECT_RETURNED" }
  | {
      type: "HYDRATE";
      state: Pick<CheckoutState, "step" | "customer" | "notes" | "clientRequestId" | "pendingOrderId" | "pendingOrderNumber">;
    };

// Exported (in addition to the component below) so the reducer and
// sessionStorage persistence logic can be unit-tested directly, mirroring
// how CartProvider's reducer/persistence functions are exported.
export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "SET_CUSTOMER":
      return { ...state, customer: action.customer };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "GO_TO_REVIEW":
      return { ...state, errors: [], draft: action.draft, step: "review", submissionError: null };
    case "GO_TO_DETAILS":
      return { ...state, step: "details" };
    case "SUBMIT_START":
      return { ...state, isSubmitting: true, submissionError: null };
    case "SUBMIT_SUCCESS": {
      if (action.paymentAccessToken) {
        // Stripe-eligible order — route into the new payment step instead
        // of the old "submitted" screen. The cart is deliberately NOT
        // cleared here (see handleSubmit()) — it stays intact until
        // payment is actually submitted, which is what lets a refresh
        // mid-payment reconstruct the same order request (see
        // resumePendingPayment() below) without needing to persist
        // anything beyond the approved pendingOrderId/pendingOrderNumber.
        return {
          ...state,
          isSubmitting: false,
          submissionError: null,
          step: "payment",
          orderResult: action.result,
          paymentAccessToken: action.paymentAccessToken,
          pendingOrderId: action.result.id,
          pendingOrderNumber: action.result.orderNumber,
          paymentInit: initialPaymentInit,
        };
      }
      // Non-Stripe-eligible order — today's exact, unchanged behavior.
      return { ...state, isSubmitting: false, step: "submitted", orderResult: action.result, submissionError: null };
    }
    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, submissionError: action.error };
    case "PAYMENT_INIT_START":
      return { ...state, paymentInit: { kind: "loading" } };
    case "PAYMENT_INIT_SUCCESS":
      return { ...state, paymentInit: { kind: "ready", clientSecret: action.clientSecret } };
    case "PAYMENT_INIT_ERROR":
      return { ...state, paymentInit: { kind: "error", message: action.message } };
    case "SET_PAYMENT_TOKEN":
      return { ...state, paymentAccessToken: action.token };
    case "PAYMENT_CONFIRMED":
      return {
        ...state,
        step: "submitted",
        paymentConfirmed: true,
        paymentAccessToken: null,
        paymentInit: initialPaymentInit,
      };
    case "PAYMENT_REDIRECT_RETURNED":
      // Reached only via Stripe's own return_url redirect (an edge case
      // given the card-only + redirect:"if_required" configuration — see
      // CLAUDE.md "Stripe Payment UI (Phase 21C-2C)"). Treated identically
      // to a normal in-page confirmation: the same safe wording, never a
      // different or more confident claim merely because a redirect
      // occurred.
      return { ...state, step: "submitted", paymentConfirmed: true, paymentAccessToken: null, paymentInit: initialPaymentInit };
    case "HYDRATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

export type PersistedCheckoutState = {
  version: number;
  step: CheckoutStep;
  customer: OrderCustomer;
  notes: string;
  // Optional only for backward compatibility with sessionStorage data
  // written before this field existed — a missing value just means a fresh
  // one gets generated on hydration.
  clientRequestId?: string;
  // Phase 21C-2C — approved, non-secret recovery metadata. NEVER
  // paymentAccessToken, NEVER clientSecret — see CheckoutState's own doc
  // comments for why.
  pendingOrderId?: string;
  pendingOrderNumber?: string;
};

export function isValidPersistedState(value: unknown): value is PersistedCheckoutState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  const customer = state.customer as Record<string, unknown> | undefined;
  return (
    state.version === CHECKOUT_SCHEMA_VERSION &&
    typeof state.step === "string" &&
    ["details", "review", "payment", "submitted"].includes(state.step) &&
    !!customer &&
    typeof customer.firstName === "string" &&
    typeof customer.lastName === "string" &&
    typeof customer.email === "string" &&
    typeof state.notes === "string" &&
    (state.pendingOrderId === undefined || typeof state.pendingOrderId === "string") &&
    (state.pendingOrderNumber === undefined || typeof state.pendingOrderNumber === "string")
  );
}

// Session-scoped, and deliberately separate from the cart's localStorage:
// an in-progress checkout draft should not silently reappear days later the
// way the cart is meant to. Not permanent order storage — real orders live
// in the database once submitted (see CLAUDE.md "Backend + database
// foundation"), which is also why reaching a final "submitted" state clears
// this entirely rather than persisting a stale snapshot here.
export function loadPersistedCheckout(): PersistedCheckoutState | null {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed)) {
      console.warn("Discarding incompatible checkout data found in sessionStorage.");
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to read checkout draft from sessionStorage; starting fresh.", error);
    return null;
  }
}

function persistCheckout(state: PersistedCheckoutState): void {
  try {
    window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to save checkout draft to sessionStorage.", error);
  }
}

function clearPersistedCheckout(): void {
  try {
    window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear checkout draft from sessionStorage.", error);
  }
}

// Shapes a cart line back down into the raw configuration POST /api/orders
// expects — product id, quantity, and the selected package/option/add-on
// identifiers. Deliberately does NOT send unitPrice/lineSubtotal/anything
// price-related: the server recomputes every price itself from the
// authoritative product definition and never trusts a client-submitted
// number. See src/app/api/orders/route.ts.
function cartItemToOrderLineRequest(item: CartItem) {
  return {
    productId: item.productId,
    quantity: item.quantity,
    selectedPackageSlug: item.selectedPackage?.packageSlug,
    selectedOptionValues: Object.fromEntries(item.selectedOptions.map((option) => [option.optionKey, option.value])),
    selectedAddOnSlugs: item.selectedAddOns.map((addOn) => addOn.addOnSlug),
  };
}

export default function CheckoutView() {
  const { items, clearCart } = useCart();
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  const isFirstPersistRun = useRef(true);
  // Bounded, per-order guard — ensures at most ONE automatic
  // payment-initialization attempt per order (whether via the fresh-token
  // path or the refresh-recovery path). A manual Retry click always calls
  // resumePendingPayment() directly, bypassing this guard entirely, since
  // that is an explicit customer action, never automatic looping.
  const autoAttemptedOrderId = useRef<string | null>(null);

  // Same hydration-safe pattern as CartProvider: state starts at its
  // deterministic default on both the server render and the first client
  // render, then this effect (browser-only, post-mount) restores whatever
  // was persisted for this tab's session — or, for clientRequestId, mints a
  // fresh one if none existed yet.
  useEffect(() => {
    const persisted = loadPersistedCheckout();
    dispatch({
      type: "HYDRATE",
      state: {
        step: persisted?.step ?? initialCheckoutState.step,
        customer: persisted?.customer ?? initialCheckoutState.customer,
        notes: persisted?.notes ?? initialCheckoutState.notes,
        clientRequestId: persisted?.clientRequestId || crypto.randomUUID(),
        pendingOrderId: persisted?.pendingOrderId ?? null,
        pendingOrderNumber: persisted?.pendingOrderNumber ?? null,
      },
    });
  }, []);

  // Phase 21C-2C — Stripe's own return_url redirect detection. Reached
  // only for a payment method/flow that required a full-page redirect —
  // an edge case given the card-only + redirect:"if_required"
  // configuration (see CheckoutPaymentStep.tsx), but the contract must
  // still be handled correctly. Reads window.location directly (not
  // Next.js's useSearchParams()) so no Suspense boundary is required and
  // /checkout can stay a statically-rendered page. These query parameters
  // — including, unavoidably, a client_secret value Stripe itself appends
  // for redirect-based confirmations — are DISPLAY/RECOVERY INPUTS ONLY,
  // never treated as authoritative proof of payment; arriving here at all
  // is sufficient to show the same safe "confirming" wording used for the
  // in-page path. The URL is cleaned immediately so the params (including
  // that client_secret) don't linger in the address bar/history longer
  // than necessary, and so a subsequent refresh of this same page doesn't
  // keep re-detecting them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasStripeRedirectParams =
      params.has("payment_intent") || params.has("payment_intent_client_secret") || params.has("redirect_status");
    if (!hasStripeRedirectParams) return;
    window.history.replaceState(null, "", window.location.pathname);
    dispatch({ type: "PAYMENT_REDIRECT_RETURNED" });
  }, []);

  useEffect(() => {
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }
    // A final state was reached (paid path or the old non-Stripe path) —
    // nothing left to resume, so the persisted draft is cleared entirely
    // rather than kept around.
    if (state.step === "submitted") {
      clearPersistedCheckout();
      return;
    }
    persistCheckout({
      version: CHECKOUT_SCHEMA_VERSION,
      step: state.step,
      customer: state.customer,
      notes: state.notes,
      clientRequestId: state.clientRequestId,
      pendingOrderId: state.pendingOrderId ?? undefined,
      pendingOrderNumber: state.pendingOrderNumber ?? undefined,
    });
  }, [state.step, state.customer, state.notes, state.clientRequestId, state.pendingOrderId, state.pendingOrderNumber]);

  // Phase 21C-2C — the one place POST /api/orders/[id]/payment-intent is
  // called. Used both for the very first attempt (fresh token, just
  // obtained) and, indirectly, by resumePendingPayment() below (after a
  // fresh token has been re-obtained). A failure here is ALWAYS terminal
  // for this specific automatic attempt — it never chains into a further
  // automatic retry of any kind; only an explicit customer Retry click
  // (which calls resumePendingPayment(), never this function directly)
  // tries again.
  async function initializePaymentIntent(orderId: string, token: string) {
    dispatch({ type: "PAYMENT_INIT_START" });
    try {
      const response = await fetch(`/api/orders/${orderId}/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAccessToken: token }),
      });
      const body = await response.json().catch(() => null);
      if ((response.status === 201 || response.status === 200) && typeof body?.clientSecret === "string") {
        dispatch({ type: "PAYMENT_INIT_SUCCESS", clientSecret: body.clientSecret });
        return;
      }
      // Every non-success status (404/409/429/503/anything else) — per
      // the approved failure matrix: stop, surface one generic message,
      // require an explicit Retry click. Never distinguish why for the
      // customer.
      dispatch({ type: "PAYMENT_INIT_ERROR", message: GENERIC_PAYMENT_ERROR_MESSAGE });
    } catch {
      dispatch({ type: "PAYMENT_INIT_ERROR", message: GENERIC_PAYMENT_ERROR_MESSAGE });
    }
  }

  // Phase 21C-2C — the full bounded recovery chain: re-POST /api/orders
  // with the SAME persisted clientRequestId (idempotent — returns the
  // SAME order plus a freshly-rotated paymentAccessToken, per the exact
  // mechanism Phase 21C-2B built for this), then retry the payment-intent
  // call once. Used for two distinct triggers: (a) an explicit customer
  // Retry click after ANY payment-init failure, and (b) at most once,
  // automatically, when a real page refresh wiped the in-memory token but
  // sessionStorage remembered a pending order (gated by
  // autoAttemptedOrderId so it can never loop). Reuses `items` from the
  // cart — deliberately NOT cleared until payment is actually confirmed
  // (see handleSubmit()) specifically so this reconstruction never needs
  // to persist line-item data beyond the three approved sessionStorage
  // fields.
  async function resumePendingPayment() {
    if (!state.pendingOrderId) return;
    dispatch({ type: "PAYMENT_INIT_START" });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId: state.clientRequestId,
          customer: state.customer,
          notes: state.notes.trim() ? state.notes.trim() : undefined,
          lines: items.map(cartItemToOrderLineRequest),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.paymentAccessToken !== "string" || typeof body?.id !== "string") {
        dispatch({ type: "PAYMENT_INIT_ERROR", message: GENERIC_PAYMENT_ERROR_MESSAGE });
        return;
      }
      dispatch({ type: "SET_PAYMENT_TOKEN", token: body.paymentAccessToken });
      await initializePaymentIntent(body.id, body.paymentAccessToken);
    } catch {
      dispatch({ type: "PAYMENT_INIT_ERROR", message: GENERIC_PAYMENT_ERROR_MESSAGE });
    }
  }

  // Bounded automatic entry into payment initialization — fires at most
  // once per order id (autoAttemptedOrderId guard). Two paths:
  //  - fresh order, token already in memory -> initializePaymentIntent directly
  //  - refresh-recovery, token gone but a pending order was persisted ->
  //    resumePendingPayment() (itself bounded to one attempt by this guard)
  // Neither path is reachable again automatically once paymentInit leaves
  // "idle" (loading/ready/error) for this order — only an explicit Retry
  // click calls resumePendingPayment() again afterward.
  useEffect(() => {
    if (state.step !== "payment") return;
    if (!state.pendingOrderId) return;
    if (state.paymentInit.kind !== "idle") return;
    if (autoAttemptedOrderId.current === state.pendingOrderId) return;

    if (state.paymentAccessToken) {
      autoAttemptedOrderId.current = state.pendingOrderId;
      void initializePaymentIntent(state.pendingOrderId, state.paymentAccessToken);
      return;
    }

    // Refresh-recovery path — wait for CartProvider's own localStorage
    // hydration to populate `items` before attempting (it starts at []
    // on first render, same hydration-safe pattern as this component's
    // own state).
    if (items.length === 0) return;
    autoAttemptedOrderId.current = state.pendingOrderId;
    void resumePendingPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.pendingOrderId, state.paymentAccessToken, state.paymentInit.kind, items]);

  // Cart is intentionally empty on "payment" too during a legitimate
  // refresh-recovery window right after CartProvider's own hydration
  // effect runs but before this component's resume attempt completes —
  // never show the generic empty-cart screen while a payment/resume
  // attempt is in flight or pending.
  if (items.length === 0 && state.step !== "submitted" && state.step !== "payment") {
    return (
      <div className="store-empty">
        <p className="store-empty-heading">Your cart is empty.</p>
        <p>Add something from the store before checking out.</p>
        <Link href={STORE_INDEX_HREF} className="cart-continue-shopping">
          Continue shopping →
        </Link>
      </div>
    );
  }

  function handleReview() {
    const previewDraft = buildOrderDraft(items, state.customer, state.notes);
    const validationErrors = validateOrderDraft(previewDraft);
    if (validationErrors.length > 0) {
      dispatch({ type: "SET_ERRORS", errors: validationErrors });
      return;
    }
    dispatch({ type: "GO_TO_REVIEW", draft: previewDraft });
  }

  // Primary submission path: POST the raw configuration to the server,
  // which re-verifies and re-prices everything before persisting it. The
  // client-side `draft` built by handleReview() above is only ever a
  // preview for the review screen — it is never what gets saved.
  async function handleSubmit() {
    if (state.isSubmitting) return;
    dispatch({ type: "SUBMIT_START" });

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId: state.clientRequestId,
          customer: state.customer,
          notes: state.notes.trim() ? state.notes.trim() : undefined,
          lines: items.map(cartItemToOrderLineRequest),
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        dispatch({
          type: "SUBMIT_ERROR",
          error:
            body?.error ??
            "We couldn't submit your order request. Please try again, or email us directly below.",
        });
        return;
      }

      const paymentAccessToken: string | undefined =
        typeof body?.paymentAccessToken === "string" ? body.paymentAccessToken : undefined;

      dispatch({
        type: "SUBMIT_SUCCESS",
        result: { id: body.id, orderNumber: body.orderNumber, status: body.status },
        paymentAccessToken,
      });

      // Phase 21C-2C — the cart is cleared here ONLY for the non-Stripe
      // path (unchanged from before). For a Stripe-eligible order, the
      // cart stays intact until payment is actually confirmed
      // (handlePaymentConfirmed() below) — this is what lets a refresh
      // mid-payment reconstruct the same order request via `items` alone,
      // without needing to persist any line-item data to sessionStorage.
      if (!paymentAccessToken) {
        clearCart();
      }
    } catch {
      dispatch({
        type: "SUBMIT_ERROR",
        error: "We couldn't reach the server. Please check your connection and try again, or email us directly below.",
      });
    }
  }

  function handlePaymentConfirmed() {
    dispatch({ type: "PAYMENT_CONFIRMED" });
    clearCart();
  }

  if (state.step === "details") {
    return (
      <CheckoutCustomerForm
        customer={state.customer}
        notes={state.notes}
        errors={state.errors}
        onChange={(customer) => dispatch({ type: "SET_CUSTOMER", customer })}
        onNotesChange={(notes) => dispatch({ type: "SET_NOTES", notes })}
        onSubmit={handleReview}
      />
    );
  }

  if (state.step === "review" && state.draft) {
    const { draft } = state;
    return (
      <div className="checkout-review-step">
        <OrderReview draft={draft} />
        {state.submissionError && (
          <p className="checkout-submit-error" role="alert">
            {state.submissionError}
          </p>
        )}
        <div className="checkout-review-actions">
          <button
            type="button"
            className="checkout-secondary-button"
            onClick={() => dispatch({ type: "GO_TO_DETAILS" })}
            disabled={state.isSubmitting}
          >
            Back
          </button>
          <button type="button" className="checkout-submit-button" onClick={handleSubmit} disabled={state.isSubmitting}>
            {state.isSubmitting ? "Submitting…" : "Submit Order Request"}
          </button>
        </div>
        {/* Secondary fallback, always available — not the primary
            submission method. A real mailto link, not a JS redirect. */}
        <p className="checkout-fallback-note">
          Prefer email? You can{" "}
          <a href={buildOrderRequestMailto(draft)}>send this request to {siteConfig.email}</a> instead.
        </p>
      </div>
    );
  }

  if (state.step === "payment") {
    // Amount label derived from `items` directly (via the same
    // calculateCartSubtotal() helper CartSummary already uses), NOT from
    // state.draft — state.draft is never restored across a refresh (it
    // was never persisted to sessionStorage in the first place), so
    // depending on it here would leave the payment step unable to render
    // anything during a legitimate refresh-recovery window. `items`, by
    // contrast, survives via CartProvider's own localStorage persistence.
    const amountLabel = formatMoney(calculateCartSubtotal(items));
    const fallbackNote = (
      <p className="checkout-fallback-note">
        Prefer email? You can <a href={`mailto:${siteConfig.email}`}>contact us at {siteConfig.email}</a> instead.
      </p>
    );
    return (
      <div className="checkout-payment-wrapper">
        {state.pendingOrderNumber && <p className="checkout-payment-order-label">Order {state.pendingOrderNumber}</p>}
        <CheckoutPaymentStep
          amountLabel={amountLabel}
          paymentInit={state.paymentInit}
          onRetry={() => void resumePendingPayment()}
          onConfirmed={handlePaymentConfirmed}
          fallbackNote={fallbackNote}
        />
      </div>
    );
  }

  if (state.step === "submitted") {
    if (state.paymentConfirmed) {
      return (
        <div className="checkout-submitted">
          <p className="checkout-submitted-heading" aria-live="polite">
            {state.pendingOrderNumber ? `Order ${state.pendingOrderNumber}` : "Your order"} — payment submitted.
          </p>
          <p className="checkout-submitted-warning">
            Payment submitted. We&apos;re confirming your payment — you&apos;ll receive a follow-up once it&apos;s
            fully processed. No further action is needed right now.
          </p>
          {/* hidePaymentNote — a real payment attempt now exists for this
              order, so OrderReview's own default "no payment is being
              collected" note (accurate before this point) would be stale
              and self-contradictory directly beneath the message above. */}
          {state.draft && <OrderReview draft={state.draft} hidePaymentNote />}
          <Link href={STORE_INDEX_HREF} className="cart-continue-shopping">
            Continue shopping →
          </Link>
        </div>
      );
    }

    if (state.orderResult && state.draft) {
      const { draft, orderResult } = state;
      return (
        <div className="checkout-submitted">
          <p className="checkout-submitted-heading" aria-live="polite">
            Order {orderResult.orderNumber} received.
          </p>
          <p>
            Thanks, {draft.customer.firstName} — we&apos;ve received your order request and will follow up at{" "}
            {draft.customer.email}.
          </p>
          {orderResult.status === "needs-review" && (
            <p className="checkout-submitted-warning">
              This order includes starting-price items, so we&apos;ll confirm final pricing with you before work
              begins.
            </p>
          )}
          <p className="checkout-submitted-warning">No payment has been collected yet.</p>
          <OrderReview draft={draft} />
          <Link href={STORE_INDEX_HREF} className="cart-continue-shopping">
            Continue shopping →
          </Link>
        </div>
      );
    }
  }

  return null;
}
