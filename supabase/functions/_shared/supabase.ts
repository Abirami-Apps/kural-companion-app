import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import type { BillingState, CheckoutKind, PlanKey, RazorpayEnvironment } from "./razorpay.ts";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is unavailable.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type ServiceClient = ReturnType<typeof serviceClient>;

export async function authenticatedUser(request: Request, client: ServiceClient) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

function rpcError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createCheckoutSession(client: ServiceClient, args: {
  userId: string;
  planKey: PlanKey;
  checkoutKind: CheckoutKind;
  environment: RazorpayEnvironment;
  amount: number;
  currency: string;
}): Promise<string> {
  const { data, error } = await client.rpc("create_razorpay_checkout_session", {
    p_user_id: args.userId,
    p_plan_key: args.planKey,
    p_checkout_kind: args.checkoutKind,
    p_environment: args.environment,
    p_amount_subunits: args.amount,
    p_currency: args.currency,
  });
  rpcError(error, "Unable to create the checkout session.");
  if (typeof data !== "string") throw new Error("Checkout session creation failed.");
  return data;
}

export async function attachProviderId(client: ServiceClient, args: {
  sessionId: string;
  userId: string;
  providerId: string;
}): Promise<void> {
  const { error } = await client.rpc("attach_razorpay_provider_id", {
    p_session_id: args.sessionId,
    p_user_id: args.userId,
    p_provider_id: args.providerId,
  });
  rpcError(error, "Unable to attach the payment provider session.");
}

export type CheckoutSession = {
  session_id: string;
  plan_key: PlanKey;
  checkout_kind: CheckoutKind;
  provider_id: string;
  environment: RazorpayEnvironment;
  amount_subunits: number;
  currency: string;
};

export async function getCheckoutSession(client: ServiceClient, args: {
  sessionId: string;
  userId: string;
}): Promise<CheckoutSession | null> {
  const { data, error } = await client.rpc("get_razorpay_checkout_session", {
    p_session_id: args.sessionId,
    p_user_id: args.userId,
  });
  rpcError(error, "Unable to read the checkout session.");
  return Array.isArray(data) && data.length ? data[0] as CheckoutSession : null;
}

export async function applyCheckoutState(client: ServiceClient, args: {
  sessionId: string;
  userId: string;
  state: BillingState;
  paymentId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  eventTimestamp: string;
}): Promise<void> {
  const { error } = await client.rpc("apply_razorpay_checkout_state", {
    p_session_id: args.sessionId,
    p_user_id: args.userId,
    p_status: args.state,
    p_payment_id: args.paymentId,
    p_starts_at: args.startsAt,
    p_expires_at: args.expiresAt,
    p_cancel_at_period_end: args.cancelAtPeriodEnd,
    p_event_timestamp: args.eventTimestamp,
  });
  rpcError(error, "Unable to persist the verified payment.");
}

export async function applyWebhookState(client: ServiceClient, args: {
  eventId: string;
  eventType: string;
  eventTimestamp: string;
  environment: RazorpayEnvironment;
  payloadSha256: string;
  providerId: string;
  state: BillingState;
  paymentId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
}): Promise<boolean> {
  const { data, error } = await client.rpc("apply_razorpay_webhook_state", {
    p_event_id: args.eventId,
    p_event_type: args.eventType,
    p_event_timestamp: args.eventTimestamp,
    p_environment: args.environment,
    p_payload_sha256: args.payloadSha256,
    p_provider_id: args.providerId,
    p_status: args.state,
    p_payment_id: args.paymentId,
    p_starts_at: args.startsAt,
    p_expires_at: args.expiresAt,
    p_cancel_at_period_end: args.cancelAtPeriodEnd,
  });
  rpcError(error, "Unable to persist the webhook event.");
  return data === true;
}

export async function currentRecurringSubscription(client: ServiceClient, userId: string) {
  const { data, error } = await client.rpc("get_razorpay_recurring_subscription", {
    p_user_id: userId,
  });
  rpcError(error, "Unable to find the current subscription.");
  return Array.isArray(data) && data.length
    ? data[0] as { session_id: string; provider_id: string }
    : null;
}
