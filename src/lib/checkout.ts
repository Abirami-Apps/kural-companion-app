export const CHECKOUT_PACKAGE_IDS = {
  monthly: "$rc_monthly",
  yearly: "$rc_annual",
  lifetime: "$rc_lifetime",
} as const;

export type CheckoutPlanId = keyof typeof CHECKOUT_PACKAGE_IDS;

const PURCHASE_HOST = "pay.rev.cat";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Purchase-link tokens are public configuration, but still fail closed unless
 * they use RevenueCat's HTTPS host and contain only the generated link token.
 */
export function isValidRevenueCatPurchaseUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value.trim());
    const pathParts = url.pathname.split("/").filter(Boolean);
    return (
      url.protocol === "https:" &&
      url.hostname === PURCHASE_HOST &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      pathParts.length === 1
    );
  } catch {
    return false;
  }
}

export const revenueCatPurchaseUrl =
  import.meta.env.VITE_REVENUECAT_PURCHASE_URL?.trim() ?? "";

export const revenueCatPurchaseLinkConfigured =
  isValidRevenueCatPurchaseUrl(revenueCatPurchaseUrl);

export function buildRevenueCatPurchaseUrl(opts: {
  baseUrl: string;
  userId: string;
  email?: string | null;
  planId: CheckoutPlanId;
}): string {
  if (!isValidRevenueCatPurchaseUrl(opts.baseUrl)) {
    throw new Error("RevenueCat purchase link is not configured correctly.");
  }
  if (!UUID_PATTERN.test(opts.userId)) {
    throw new Error("A valid signed-in account is required for checkout.");
  }

  const url = new URL(opts.baseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(opts.userId)}`;
  url.searchParams.set("package_id", CHECKOUT_PACKAGE_IDS[opts.planId]);
  if (opts.email?.trim()) url.searchParams.set("email", opts.email.trim());
  return url.toString();
}
