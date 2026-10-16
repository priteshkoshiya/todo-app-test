/**
 * Stripe payments for a statically exported site.
 *
 * Checkout is NEVER reimplemented here. Paying happens in Stripe Checkout:
 * - embedded inside this site (a Stripe iframe in a modal) when in-site checkout is set up, or
 * - on a Stripe-hosted Payment Link otherwise.
 * Card entry, 3-D Secure, tax and PCI scope all stay with Stripe.
 *
 * data/payment-links.json is written by the platform from the merchant's real Stripe catalog.
 * Never edit prices, URLs or the checkout settings by hand: the page must always charge what
 * Stripe charges. No Stripe secret key ever reaches this bundle.
 */

import links from "../data/payment-links.json";

export type Interval = "day" | "week" | "month" | "year" | null;

/** A price where the customer chooses the amount (donation / tip / pay what you want). */
export type CustomAmount = {
  minimum: number;
  maximum: number;
  preset?: number | null;
};

export type PaymentItem = {
  name: string;
  /** Major units: 29 means $29.00. null for a customer-chosen amount. */
  amount: number | null;
  currency: string;
  /** null for a one-time price. */
  interval?: Interval;
  price_id: string;
  /** Stripe-hosted Payment Link, used when in-site checkout is unavailable. May be "". */
  url: string;
  custom_amount?: CustomAmount | null;
};

type CheckoutSettings = {
  api: string;
  project_id: string;
  embedded: boolean;
  /** Paid plans for logged-in users: plans are bought signed in and unlock per user. */
  accounts?: boolean;
};

type PaymentLinks = {
  connected: boolean;
  livemode: boolean;
  checkout?: CheckoutSettings;
  items: PaymentItem[];
};

const data = links as PaymentLinks;
const settings: CheckoutSettings = data.checkout ?? { api: "", project_id: "", embedded: false };

/** True when plans unlock features per signed-in user (see lib/entitlements.ts). */
export const checkoutAccounts: boolean = Boolean(settings.accounts && settings.embedded);

/** True when the merchant connected Stripe and has at least one purchasable product. */
export const paymentsEnabled: boolean = Boolean(data.connected && data.items?.length);

/** True when the connected account is in test mode — surface this so nobody expects real money. */
export const paymentsTestMode: boolean = Boolean(data.connected && !data.livemode);

/** True when checkout opens inside this site (Stripe Embedded Checkout). */
export const inSiteCheckout: boolean = Boolean(
  data.connected && settings.embedded && settings.api && settings.project_id,
);

export const paymentItems: PaymentItem[] = data.items ?? [];

/**
 * The price for a product, optionally for one billing interval ("month" / "year").
 * Pass `interval: null` to ask for the one-time price explicitly.
 */
export function findPayment(name: string, interval?: Interval): PaymentItem | undefined {
  const needle = (name || "").trim().toLowerCase();
  const matches = paymentItems.filter((item) => item.name.trim().toLowerCase() === needle);
  if (interval === undefined) return matches[0];
  return matches.find((item) => (item.interval ?? null) === interval);
}

/** "$29.00" — amounts are already in major units. */
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amount ?? 0);
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${(currency || "").toUpperCase()}`;
  }
}

/** "$29.00/month", "$29.00", or "₹100–₹5,000" for a customer-chosen amount. */
export function formatPrice(item: PaymentItem): string {
  if (item.custom_amount) {
    const { minimum, maximum } = item.custom_amount;
    return `${formatAmount(minimum, item.currency)}–${formatAmount(maximum, item.currency)}`;
  }
  const base = formatAmount(item.amount ?? 0, item.currency);
  return item.interval ? `${base}/${item.interval}` : base;
}

// --- in-site checkout ------------------------------------------------------------------

export type CheckoutLine = { price_id: string; quantity?: number; amount?: number };

export type CheckoutResultItem = {
  name: string;
  quantity: number;
  amount: number;
  interval: Interval;
};

export type PlanState = {
  plan: string;
  product_id: string;
  status: string;
  current_period_end: number | null;
  active: boolean;
};

export type CheckoutResult = {
  plans?: PlanState[];
  status: "complete" | "open" | "expired";
  paid: boolean;
  mode: "payment" | "subscription";
  livemode: boolean;
  amount_total: number;
  currency: string;
  items: CheckoutResultItem[];
};

export class CheckoutError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** The query parameter Stripe adds when it sends the buyer back to this page. */
export const CHECKOUT_SESSION_PARAM = "checkout_session";

let authToken: (() => Promise<string | null>) | null = null;

/**
 * Tell checkout who is signed in (Supabase). Call once where the Supabase client is created:
 *   setCheckoutAuth(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null)
 * Plans are then bought by — and unlocked for — that user only. The platform verifies the
 * token with the site's own Supabase; nothing here is trusted on its own.
 */
export function setCheckoutAuth(getToken: () => Promise<string | null>): void {
  authToken = getToken;
}

export async function getCheckoutToken(): Promise<string | null> {
  try {
    return authToken ? await authToken() : null;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCheckoutToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function checkoutEndpoint(path: string): string {
  return endpoint(path);
}

function endpoint(path: string): string {
  return `${settings.api}/v1/public/checkout/${encodeURIComponent(settings.project_id)}${path}`;
}

async function readError(res: Response): Promise<CheckoutError> {
  try {
    const body = await res.json();
    // FastAPI's {"detail": {...}} or the platform's {"error": {"message": {...}}} envelope.
    const raw = body?.detail ?? body?.error?.message ?? body?.error ?? {};
    const detail = typeof raw === "object" && raw ? raw : { message: raw };
    return new CheckoutError(String(detail.code || res.status), String(detail.message || "Checkout failed"));
  } catch {
    return new CheckoutError(String(res.status), "Checkout failed");
  }
}

/** This page's address without a previous checkout result, for Stripe to return to. */
export function currentReturnUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(CHECKOUT_SESSION_PARAM);
  return url.toString();
}

export async function createCheckoutSession(
  lines: CheckoutLine[],
): Promise<{ client_secret: string; publishable_key: string; livemode: boolean }> {
  const res = await fetch(endpoint("/sessions"), {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      items: lines.map((l) => ({ price_id: l.price_id, quantity: l.quantity ?? 1, amount: l.amount ?? null })),
      return_url: currentReturnUrl(),
    }),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

/** The verified outcome of a checkout, straight from Stripe via the platform. */
/** The signed-in user's plans, re-checked with Stripe by the platform. */
export async function fetchPlans(): Promise<PlanState[]> {
  const headers = await authHeaders();
  if (!headers.authorization || !checkoutAccounts) return [];
  const res = await fetch(endpoint("/entitlements"), { headers });
  if (!res.ok) throw await readError(res);
  return ((await res.json()).plans ?? []) as PlanState[];
}

export async function getCheckoutResult(sessionId: string): Promise<CheckoutResult> {
  const res = await fetch(endpoint(`/sessions/${encodeURIComponent(sessionId)}`), {
    headers: await authHeaders(),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}
