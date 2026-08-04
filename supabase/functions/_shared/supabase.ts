import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import type { ResolvedEntitlement } from "./revenuecat.ts";

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

export async function findExistingUserId(
  client: ReturnType<typeof serviceClient>,
  candidates: string[],
): Promise<string | null> {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const candidate of candidates) {
    if (!uuidPattern.test(candidate)) continue;
    const { data, error } = await client
      .from("user_entitlements")
      .select("user_id")
      .eq("user_id", candidate)
      .eq("entitlement_key", "premium")
      .maybeSingle();
    if (error) throw new Error("Unable to match the billing account.");
    if (data?.user_id === candidate) return candidate;
  }
  return null;
}

export async function applyEntitlement(
  client: ReturnType<typeof serviceClient>,
  args: {
    eventId: string | null;
    eventType: string;
    eventTimestamp: string;
    payloadSha256: string;
    userId: string;
    entitlement: ResolvedEntitlement;
  },
): Promise<boolean> {
  const { data, error } = await client.rpc("apply_revenuecat_entitlement_sync", {
    p_event_id: args.eventId,
    p_user_id: args.userId,
    p_event_type: args.eventType,
    p_event_timestamp: args.eventTimestamp,
    p_environment: args.entitlement.environment,
    p_status: args.entitlement.status,
    p_plan_key: args.entitlement.planKey,
    p_starts_at: args.entitlement.startsAt,
    p_expires_at: args.entitlement.expiresAt,
    p_cancel_at_period_end: args.entitlement.cancelAtPeriodEnd,
    p_payload_sha256: args.payloadSha256,
  });
  if (error) throw new Error("Unable to persist the entitlement state.");
  return data === true;
}
