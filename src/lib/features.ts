import { supabaseConfigured } from "@/lib/supabase";
import { revenueCatPurchaseLinkConfigured } from "@/lib/checkout";

/**
 * Feature flags.
 *
 * Subscription gating and checkout remain independent. A user may have access
 * from a native store even when web checkout is unavailable, but gating must
 * never activate without authenticated, server-owned entitlements.
 */
const enabled = (value: string | boolean | undefined) =>
  value === true || value === "true";

/** Auth is live only when both the flag and public Supabase configuration exist. */
export const authEnabled =
  enabled(import.meta.env.VITE_AUTH_ENABLED) && supabaseConfigured;

/** Paid gating requires the authenticated, read-only entitlement backend. */
export const subscriptionsEnabled =
  enabled(import.meta.env.VITE_SUBSCRIPTIONS_ENABLED) && authEnabled;

/** Number of kurals available without a subscription when gating is enabled. */
export const FREE_LIMIT = 10;

/** Checkout requires auth, server-owned entitlements and a valid RevenueCat link. */
export const checkoutEnabled =
  enabled(import.meta.env.VITE_CHECKOUT_ENABLED) &&
  subscriptionsEnabled &&
  revenueCatPurchaseLinkConfigured;

export const PRODUCT_NAME = "Kural Companion";
export const PRODUCT_NAME_TA = "திருக்குறள்";
