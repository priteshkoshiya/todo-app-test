"use client";

/**
 * Pay for one product, plan or donation. Import and use it; do not rewrite it.
 *
 *   <BuyButton product="Gift Box" />                       one-time product
 *   <BuyButton product="Gift Box" quantity={3} />          several of it
 *   <BuyButton product="Pro" interval="year" />            one plan's yearly price
 *   <BuyButton product="Support us" />                     donation: shows an amount picker
 *   <BuyButton product="Todo Pro" interval="month" onSignIn={() => router.push("/login")} />
 *                                                         plan on a site with accounts
 *
 * On a site with accounts (paid plans), a plan is bought by the signed-in user and unlocks
 * for them only: call setCheckoutAuth(...) once (lib/payments.ts) and pass onSignIn so a
 * signed-out visitor is sent to sign in. Never add an "activate"/"I paid" button.
 *
 * Checkout opens inside the site (Stripe Embedded Checkout) and the buyer comes back to this
 * page with a verified result — all handled here. Without in-site checkout it falls back to
 * the Stripe-hosted Payment Link. Never collect card details on this site.
 */

import { useState } from "react";
import {
  checkoutAccounts,
  findPayment,
  formatAmount,
  formatPrice,
  getCheckoutToken,
  inSiteCheckout,
  paymentsTestMode,
  type CheckoutLine,
  type Interval,
} from "../../lib/payments";
import CheckoutRoot from "./checkout/CheckoutRoot";
import { openCheckout } from "./checkout/store";

type Props = {
  /** Must match the product name in the merchant's Stripe account. */
  product: string;
  /** Pick the monthly or yearly price when the product has both. */
  interval?: Interval;
  quantity?: number;
  label?: string;
  className?: string;
  /** Require a signed-in buyer. Default: plans (recurring prices) on a site with accounts. */
  requireLogin?: boolean;
  /** Called when a signed-out visitor clicks a plan that needs an account. */
  onSignIn?: () => void;
};

export default function BuyButton({
  product,
  interval,
  quantity = 1,
  label,
  className,
  requireLogin,
  onSignIn,
}: Props) {
  const item = findPayment(product, interval);
  const custom = item?.custom_amount ?? null;
  const [amount, setAmount] = useState<string>(
    custom ? String(custom.preset ?? custom.minimum) : "",
  );
  const [signInNeeded, setSignInNeeded] = useState(false);
  const needsAccount = requireLogin ?? Boolean(checkoutAccounts && item?.interval);

  const start = async (lines: CheckoutLine[]) => {
    if (needsAccount && !(await getCheckoutToken())) {
      if (onSignIn) onSignIn();
      else setSignInNeeded(true);
      return;
    }
    setSignInNeeded(false);
    openCheckout(lines, item?.url || undefined);
  };

  // No connected Stripe account, or no such product: a disabled control rather than a dead
  // link, so an unconnected preview still renders the page honestly.
  if (!item || (!inSiteCheckout && !item.url)) {
    return (
      <button className={className} disabled aria-disabled="true" title="Payments are not set up yet">
        {label ?? "Coming soon"}
      </button>
    );
  }

  const testNote = paymentsTestMode ? " (test mode)" : "";

  if (!inSiteCheckout) {
    return (
      <a className={className} href={item.url} target="_blank" rel="noopener noreferrer">
        {label ?? (custom ? "Choose an amount" : `Buy — ${formatPrice(item)}`)}
        {testNote}
      </a>
    );
  }

  if (custom) {
    const value = Number(amount);
    const valid = Number.isFinite(value) && value >= custom.minimum && value <= custom.maximum;
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <CheckoutRoot />
        <label className="inline-flex items-center gap-1 text-sm">
          <span className="sr-only">Amount ({item.currency.toUpperCase()})</span>
          <input
            type="number"
            inputMode="decimal"
            min={custom.minimum}
            max={custom.maximum}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5"
            aria-describedby={`amount-range-${item.price_id}`}
          />
        </label>
        <button
          type="button"
          className={className}
          disabled={!valid}
          onClick={() => void start([{ price_id: item.price_id, quantity: 1, amount: value }])}
        >
          {label ?? `Pay ${valid ? formatAmount(value, item.currency) : ""}`.trim()}
          {testNote}
        </button>
        <span id={`amount-range-${item.price_id}`} className="w-full text-xs opacity-70">
          {formatPrice(item)}
        </span>
      </span>
    );
  }

  return (
    <>
      <CheckoutRoot />
      <button
        type="button"
        className={className}
        onClick={() => void start([{ price_id: item.price_id, quantity }])}
      >
        {signInNeeded ? "Sign in to continue" : (label ?? `Buy — ${formatPrice(item)}`)}
        {signInNeeded ? "" : testNote}
      </button>
    </>
  );
}
