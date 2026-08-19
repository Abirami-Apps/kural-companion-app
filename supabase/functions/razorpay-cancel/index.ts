import { corsHeaders, jsonResponse } from "../_shared/responses.ts";
import { cancelProviderSubscription } from "../_shared/razorpay.ts";
import {
  applyCheckoutState,
  authenticatedUser,
  currentRecurringSubscription,
  serviceClient,
} from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") {
    if (!cors["Access-Control-Allow-Origin"]) {
      return jsonResponse({ error: "Origin is not allowed." }, 403, cors);
    }
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, cors);
  }
  if (!cors["Access-Control-Allow-Origin"]) {
    return jsonResponse({ error: "Origin is not allowed." }, 403, cors);
  }

  try {
    const client = serviceClient();
    const user = await authenticatedUser(request, client);
    if (!user) return jsonResponse({ error: "Authentication required." }, 401, cors);
    const subscription = await currentRecurringSubscription(client, user.id);
    if (!subscription) {
      return jsonResponse({ error: "No renewable web subscription was found." }, 404, cors);
    }
    const state = await cancelProviderSubscription(subscription.provider_id);
    await applyCheckoutState(client, {
      sessionId: subscription.session_id,
      userId: user.id,
      state: state.state,
      paymentId: state.paymentId,
      startsAt: state.startsAt,
      expiresAt: state.expiresAt,
      cancelAtPeriodEnd: true,
      eventTimestamp: new Date().toISOString(),
    });
    return jsonResponse({ ok: true }, 200, cors);
  } catch (error) {
    console.error(
      "Razorpay renewal cancellation failed:",
      error instanceof Error ? error.message : "Unknown cancellation error",
    );
    return jsonResponse(
      { error: "We could not cancel renewal. Please contact support." },
      503,
      cors,
    );
  }
});
