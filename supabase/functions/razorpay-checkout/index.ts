import { corsHeaders, jsonResponse } from "../_shared/responses.ts";
import {
  createProviderCheckout,
  planDefinition,
  publicKeyId,
  razorpayEnvironment,
} from "../_shared/razorpay.ts";
import {
  attachProviderId,
  authenticatedUser,
  createCheckoutSession,
  serviceClient,
  trialEligible,
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

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const definition = planDefinition(body?.planId);
    const trialRequired = body?.trialRequired === true;
    if (trialRequired && definition.planKey !== "monthly") {
      return jsonResponse({ error: "The free trial is available only with the monthly plan." }, 400, cors);
    }
    const environment = razorpayEnvironment();
    if (trialRequired && !await trialEligible(client, { userId: user.id, environment })) {
      return jsonResponse({
        ok: true,
        trialEligible: false,
        planId: definition.planKey,
      }, 200, cors);
    }
    const checkoutSession = await createCheckoutSession(client, {
      userId: user.id,
      planKey: definition.planKey,
      checkoutKind: definition.checkoutKind,
      environment,
      amount: definition.amount,
      currency: definition.currency,
      trialDays: trialRequired ? definition.trialDays : 0,
    });
    if (trialRequired && !checkoutSession.trialEndsAt) {
      return jsonResponse({
        ok: true,
        trialEligible: false,
        planId: definition.planKey,
      }, 200, cors);
    }
    const providerId = await createProviderCheckout({
      definition,
      userId: user.id,
      sessionId: checkoutSession.sessionId,
      trialEndsAt: checkoutSession.trialEndsAt,
    });
    await attachProviderId(client, {
      sessionId: checkoutSession.sessionId,
      userId: user.id,
      providerId,
    });

    return jsonResponse({
      ok: true,
      sessionId: checkoutSession.sessionId,
      keyId: publicKeyId(),
      checkoutKind: definition.checkoutKind,
      providerId,
      amount: definition.amount,
      currency: definition.currency,
      planId: definition.planKey,
      description: definition.description,
      trialEligible: Boolean(checkoutSession.trialEndsAt),
      trialEndsAt: checkoutSession.trialEndsAt,
    }, 200, cors);
  } catch (error) {
    const invalidPlan = error instanceof Error &&
      error.message === "Choose a valid Kural Companion plan.";
    return jsonResponse(
      { error: invalidPlan ? error.message : "Secure checkout is temporarily unavailable." },
      invalidPlan ? 400 : 503,
      cors,
    );
  }
});
