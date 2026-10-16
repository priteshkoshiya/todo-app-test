/**
 * Stripe.js, loaded at runtime from js.stripe.com as Stripe requires (never bundled or
 * self-hosted). Pinned to the API release the platform uses.
 */

const STRIPE_JS_URL = "https://js.stripe.com/dahlia/stripe.js";

export type EmbeddedCheckoutPage = {
  mount: (el: HTMLElement | string) => void;
  destroy: () => void;
};

type StripeInstance = {
  createEmbeddedCheckoutPage: (options: {
    fetchClientSecret: () => Promise<string>;
  }) => Promise<EmbeddedCheckoutPage>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load Stripe"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

const instances = new Map<string, StripeInstance>();

export async function stripeFor(publishableKey: string): Promise<StripeInstance> {
  await loadScript();
  if (!window.Stripe) throw new Error("Could not load Stripe");
  let instance = instances.get(publishableKey);
  if (!instance) {
    instance = window.Stripe(publishableKey);
    instances.set(publishableKey, instance);
  }
  return instance;
}
