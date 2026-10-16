"use client";

/**
 * The whole checkout flow, mounted automatically by every pay control (BuyButton,
 * CheckoutButton). Only the first one mounted renders it. Do not add your own.
 *
 * 1. A pay control calls openCheckout(lines) → this opens a modal with Stripe Embedded
 *    Checkout inside the site.
 * 2. After paying, Stripe returns the buyer to this page with ?checkout_session=cs_…
 * 3. On load, this asks the platform for the verified result and shows it.
 *
 * Never show a success message from anything else (no "?success=true" flags): only a
 * result verified with Stripe counts as paid.
 */

import { useEffect, useRef, useState } from "react";
import {
  CHECKOUT_SESSION_PARAM,
  CheckoutError,
  createCheckoutSession,
  formatAmount,
  getCheckoutResult,
  type CheckoutResult,
} from "../../../lib/payments";
import { refreshPlans, setPlans } from "../../../lib/entitlements";
import { stripeFor, type EmbeddedCheckoutPage } from "./stripe-js";
import { clearCart, closeCheckout, lastCheckout, openCheckout, useCheckoutRequest } from "./store";

let claimed = false;

export default function CheckoutRoot() {
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    if (claimed) return;
    claimed = true;
    setOwner(true);
    return () => {
      claimed = false;
    };
  }, []);
  if (!owner) return null;
  return (
    <>
      <CheckoutModal />
      <CheckoutReturn />
    </>
  );
}

function Overlay({ onClose, label, children }: { onClose: () => void; label: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-xl rounded-xl bg-white text-neutral-900 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

function CheckoutModal() {
  const request = useCheckoutRequest();
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!request) return;
    let page: EmbeddedCheckoutPage | null = null;
    let cancelled = false;
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const session = await createCheckoutSession(request.lines);
        const stripe = await stripeFor(session.publishable_key);
        page = await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: async () => session.client_secret,
        });
        if (cancelled || !mountRef.current) {
          page.destroy();
          return;
        }
        page.mount(mountRef.current);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof CheckoutError && err.code === "checkout_unavailable" && request.fallbackUrl) {
          // In-site checkout isn't set up for this store: use Stripe's hosted page instead.
          window.open(request.fallbackUrl, "_blank", "noopener,noreferrer");
          closeCheckout();
          return;
        }
        setLoading(false);
        setError(
          err instanceof CheckoutError && err.code === "login_required"
            ? "Please sign in first, then try again."
            : err instanceof CheckoutError && err.code !== "checkout_unavailable"
              ? err.message
              : "Checkout could not start. Please try again in a moment.",
        );
      }
    })();

    return () => {
      cancelled = true;
      page?.destroy();
    };
  }, [request]);

  if (!request) return null;
  return (
    <Overlay onClose={closeCheckout} label="Checkout">
      <div className="min-h-[200px] p-2 pt-12 sm:p-4 sm:pt-12">
        {loading && !error ? <p className="p-6 text-center text-sm text-neutral-500">Loading secure checkout…</p> : null}
        {error ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-sm text-neutral-700">{error}</p>
            {request.fallbackUrl ? (
              <a
                href={request.fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium underline"
              >
                Pay on Stripe instead
              </a>
            ) : null}
          </div>
        ) : null}
        <div ref={mountRef} />
      </div>
    </Overlay>
  );
}

function CheckoutReturn() {
  const [result, setResult] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get(CHECKOUT_SESSION_PARAM);
    if (!sessionId) return;
    // Remove the id from the address bar so a refresh or a shared link doesn't re-show it.
    url.searchParams.delete(CHECKOUT_SESSION_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
    getCheckoutResult(sessionId)
      .then((r) => {
        if (r.status === "complete" && r.paid) {
          clearCart();
          // A plan bought by the signed-in user: unlock paid UI now (verified by Stripe).
          if (r.plans) setPlans(r.plans);
          else void refreshPlans();
        }
        setResult(r);
      })
      .catch(() => {
        /* unknown or foreign session: show nothing */
      });
  }, []);

  if (!result) return null;
  const close = () => setResult(null);
  const paid = result.status === "complete" && result.paid;
  const retry = lastCheckout();

  return (
    <Overlay onClose={close} label={paid ? "Payment received" : "Payment not completed"}>
      <div className="space-y-4 p-6 pt-10 text-center sm:p-8 sm:pt-12">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
          aria-hidden="true"
        >
          {paid ? "✓" : "!"}
        </div>
        <h2 className="text-xl font-semibold">
          {paid
            ? result.mode === "subscription"
              ? "Subscription started"
              : "Payment received"
            : result.status === "expired"
              ? "Checkout expired"
              : "Payment not completed"}
        </h2>
        {paid ? (
          <>
            <ul className="space-y-1 text-sm text-neutral-700">
              {result.items.map((item, i) => (
                <li key={i}>
                  {item.quantity > 1 ? `${item.quantity} × ` : ""}
                  {item.name} — {formatAmount(item.amount, result.currency)}
                  {item.interval ? `/${item.interval}` : ""}
                </li>
              ))}
            </ul>
            <p className="text-base font-semibold">Total {formatAmount(result.amount_total, result.currency)}</p>
            <p className="text-xs text-neutral-500">
              {result.livemode ? "A receipt is on its way to your email." : "Test mode — no real money was charged."}
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-600">No payment was taken.</p>
        )}
        <div className="flex justify-center gap-2 pt-2">
          {!paid && retry ? (
            <button
              type="button"
              onClick={() => {
                close();
                openCheckout(retry.lines, retry.fallbackUrl);
              }}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
          >
            {paid ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
