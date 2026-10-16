"use client";

/**
 * Show children only to signed-in users with a paid plan. Import and use it; do not rewrite it.
 *
 *   <PaidFeature plan="Todo Pro" fallback={<UpgradeCard />}>…unlimited todos…</PaidFeature>
 *
 * This decides what to SHOW. The database must still enforce the rule (RLS with
 * ai2me_has_plan('Todo Pro')), because anyone can call Supabase directly.
 */

import type { ReactNode } from "react";
import { useEntitlement } from "../../lib/entitlements";

type Props = {
  /** The Stripe product name of the plan, e.g. "Todo Pro". */
  plan: string;
  children: ReactNode;
  /** Shown to users without the plan (e.g. an upgrade card with <BuyButton>). */
  fallback?: ReactNode;
  /** Shown while the plan is being checked. */
  loading?: ReactNode;
};

export default function PaidFeature({ plan, children, fallback = null, loading = null }: Props) {
  const state = useEntitlement(plan);
  if (state.loading) return <>{loading}</>;
  return <>{state.active ? children : fallback}</>;
}
