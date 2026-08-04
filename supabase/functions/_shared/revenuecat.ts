declare const Deno: {
  env: { get(name: string): string | undefined };
};

export type BillingEnvironment = "SANDBOX" | "PRODUCTION";
export type BillingStatus =
  | "inactive"
  | "active"
  | "grace_period"
  | "expired";

export interface ResolvedEntitlement {
  status: BillingStatus;
  planKey: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  environment: BillingEnvironment;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function date(value: unknown): string | null {
  const valueText = text(value);
  return valueText && Number.isFinite(Date.parse(valueText)) ? valueText : null;
}

function billingEnvironment(value: unknown): BillingEnvironment | null {
  if (value === true) return "SANDBOX";
  if (value === false) return "PRODUCTION";
  return null;
}

function allowedEnvironments(): Set<BillingEnvironment> {
  const values = Deno.env.get("REVENUECAT_ALLOWED_ENVIRONMENTS")
    ?.split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is BillingEnvironment =>
      value === "SANDBOX" || value === "PRODUCTION"
    );
  if (!values?.length) {
    throw new Error("REVENUECAT_ALLOWED_ENVIRONMENTS is not configured.");
  }
  return new Set(values);
}

function planKey(productId: string | null, expiresAt: string | null): string | null {
  if (!productId) return null;
  const configured: Array<[string | undefined, string]> = [
    [Deno.env.get("REVENUECAT_MONTHLY_PRODUCT_ID"), "monthly"],
    [Deno.env.get("REVENUECAT_YEARLY_PRODUCT_ID"), "yearly"],
    [Deno.env.get("REVENUECAT_LIFETIME_PRODUCT_ID"), "lifetime"],
  ];
  const match = configured.find(([id]) => id?.trim() === productId);
  if (match) return match[1];
  return expiresAt === null ? "lifetime" : "premium";
}

function newestNonSubscription(records: unknown): UnknownRecord | null {
  if (!Array.isArray(records)) return null;
  return records
    .map(record)
    .filter((item): item is UnknownRecord => Boolean(item))
    .sort((a, b) =>
      (Date.parse(date(b.purchase_date) ?? "") || 0) -
      (Date.parse(date(a.purchase_date) ?? "") || 0)
    )[0] ?? null;
}

export function resolveRevenueCatEntitlement(
  payload: unknown,
  now = Date.now(),
): ResolvedEntitlement {
  const root = record(payload);
  const subscriber = record(root?.subscriber);
  const entitlements = record(subscriber?.entitlements);
  const entitlement = record(entitlements?.premium);
  const subscriptions = record(subscriber?.subscriptions) ?? {};
  const nonSubscriptions = record(subscriber?.non_subscriptions) ?? {};
  const fallbackEnvironment = [...allowedEnvironments()][0];

  if (!entitlement) {
    return {
      status: "inactive",
      planKey: null,
      startsAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      environment: fallbackEnvironment,
    };
  }

  const productId = text(entitlement.product_identifier);
  const subscription = productId ? record(subscriptions[productId]) : null;
  const nonSubscription = productId
    ? newestNonSubscription(nonSubscriptions[productId])
    : null;
  const purchase = subscription ?? nonSubscription;
  const environment = billingEnvironment(purchase?.is_sandbox);
  if (!environment || !allowedEnvironments().has(environment)) {
    return {
      status: "inactive",
      planKey: null,
      startsAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      environment: environment ?? fallbackEnvironment,
    };
  }

  const startsAt = date(entitlement.purchase_date) ?? date(purchase?.purchase_date);
  const expiresAt = date(entitlement.expires_date);
  const gracePeriodExpiresAt = date(entitlement.grace_period_expires_date) ??
    date(subscription?.grace_period_expires_date);
  const expiresTime = expiresAt ? Date.parse(expiresAt) : null;
  const graceTime = gracePeriodExpiresAt ? Date.parse(gracePeriodExpiresAt) : null;
  const lifetime = expiresAt === null && nonSubscription !== null;
  const active = lifetime || (expiresTime !== null && expiresTime > now);
  const inGracePeriod = !active && graceTime !== null && graceTime > now;

  return {
    status: active ? "active" : inGracePeriod ? "grace_period" : "expired",
    planKey: planKey(productId, expiresAt),
    startsAt,
    expiresAt: inGracePeriod ? gracePeriodExpiresAt : expiresAt,
    cancelAtPeriodEnd: active && Boolean(date(subscription?.unsubscribe_detected_at)),
    environment,
  };
}

export async function fetchRevenueCatEntitlement(
  appUserId: string,
): Promise<ResolvedEntitlement> {
  const apiKey = Deno.env.get("REVENUECAT_API_KEY")?.trim();
  if (!apiKey) throw new Error("REVENUECAT_API_KEY is not configured.");

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) {
    throw new Error(`RevenueCat customer lookup failed with ${response.status}.`);
  }
  return resolveRevenueCatEntitlement(await response.json());
}

export function parseWebhookIdentity(payload: unknown): {
  eventId: string;
  eventType: string;
  eventTimestamp: string;
  environment: BillingEnvironment | null;
  candidateUserIds: string[];
} {
  const root = record(payload);
  const event = record(root?.event);
  const eventId = text(event?.id);
  const eventType = text(event?.type);
  const eventTimestampMs = Number(event?.event_timestamp_ms);
  if (!eventId || !eventType || !Number.isFinite(eventTimestampMs)) {
    throw new Error("Webhook event fields are invalid.");
  }

  const aliases = Array.isArray(event?.aliases)
    ? event.aliases.map(text).filter((value): value is string => Boolean(value))
    : [];
  const candidateUserIds = [
    text(event?.app_user_id),
    text(event?.original_app_user_id),
    ...aliases,
  ].filter((value, index, values): value is string =>
    Boolean(value) && values.indexOf(value) === index
  );

  const environment = event?.environment === "SANDBOX" || event?.environment === "PRODUCTION"
    ? event.environment
    : null;

  return {
    eventId,
    eventType,
    eventTimestamp: new Date(eventTimestampMs).toISOString(),
    environment,
    candidateUserIds,
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  if (!left.length || !right.length) return left.length === right.length;
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let mismatch = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index % leftBytes.length] ?? 0) ^
      (rightBytes[index % rightBytes.length] ?? 0);
  }
  return mismatch === 0;
}

export function verifyAuthorization(actual: string | null): boolean {
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION")?.trim();
  return Boolean(expected && actual && constantTimeEqual(actual, expected));
}

export async function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  nowSeconds = Math.floor(Date.now() / 1_000),
): Promise<boolean> {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_HMAC_SECRET")?.trim();
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const separator = part.indexOf("=");
      return separator > 0
        ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
        : [part.trim(), ""];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1?.toLowerCase();
  const timestampNumber = Number(timestamp);
  if (
    !timestamp ||
    !signature ||
    !/^[0-9a-f]{64}$/.test(signature) ||
    !Number.isInteger(timestampNumber) ||
    Math.abs(nowSeconds - timestampNumber) > 300
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const computed = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return constantTimeEqual(computed, signature);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
