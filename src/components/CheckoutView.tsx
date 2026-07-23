"use client";

import { useEffect, useReducer, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { STORE_INDEX_HREF } from "@/data/products";
import { buildOrderDraft, buildOrderRequestMailto, buildOrderRequestSummary } from "@/data/orders";
import type { OrderCustomer, OrderDraft } from "@/data/orders";
import { validateOrderDraft } from "@/data/orders.validate";
import { useCart } from "./CartProvider";
import CheckoutCustomerForm from "./CheckoutCustomerForm";
import OrderReview from "./OrderReview";

const CHECKOUT_STORAGE_KEY = "brcp-checkout";
export const CHECKOUT_SCHEMA_VERSION = 1;

type CheckoutStep = "details" | "review" | "submitted";

const emptyCustomer: OrderCustomer = { firstName: "", lastName: "", email: "", phone: "", company: "" };

export type CheckoutState = {
  step: CheckoutStep;
  customer: OrderCustomer;
  notes: string;
  errors: string[];
  draft: OrderDraft | null;
};

export const initialCheckoutState: CheckoutState = {
  step: "details",
  customer: emptyCustomer,
  notes: "",
  errors: [],
  draft: null,
};

export type CheckoutAction =
  | { type: "SET_CUSTOMER"; customer: OrderCustomer }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_ERRORS"; errors: string[] }
  | { type: "GO_TO_REVIEW"; draft: OrderDraft }
  | { type: "GO_TO_DETAILS" }
  | { type: "SUBMITTED" }
  | { type: "HYDRATE"; state: Pick<CheckoutState, "step" | "customer" | "notes" | "draft"> };

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
      return { ...state, errors: [], draft: action.draft, step: "review" };
    case "GO_TO_DETAILS":
      return { ...state, step: "details" };
    case "SUBMITTED":
      return { ...state, step: "submitted" };
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
  // Only ever set once a request has actually been submitted — a frozen
  // historical record, not something rebuilt from a possibly-changed cart.
  submittedDraft?: OrderDraft;
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
// an in-progress or already-submitted checkout draft should not silently
// reappear days later the way the cart is meant to. Not permanent order
// storage — see CLAUDE.md.
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

export default function CheckoutView() {
  const { items } = useCart();
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  const isFirstPersistRun = useRef(true);

  // Same hydration-safe pattern as CartProvider: state starts at its
  // deterministic default on both the server render and the first client
  // render, then this effect (browser-only, post-mount) restores whatever
  // was persisted for this tab's session.
  useEffect(() => {
    const persisted = loadPersistedCheckout();
    if (!persisted) return;
    dispatch({
      type: "HYDRATE",
      state: {
        step: persisted.step,
        customer: persisted.customer,
        notes: persisted.notes,
        draft: persisted.step === "submitted" ? (persisted.submittedDraft ?? null) : null,
      },
    });
  }, []);

  useEffect(() => {
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }
    persistCheckout({
      version: CHECKOUT_SCHEMA_VERSION,
      step: state.step,
      customer: state.customer,
      notes: state.notes,
      submittedDraft: state.step === "submitted" ? (state.draft ?? undefined) : undefined,
    });
  }, [state.step, state.customer, state.notes, state.draft]);

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
        <div className="checkout-review-actions">
          <button type="button" className="checkout-secondary-button" onClick={() => dispatch({ type: "GO_TO_DETAILS" })}>
            Back
          </button>
          {/* A real mailto link, not a JS redirect — visible/inspectable
              href, works with keyboard/right-click, and matches how
              ContactForm's own mailto-based submission already behaves. */}
          <a
            href={buildOrderRequestMailto(draft)}
            className="checkout-submit-button"
            onClick={() => dispatch({ type: "SUBMITTED" })}
          >
            Submit Order Request
          </a>
        </div>
      </div>
    );
  }

  if (state.step === "submitted" && state.draft) {
    const { draft } = state;
    return (
      <div className="checkout-submitted">
        <p className="checkout-submitted-heading" aria-live="polite">
          Your order request has been prepared.
        </p>
        <p>Your email app should open with the request filled in. Please send the email to complete your request.</p>
        <p className="checkout-submitted-warning">
          No payment has been collected and this request is not yet stored in our order system.
        </p>
        <p>
          If your email app didn&apos;t open, send your request manually to{" "}
          <a href={buildOrderRequestMailto(draft)}>{siteConfig.email}</a> — reference id {draft.id}. You can
          also copy the request text below directly.
        </p>
        <textarea
          className="checkout-submitted-summary"
          readOnly
          value={buildOrderRequestSummary(draft)}
          aria-label="Order request text — copy this if your email app did not open"
        />
        <OrderReview draft={draft} />
        <Link href={STORE_INDEX_HREF} className="cart-continue-shopping">
          Continue shopping →
        </Link>
      </div>
    );
  }

  return null;
}
