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
    const environment = razorpayEnvironment();
    const sessionId = await createCheckoutSession(client, {
      userId: user.id,
      planKey: definition.planKey,
      checkoutKind: definition.checkoutKind,
      environment,
      amount: definition.amount,
      currency: definition.currency,
    });
    const providerId = await createProviderCheckout({
      definition,
      userId: user.id,
      sessionId,
    });
    await attachProviderId(client, { sessionId, userId: user.id, providerId });

    return jsonResponse({
      ok: true,
      sessionId,
      keyId: publicKeyId(),
      checkoutKind: definition.checkoutKind,
      providerId,
      amount: definition.amount,
      currency: definition.currency,
      planId: definition.planKey,
      description: definition.description,
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
