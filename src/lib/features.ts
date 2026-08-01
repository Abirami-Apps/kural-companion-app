/**
 * Feature flags.
 *
 * `subscriptionsEnabled` is false because no authentication provider and no
 * payment provider are configured for this project. While it is false the app
 * must never claim that content is paid, locked, or that checkout works.
 * Flip it to true only once a real backend + payment provider exist.
 */
export const subscriptionsEnabled = false;

/** Number of kurals available without a subscription when gating is enabled. */
export const FREE_LIMIT = 10;

/** No auth backend is wired up yet. */
export const authEnabled = false;

/** No payment provider is wired up yet. */
export const checkoutEnabled = false;

export const PRODUCT_NAME = "Kural Companion";
export const PRODUCT_NAME_TA = "திருக்குறள்";
