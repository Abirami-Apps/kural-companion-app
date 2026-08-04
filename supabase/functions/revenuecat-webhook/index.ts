import { jsonResponse } from "../_shared/responses.ts";
import {
  fetchRevenueCatEntitlement,
  parseWebhookIdentity,
  sha256Hex,
  verifyAuthorization,
  verifyWebhookSignature,
} from "../_shared/revenuecat.ts";
import {
  applyEntitlement,
  findExistingUserId,
  serviceClient,
} from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const rawBody = await request.text();
  if (!verifyAuthorization(request.headers.get("authorization"))) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  if (!(await verifyWebhookSignature(
    rawBody,
    request.headers.get("x-revenuecat-webhook-signature"),
  ))) {
    return jsonResponse({ error: "Invalid webhook signature." }, 401);
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    const identity = parseWebhookIdentity(payload);
    const client = serviceClient();
    const userId = await findExistingUserId(client, identity.candidateUserIds);
    if (!userId) {
      return jsonResponse({ ok: true, applied: false, reason: "unmatched-user" });
    }

    const entitlement = await fetchRevenueCatEntitlement(userId);
    if (identity.environment && identity.environment !== entitlement.environment) {
      return jsonResponse({ ok: true, applied: false, reason: "environment-mismatch" });
    }

    const applied = await applyEntitlement(client, {
      eventId: identity.eventId,
      eventType: identity.eventType,
      eventTimestamp: identity.eventTimestamp,
      payloadSha256: await sha256Hex(rawBody),
      userId,
      entitlement,
    });
    return jsonResponse({ ok: true, applied });
  } catch {
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
});
