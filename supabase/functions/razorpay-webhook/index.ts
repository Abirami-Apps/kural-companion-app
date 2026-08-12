import { jsonResponse } from "../_shared/responses.ts";
import {
  parseWebhookEvent,
  razorpayEnvironment,
  sha256Hex,
  verifyWebhookSignature,
  webhookTimestamp,
} from "../_shared/razorpay.ts";
import { applyWebhookState, serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  const rawBody = await request.text();
  if (!(await verifyWebhookSignature(
    rawBody,
    request.headers.get("x-razorpay-signature"),
  ))) {
    return jsonResponse({ error: "Invalid webhook signature." }, 401);
  }
  const eventId = request.headers.get("x-razorpay-event-id")?.trim();
  if (!eventId || eventId.length > 160) {
    return jsonResponse({ error: "Webhook event ID is missing or invalid." }, 400);
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    const eventType = (
      payload && typeof payload === "object" && "event" in payload
        ? String(payload.event)
        : ""
    ).trim();
    if (!eventType || eventType.length > 80) {
      return jsonResponse({ error: "Webhook event type is invalid." }, 400);
    }
    const state = parseWebhookEvent(payload);
    if (!state) return jsonResponse({ ok: true, applied: false, reason: "ignored-event" });

    const applied = await applyWebhookState(serviceClient(), {
      eventId,
      eventType,
      eventTimestamp: webhookTimestamp(payload),
      environment: razorpayEnvironment(),
      payloadSha256: await sha256Hex(rawBody),
      providerId: state.providerId,
      state: state.state,
      paymentId: state.paymentId,
      startsAt: state.startsAt,
      expiresAt: state.expiresAt,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    });
    return jsonResponse({ ok: true, applied });
  } catch {
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
});
