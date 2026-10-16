"use client";

/**
 * A shopping cart for sites that sell several products. Import and use it; do not rewrite it.
 * No provider is needed: the cart is shared by every component and kept in localStorage.
 *
 *   <AddToCartButton product="Gift Box" />        add one (again to add more)
 *   const { lines, count, total, setQuantity, remove } = useCart();   build a cart drawer/page
 *   <CheckoutButton />                            pays for the whole cart inside the site
 *
 * Donations (customer-chosen amounts) can't go in the cart: sell them with <BuyButton>.
 * The cart is cleared automatically after a verified payment.
 */

import {
  findPayment,
  formatAmount,
  inSiteCheckout,
  paymentsTestMode,
  type Interval,
} from "../../lib/payments";
import CheckoutRoot from "./checkout/CheckoutRoot";
import { getCart, openCheckout, setCart, useCartLines, type CartLine } from "./checkout/store";

export type { CartLine };

export function useCart() {
  const lines = useCartLines();
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const currency = lines[0]?.currency ?? "usd";
  const total = lines.reduce((sum, l) => sum + l.amount * l.quantity, 0);

  function setQuantity(priceId: string, quantity: number) {
    const q = Math.max(0, Math.min(99, Math.floor(quantity)));
    setCart(
      getCart()
        .map((l) => (l.price_id === priceId ? { ...l, quantity: q } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  return {
    lines,
    count,
    total,
    currency,
    /** "$58.00" */
    totalLabel: formatAmount(total, currency),
    add: addToCart,
    setQuantity,
    remove: (priceId: string) => setQuantity(priceId, 0),
    clear: () => setCart([]),
  };
}

/** Adds a product; returns false when it can't be added (unknown, donation, other currency). */
export function addToCart(product: string, options: { interval?: Interval; quantity?: number } = {}): boolean {
  const item = findPayment(product, options.interval);
  if (!item || item.custom_amount || item.amount == null) return false;
  const lines = getCart();
  if (lines.length && lines[0].currency !== item.currency) return false;
  const qty = Math.max(1, Math.floor(options.quantity ?? 1));
  const existing = lines.find((l) => l.price_id === item.price_id);
  setCart(
    existing
      ? lines.map((l) => (l === existing ? { ...l, quantity: Math.min(99, l.quantity + qty) } : l))
      : [
          ...lines,
          {
            price_id: item.price_id,
            name: item.name,
            amount: item.amount,
            currency: item.currency,
            interval: item.interval ?? null,
            quantity: Math.min(99, qty),
          },
        ],
  );
  return true;
}

type AddProps = {
  product: string;
  interval?: Interval;
  quantity?: number;
  label?: string;
  className?: string;
};

export function AddToCartButton({ product, interval, quantity, label, className }: AddProps) {
  const item = findPayment(product, interval);
  const usable = Boolean(item && !item.custom_amount && item.amount != null && inSiteCheckout);
  return (
    <button
      type="button"
      className={className}
      disabled={!usable}
      aria-disabled={!usable}
      title={usable ? undefined : "Payments are not set up yet"}
      onClick={() => addToCart(product, { interval, quantity })}
    >
      {label ?? (usable ? "Add to cart" : "Coming soon")}
    </button>
  );
}

export function CheckoutButton({ label, className }: { label?: string; className?: string }) {
  const lines = useCartLines();
  const empty = lines.length === 0;
  return (
    <>
      <CheckoutRoot />
      <button
        type="button"
        className={className}
        disabled={empty || !inSiteCheckout}
        onClick={() => openCheckout(lines.map((l) => ({ price_id: l.price_id, quantity: l.quantity })))}
      >
        {label ?? "Checkout"}
        {paymentsTestMode ? " (test mode)" : ""}
      </button>
    </>
  );
}
