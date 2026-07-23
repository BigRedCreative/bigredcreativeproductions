"use client";

import { useEffect, useReducer, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { STORE_INDEX_HREF } from "@/data/products";
import { buildOrderDraft, buildOrderRequestMailto } from "@/data/orders";
import type { OrderCustomer, OrderDraft } from "@/data/orders";
import { validateOrderDraft } from "@/data/orders.validate";
import type { CartItem } from "@/data/cart";
import { useCart } from "./CartProvider";
import CheckoutCustomerForm from "./CheckoutCustomerForm";
import OrderReview from "./OrderReview";

const CHECKOUT_STORAGE_KEY = "brcp-checkout";
export const CHECKOUT_SCHEMA_VERSION = 1;

type CheckoutStep = "details" | "review" | "submitted";

type OrderResult = { id: string; orderNumber: string; status: string };

const emptyCustomer: OrderCustomer = { firstName: "", lastName: "", email: "", phone: "", company: "" };

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
};

export type CheckoutAction =
  | { type: "SET_CUSTOMER"; customer: OrderCustomer }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_ERRORS"; errors: string[] }
  | { type: "GO_TO_REVIEW"; draft: OrderDraft }
  | { type: "GO_TO_DETAILS" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; result: OrderResult }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "HYDRATE"; state: Pick<CheckoutState, "step" | "customer" | "notes" | "clientRequestId"> };

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
    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false, step: "submitted", orderResult: action.result, submissionError: null };
    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, submissionError: action.error };
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
};

export function isValidPersistedState(value: unknown): value is PersistedCheckoutState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  const customer = state.customer as Record<string, unknown> | undefined;
  return (
    state.version === CHECKOUT_SCHEMA_VERSION &&
    typeof state.step === "string" &&
    ["details", "review", "submitted"].includes(state.step) &&
    !!customer &&
    typeof customer.firstName === "string" &&
    typeof customer.lastName === "string" &&
    typeof customer.email === "string" &&
    typeof state.notes === "string"
  );
}

// Session-scoped, and deliberately separate from the cart's localStorage:
// an in-progress checkout draft should not silently reappear days later the
// way the cart is meant to. Not permanent order storage — real orders live
// in the database once submitted (see CLAUDE.md "Backend + database
// foundation"), which is also why a confirmed submission clears this
// entirely rather than persisting a "submitted" snapshot here.
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
      },
    });
  }, []);

  useEffect(() => {
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }
    // A confirmed order was created server-side — the cart and this draft
    // are done, not something to keep re-persisting on every render.
    if (state.orderResult) {
      clearPersistedCheckout();
      return;
    }
    persistCheckout({
      version: CHECKOUT_SCHEMA_VERSION,
      step: state.step,
      customer: state.customer,
      notes: state.notes,
      clientRequestId: state.clientRequestId,
    });
  }, [state.step, state.customer, state.notes, state.clientRequestId, state.orderResult]);

  if (items.length === 0 && state.step !== "submitted") {
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

      dispatch({
        type: "SUBMIT_SUCCESS",
        result: { id: body.id, orderNumber: body.orderNumber, status: body.status },
      });
      clearCart();
    } catch {
      dispatch({
        type: "SUBMIT_ERROR",
        error: "We couldn't reach the server. Please check your connection and try again, or email us directly below.",
      });
    }
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

  if (state.step === "submitted" && state.orderResult && state.draft) {
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

  return null;
}
