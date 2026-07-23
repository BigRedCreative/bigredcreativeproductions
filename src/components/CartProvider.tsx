"use client";

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import type { CartItem, CartState } from "@/data/cart";
import { CART_SCHEMA_VERSION, getConfigurationSignature } from "@/data/cart";

const STORAGE_KEY = "brcp-cart";

type CartAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; cartLineId: string }
  | { type: "UPDATE_QUANTITY"; cartLineId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; items: CartItem[] };

const initialState: CartState = { items: [] };

// Exported (in addition to the component/hook below) so the reducer and
// persistence logic can be unit-tested directly, independent of React.
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const signature = getConfigurationSignature(action.item);
      const existingIndex = state.items.findIndex(
        (item) => getConfigurationSignature(item) === signature,
      );
      if (existingIndex !== -1) {
        const items = [...state.items];
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: items[existingIndex].quantity + action.item.quantity,
        };
        return { items };
      }
      return { items: [...state.items, action.item] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((item) => item.cartLineId !== action.cartLineId) };
    case "UPDATE_QUANTITY":
      return {
        items: state.items.map((item) =>
          item.cartLineId === action.cartLineId
            ? { ...item, quantity: Math.max(1, Math.floor(action.quantity)) }
            : item,
        ),
      };
    case "CLEAR_CART":
      return { items: [] };
    case "HYDRATE":
      return { items: action.items };
    default:
      return state;
  }
}

export function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.cartLineId === "string" &&
    typeof item.productId === "string" &&
    typeof item.productSlug === "string" &&
    typeof item.productTitle === "string" &&
    typeof item.productType === "string" &&
    typeof item.purchaseMode === "string" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    Array.isArray(item.selectedOptions) &&
    Array.isArray(item.selectedAddOns) &&
    typeof item.unitPrice === "number" &&
    typeof item.addedAt === "string"
  );
}

// Reads and validates whatever is in localStorage. Any shape mismatch,
// version mismatch, or parse failure discards the WHOLE persisted cart
// rather than trusting a partially-corrupt one — logged, never thrown.
export function loadPersistedCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as Record<string, unknown>).version !== CART_SCHEMA_VERSION ||
      !Array.isArray((parsed as Record<string, unknown>).items)
    ) {
      console.warn("Discarding incompatible cart data found in localStorage.");
      return [];
    }

    const rawItems = (parsed as { items: unknown[] }).items;
    const items = rawItems.filter(isValidCartItem);
    if (items.length !== rawItems.length) {
      console.warn("Discarding malformed cart line(s) found in localStorage.");
    }
    return items;
  } catch (error) {
    console.warn("Failed to read cart from localStorage; starting with an empty cart.", error);
    return [];
  }
}

function persistCart(items: CartItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CART_SCHEMA_VERSION, items }));
  } catch (error) {
    console.warn("Failed to save cart to localStorage.", error);
  }
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  // Cart state starts empty on both the server render and the very first
  // client render, so there's no hydration mismatch. This effect only ever
  // runs in the browser, after mount, and loads whatever was persisted.
  const isFirstPersistRun = useRef(true);

  useEffect(() => {
    dispatch({ type: "HYDRATE", items: loadPersistedCart() });
  }, []);

  useEffect(() => {
    // Skip the run that fires immediately on mount (before HYDRATE has had
    // a chance to apply) so it never overwrites real persisted data with
    // the empty initial state.
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }
    persistCart(state.items);
  }, [state.items]);

  const value: CartContextValue = {
    items: state.items,
    addItem: (item) => dispatch({ type: "ADD_ITEM", item }),
    removeItem: (cartLineId) => dispatch({ type: "REMOVE_ITEM", cartLineId }),
    updateQuantity: (cartLineId, quantity) => dispatch({ type: "UPDATE_QUANTITY", cartLineId, quantity }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
