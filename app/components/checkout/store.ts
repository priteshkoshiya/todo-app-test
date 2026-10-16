/**
 * Shared state for checkout and the cart. Module-level stores (no React provider), so pay
 * controls work wherever they are placed.
 */

import { useSyncExternalStore } from "react";
import type { CheckoutLine } from "../../../lib/payments";

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// --- checkout requests --------------------------------------------------------------------

export type CheckoutRequest = {
  lines: CheckoutLine[];
  /** Stripe-hosted Payment Link to use if in-site checkout is unavailable (single item). */
  fallbackUrl?: string;
  id: number;
};

const checkoutStore = createStore<CheckoutRequest | null>(null);
let nextId = 1;
const LAST_LINES_KEY = "ai2me-last-checkout";

export function openCheckout(lines: CheckoutLine[], fallbackUrl?: string): void {
  try {
    sessionStorage.setItem(LAST_LINES_KEY, JSON.stringify({ lines, fallbackUrl }));
  } catch {
    /* storage unavailable: "Try again" after a failed payment just won't be offered */
  }
  checkoutStore.set({ lines, fallbackUrl, id: nextId++ });
}

export function closeCheckout(): void {
  checkoutStore.set(null);
}

/** The items of the last checkout started in this tab, to retry after a failed payment. */
export function lastCheckout(): { lines: CheckoutLine[]; fallbackUrl?: string } | null {
  try {
    const raw = sessionStorage.getItem(LAST_LINES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useCheckoutRequest(): CheckoutRequest | null {
  return useSyncExternalStore(checkoutStore.subscribe, checkoutStore.get, () => null);
}

// --- cart -------------------------------------------------------------------------------

export type CartLine = {
  price_id: string;
  name: string;
  /** Unit price, major units. */
  amount: number;
  currency: string;
  interval: string | null;
  quantity: number;
};

const CART_KEY = "ai2me-cart";
const EMPTY: CartLine[] = [];
const cartStore = createStore<CartLine[]>(EMPTY);
let cartLoaded = false;

function loadCart(): void {
  if (cartLoaded || typeof window === "undefined") return;
  cartLoaded = true;
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) cartStore.set(parsed);
  } catch {
    /* no storage: the cart lives for this page view only */
  }
}

export function setCart(lines: CartLine[]): void {
  cartStore.set(lines);
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

export function getCart(): CartLine[] {
  loadCart();
  return cartStore.get();
}

export function clearCart(): void {
  setCart(EMPTY);
}

export function useCartLines(): CartLine[] {
  return useSyncExternalStore(
    cartStore.subscribe,
    () => {
      loadCart();
      return cartStore.get();
    },
    () => EMPTY,
  );
}
