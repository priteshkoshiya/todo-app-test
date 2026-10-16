"use client";

/**
 * Which paid plans the signed-in user has. Import and use it; do not rewrite it.
 *
 *   const { active, loading } = useEntitlement("Todo Pro");
 *   if (!active) show the free limit and an upgrade button
 *
 * The plan comes from AI2ME's paid-plans table in the site's Supabase, written only after
 * Stripe confirms a payment (users can read it but never change it), and re-checked with
 * Stripe. Never store "paid"/"pro" flags yourself (localStorage, your own tables, URL params):
 * anyone could set them. Enforce limits in the database too, with ai2me_has_plan('<plan>') in
 * your RLS policies — this hook is for showing the right UI.
 */

import { useEffect, useSyncExternalStore } from "react";
import { checkoutAccounts, fetchPlans, getCheckoutToken, type PlanState } from "./payments";

type Store = { plans: PlanState[]; loading: boolean; loaded: boolean };

let state: Store = { plans: [], loading: false, loaded: false };
const listeners = new Set<() => void>();
const SERVER: Store = { plans: [], loading: true, loaded: false };

function set(next: Partial<Store>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

let inflight: Promise<void> | null = null;

/** Reload the signed-in user's plans (call after sign-in or sign-out). */
export function refreshPlans(): Promise<void> {
  if (inflight) return inflight;
  set({ loading: true });
  inflight = (async () => {
    try {
      const token = await getCheckoutToken();
      set({ plans: token && checkoutAccounts ? await fetchPlans() : [], loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
      inflight = null;
    }
  })();
  return inflight;
}

/** Used by checkout after a payment verified with Stripe, so paid UI unlocks at once. */
export function setPlans(plans: PlanState[]): void {
  set({ plans, loaded: true, loading: false });
}

export function usePlans(): Store & { refresh: () => Promise<void> } {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
  useEffect(() => {
    if (!state.loaded && !inflight) void refreshPlans();
  }, []);
  return { ...snapshot, refresh: refreshPlans };
}

/** Whether the signed-in user has this plan (matched by the Stripe product name). */
export function useEntitlement(plan: string) {
  const { plans, loading, loaded, refresh } = usePlans();
  const needle = (plan || "").trim().toLowerCase();
  const match = plans.find((p) => (p.plan || "").trim().toLowerCase() === needle);
  return {
    active: Boolean(match?.active),
    /** True until the first answer arrives — render a neutral state, not the paywall. */
    loading: loading || !loaded,
    plan: match ?? null,
    refresh,
  };
}
