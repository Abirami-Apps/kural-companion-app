declare const Deno: { env: { get(name: string): string | undefined } };

export type RazorpayEnvironment = "TEST" | "LIVE";
export type PlanKey = "monthly" | "yearly" | "lifetime";
export type CheckoutKind = "order" | "subscription";
export type BillingState =
  | "pending"
  | "active"
  | "grace_period"
  | "paused"
  | "expired"
  | "revoked";

export type PlanDefinition = {
  planKey: PlanKey;
  checkoutKind: CheckoutKind;
  amount: number;
  currency: "INR";
  description: string;
  providerPlanId: string | null;
  totalCount: number | null;
};

export type RazorpayEntityState = {
  providerId: string;
  state: BillingState;
  paymentId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integer(value: unknown): number | null {
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}

function isoFromSeconds(value: unknown): string | null {
  const seconds = integer(value);
  if (seconds === null || seconds <= 0) return null;
  const date = new Date(seconds * 1_000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function razorpayEnvironment(): RazorpayEnvironment {
  const value = Deno.env.get("RAZORPAY_ENVIRONMENT")?.trim().toUpperCase();
  if (value !== "TEST" && value !== "LIVE") {
    throw new Error("RAZORPAY_ENVIRONMENT must be TEST or LIVE.");
  }
  return value;
}

export function planDefinition(value: unknown): PlanDefinition {
  if (value !== "monthly" && value !== "yearly" && value !== "lifetime") {
    throw new Error("Choose a valid Kural Companion plan.");
  }
  if (value === "lifetime") {
    return {
      planKey: value,
      checkoutKind: "order",
      amount: 349_900,
      currency: "INR",
      description: "Kural Companion Plus Lifetime",
      providerPlanId: null,
      totalCount: null,
    };
  }
  const envName = value === "monthly"
    ? "RAZORPAY_MONTHLY_PLAN_ID"
    : "RAZORPAY_YEARLY_PLAN_ID";
  const providerPlanId = Deno.env.get(envName)?.trim();
  if (!providerPlanId || !/^plan_[A-Za-z0-9]+$/.test(providerPlanId)) {
    throw new Error(`${envName} is not configured.`);
  }
  return {
    planKey: value,
    checkoutKind: "subscription",
    amount: value === "monthly" ? 9_900 : 99_900,
    currency: "INR",
    description: value === "monthly"
      ? "Kural Companion Plus Monthly"
      : "Kural Companion Plus Yearly",
    providerPlanId,
    totalCount: value === "monthly" ? 360 : 30,
  };
}

export function publicKeyId(): string {
  const value = Deno.env.get("RAZORPAY_KEY_ID")?.trim();
  const prefix = razorpayEnvironment() === "TEST" ? "rzp_test_" : "rzp_live_";
  if (!value?.startsWith(prefix)) {
    throw new Error("The Razorpay key ID does not match the configured environment.");
  }
  return value;
}

function keySecret(): string {
  const value = Deno.env.get("RAZORPAY_KEY_SECRET")?.trim();
  if (!value) throw new Error("RAZORPAY_KEY_SECRET is not configured.");
  return value;
}

function webhookSecret(): string {
  const value = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")?.trim();
  if (!value) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  return value;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (!left.length || !right.length) return left.length === right.length;
  const leftBytes = new TextEncoder().encode(left.toLowerCase());
  const rightBytes = new TextEncoder().encode(right.toLowerCase());
  let mismatch = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index % leftBytes.length] ?? 0) ^
      (rightBytes[index % rightBytes.length] ?? 0);
  }
  return mismatch === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
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
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

export async function verifyCheckoutSignature(args: {
  checkoutKind: CheckoutKind;
  providerId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const message = args.checkoutKind === "order"
    ? `${args.providerId}|${args.paymentId}`
    : `${args.paymentId}|${args.providerId}`;
  return constantTimeEqual(await hmacHex(keySecret(), message), args.signature);
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  return Boolean(
    signature && constantTimeEqual(await hmacHex(webhookSecret(), rawBody), signature),
  );
}

async function apiRequest(
  path: string,
  init: { method?: string; body?: UnknownRecord } = {},
): Promise<UnknownRecord> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${btoa(`${publicKeyId()}:${keySecret()}`)}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const error = record(record(payload)?.error);
    throw new Error(text(error?.description) ?? `Razorpay API request failed (${response.status}).`);
  }
  const result = record(payload);
  if (!result) throw new Error("Razorpay returned an invalid response.");
  return result;
}

export async function createProviderCheckout(args: {
  definition: PlanDefinition;
  userId: string;
  sessionId: string;
}): Promise<string> {
  const notes = {
    app: "kural_companion",
    checkout_session_id: args.sessionId,
    plan_key: args.definition.planKey,
    user_id: args.userId,
  };
  if (args.definition.checkoutKind === "order") {
    const order = await apiRequest("/orders", {
      method: "POST",
      body: {
        amount: args.definition.amount,
        currency: args.definition.currency,
        receipt: `kural_${args.sessionId.replace(/-/g, "").slice(0, 24)}`,
        notes,
      },
    });
    const id = text(order.id);
    if (!id?.startsWith("order_")) throw new Error("Razorpay order creation failed.");
    return id;
  }

  const subscription = await apiRequest("/subscriptions", {
    method: "POST",
    body: {
      plan_id: args.definition.providerPlanId,
      total_count: args.definition.totalCount,
      quantity: 1,
      customer_notify: true,
      notes,
    },
  });
  const id = text(subscription.id);
  if (!id?.startsWith("sub_")) throw new Error("Razorpay subscription creation failed.");
  return id;
}

function subscriptionState(entity: UnknownRecord): RazorpayEntityState {
  const providerId = text(entity.id);
  if (!providerId?.startsWith("sub_")) throw new Error("Subscription response is invalid.");
  const status = text(entity.status);
  const startsAt = isoFromSeconds(entity.current_start) ?? isoFromSeconds(entity.start_at);
  // Only the current paid billing period grants access. `end_at` can describe the
  // end of the entire multi-cycle subscription and must never be treated as the
  // current entitlement expiry.
  const expiresAt = isoFromSeconds(entity.current_end);
  const futureEnd = expiresAt ? Date.parse(expiresAt) > Date.now() : false;
  const scheduledChanges = record(entity.change_scheduled_at);
  const scheduledCancel = Boolean(entity.cancel_at_cycle_end) ||
    text(entity.change_scheduled_at) === "cycle_end" ||
    text(scheduledChanges?.type) === "cancel";

  let state: BillingState;
  let cancelAtPeriodEnd = scheduledCancel;
  if (status === "active") {
    state = expiresAt ? "active" : "pending";
  } else if (status === "authenticated") {
    state = "pending";
  } else if (status === "pending") {
    state = futureEnd ? "grace_period" : "pending";
  } else if (status === "paused" || status === "halted") {
    state = "paused";
  } else if (status === "cancelled" || status === "completed" || status === "expired") {
    state = futureEnd ? "active" : "expired";
    cancelAtPeriodEnd = futureEnd;
  } else {
    state = "pending";
  }
  return {
    providerId,
    state,
    paymentId: null,
    startsAt,
    expiresAt,
    cancelAtPeriodEnd,
  };
}

export async function verifyProviderPayment(args: {
  checkoutKind: CheckoutKind;
  providerId: string;
  paymentId: string;
  amount: number;
  currency: string;
  providerPlanId?: string | null;
}): Promise<RazorpayEntityState> {
  const payment = await apiRequest(`/payments/${encodeURIComponent(args.paymentId)}`);
  if (
    text(payment.id) !== args.paymentId ||
    text(payment.status) !== "captured" ||
    integer(payment.amount) !== args.amount ||
    text(payment.currency) !== args.currency
  ) {
    throw new Error("The captured payment did not match this checkout session.");
  }

  if (args.checkoutKind === "order") {
    const order = await apiRequest(`/orders/${encodeURIComponent(args.providerId)}`);
    if (
      text(payment.order_id) !== args.providerId ||
      text(order.id) !== args.providerId ||
      text(order.status) !== "paid" ||
      integer(order.amount_paid) !== args.amount ||
      text(order.currency) !== args.currency
    ) {
      throw new Error("The order has not been paid in full.");
    }
    return {
      providerId: args.providerId,
      state: "active",
      paymentId: args.paymentId,
      startsAt: new Date().toISOString(),
      expiresAt: null,
      cancelAtPeriodEnd: false,
    };
  }

  const subscription = await apiRequest(
    `/subscriptions/${encodeURIComponent(args.providerId)}`,
  );
  if (
    text(subscription.id) !== args.providerId ||
    !args.providerPlanId ||
    text(subscription.plan_id) !== args.providerPlanId
  ) {
    throw new Error("The subscription does not match the selected plan.");
  }
  const state = subscriptionState(subscription);
  if (
    (state.state === "active" || state.state === "grace_period") &&
    !state.expiresAt
  ) {
    throw new Error("The active subscription has no billing period.");
  }
  return { ...state, paymentId: args.paymentId };
}

export async function cancelProviderSubscription(providerId: string): Promise<RazorpayEntityState> {
  if (!providerId.startsWith("sub_")) throw new Error("Subscription ID is invalid.");
  const entity = await apiRequest(
    `/subscriptions/${encodeURIComponent(providerId)}/cancel`,
    { method: "POST", body: { cancel_at_cycle_end: true } },
  );
  const state = subscriptionState(entity);
  return { ...state, cancelAtPeriodEnd: true };
}

export function parseWebhookEvent(payload: unknown): RazorpayEntityState | null {
  const root = record(payload);
  const event = text(root?.event);
  const payloadRecord = record(root?.payload);
  const subscription = record(record(payloadRecord?.subscription)?.entity);
  const order = record(record(payloadRecord?.order)?.entity);
  const payment = record(record(payloadRecord?.payment)?.entity);

  if (event?.startsWith("subscription.") && subscription) {
    const state = subscriptionState(subscription);
    return { ...state, paymentId: text(payment?.id) };
  }
  if (event === "order.paid" && order) {
    const providerId = text(order.id);
    if (!providerId?.startsWith("order_")) throw new Error("Order webhook is invalid.");
    return {
      providerId,
      state: "active",
      paymentId: text(payment?.id),
      startsAt: isoFromSeconds(order.created_at) ?? new Date().toISOString(),
      expiresAt: null,
      cancelAtPeriodEnd: false,
    };
  }
  if (event === "payment.refunded" && payment) {
    const amount = integer(payment.amount);
    const amountRefunded = integer(payment.amount_refunded);
    if (amount === null || amountRefunded === null || amountRefunded < amount) {
      return null;
    }
    const providerId = text(payment.order_id);
    if (!providerId?.startsWith("order_")) return null;
    return {
      providerId,
      state: "revoked",
      paymentId: text(payment.id),
      startsAt: null,
      expiresAt: new Date().toISOString(),
      cancelAtPeriodEnd: false,
    };
  }
  return null;
}

export function webhookTimestamp(payload: unknown): string {
  const createdAt = integer(record(payload)?.created_at);
  return isoFromSeconds(createdAt) ?? new Date().toISOString();
}
