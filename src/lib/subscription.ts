import type { SupabaseClient } from "@supabase/supabase-js";

export const PREMIUM_ENTITLEMENT_KEY = "premium";

export type PremiumEntitlementStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "grace_period"
  | "paused"
  | "expired"
  | "revoked";

export interface PremiumEntitlement {
  active: boolean;
  status: PremiumEntitlementStatus;
  planKey: string | null;
  source: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string | null;
}

interface PremiumEntitlementRow {
  status?: unknown;
  plan_key?: unknown;
  source?: unknown;
  starts_at?: unknown;
  expires_at?: unknown;
  cancel_at_period_end?: unknown;
  updated_at?: unknown;
}

const ACCESS_STATUSES = new Set<PremiumEntitlementStatus>([
  "trialing",
  "active",
  "grace_period",
]);

const VALID_STATUSES = new Set<PremiumEntitlementStatus>([
  "inactive",
  "trialing",
  "active",
  "grace_period",
  "paused",
  "expired",
  "revoked",
]);

export const INACTIVE_PREMIUM_ENTITLEMENT: PremiumEntitlement = {
  active: false,
  status: "inactive",
  planKey: null,
  source: null,
  startsAt: null,
  expiresAt: null,
  cancelAtPeriodEnd: false,
  updatedAt: null,
};

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function safeTimestamp(value: unknown): string | null {
  const timestamp = safeString(value);
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : null;
}

export function isPremiumEntitlementActive(
  entitlement: Pick<PremiumEntitlement, "status" | "startsAt" | "expiresAt">,
  now = Date.now(),
): boolean {
  if (!ACCESS_STATUSES.has(entitlement.status)) return false;
  if (entitlement.startsAt && Date.parse(entitlement.startsAt) > now) return false;
  if (entitlement.expiresAt && Date.parse(entitlement.expiresAt) <= now) return false;
  return true;
}

/**
 * Parse untrusted Data API output and fail closed for unknown or malformed
 * states. Access is derived only from the server-owned row and its validity
 * window, never from local storage or authentication metadata.
 */
export function parsePremiumEntitlement(
  input: PremiumEntitlementRow | null | undefined,
  now = Date.now(),
): PremiumEntitlement {
  if (!input || !VALID_STATUSES.has(input.status as PremiumEntitlementStatus)) {
    return { ...INACTIVE_PREMIUM_ENTITLEMENT };
  }

  const status = input.status as PremiumEntitlementStatus;
  const startsAt = safeTimestamp(input.starts_at);
  const expiresAt = safeTimestamp(input.expires_at);
  const malformedValidityWindow =
    (input.starts_at != null && startsAt === null) ||
    (input.expires_at != null && expiresAt === null);
  const entitlement: PremiumEntitlement = {
    active: false,
    status,
    planKey: safeString(input.plan_key),
    source: safeString(input.source),
    startsAt,
    expiresAt,
    cancelAtPeriodEnd: input.cancel_at_period_end === true,
    updatedAt: safeTimestamp(input.updated_at),
  };
  entitlement.active =
    !malformedValidityWindow && isPremiumEntitlementActive(entitlement, now);
  return entitlement;
}

export async function fetchPremiumEntitlement(
  client: SupabaseClient,
  userId: string,
): Promise<PremiumEntitlement> {
  const [result, activeResult] = await Promise.all([
    client
      .from("user_entitlements")
      .select(
        "status, plan_key, source, starts_at, expires_at, cancel_at_period_end, updated_at",
      )
      .eq("user_id", userId)
      .eq("entitlement_key", PREMIUM_ENTITLEMENT_KEY)
      .maybeSingle(),
    client.rpc("has_active_entitlement", {
      requested_entitlement: PREMIUM_ENTITLEMENT_KEY,
    }),
  ]);

  if (result.error) throw new Error(result.error.message);
  if (activeResult.error) throw new Error(activeResult.error.message);
  const entitlement = parsePremiumEntitlement(
    result.data as PremiumEntitlementRow | null,
  );
  return { ...entitlement, active: activeResult.data === true };
}
