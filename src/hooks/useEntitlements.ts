import { useCallback, useMemo } from "react";
import { FREE_LIMIT, subscriptionsEnabled } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { isValidKuralNumber } from "@/lib/player-utils";

export interface Entitlements {
  /** True when paid gating is active for this build. */
  gatingActive: boolean;
  freeLimit: number;
  canAccessKural: (n: number) => boolean;
  isLocked: (n: number) => boolean;
  /** Premium features are open for preview until paid gating is configured. */
  premiumAccess: boolean;
  premiumPreview: boolean;
}

export function canUsePremiumFeaturesWith(opts: {
  subscriptionsEnabled: boolean;
  subscribed: boolean;
}): boolean {
  return !opts.subscriptionsEnabled || opts.subscribed;
}

/** Pure rule so it can be unit-tested without React. */
export function canAccessKuralWith(
  n: number,
  opts: { gatingEnabled: boolean; subscribed: boolean; freeLimit?: number },
): boolean {
  if (!isValidKuralNumber(n)) return false;
  if (!opts.gatingEnabled) return true;
  if (opts.subscribed) return true;
  return n <= (opts.freeLimit ?? FREE_LIMIT);
}

/**
 * Single source of truth for content access. Every route and player action
 * must go through this, so gating can never diverge between screens.
 */
export function useEntitlements(): Entitlements {
  const { subscribed } = useAuth();
  const premiumAccess = canUsePremiumFeaturesWith({
    subscriptionsEnabled,
    subscribed,
  });

  const canAccessKural = useCallback(
    (n: number) =>
      canAccessKuralWith(n, {
        gatingEnabled: subscriptionsEnabled,
        subscribed,
        freeLimit: FREE_LIMIT,
      }),
    [subscribed],
  );

  return useMemo(
    () => ({
      gatingActive: subscriptionsEnabled,
      freeLimit: FREE_LIMIT,
      canAccessKural,
      isLocked: (n: number) => !canAccessKural(n),
      premiumAccess,
      premiumPreview: !subscriptionsEnabled,
    }),
    [canAccessKural, premiumAccess],
  );
}
