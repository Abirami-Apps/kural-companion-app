import { corsHeaders, jsonResponse } from "../_shared/responses.ts";
import {
  planDefinition,
  verifyCheckoutSignature,
  verifyProviderPayment,
} from "../_shared/razorpay.ts";
import {
  applyCheckoutState,
  authenticatedUser,
  getCheckoutSession,
  serviceClient,
} from "../_shared/supabase.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_PATTERN = /^pay_[A-Za-z0-9]+$/;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;

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
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const paymentId = typeof body?.razorpay_payment_id === "string"
      ? body.razorpay_payment_id
      : "";
    const signature = typeof body?.razorpay_signature === "string"
      ? body.razorpay_signature
      : "";
    if (
      !UUID_PATTERN.test(sessionId) ||
      !PAYMENT_PATTERN.test(paymentId) ||
      !SIGNATURE_PATTERN.test(signature)
    ) {
      return jsonResponse({ error: "Payment verification details are invalid." }, 400, cors);
    }

    const session = await getCheckoutSession(client, { sessionId, userId: user.id });
    if (!session) return jsonResponse({ error: "Checkout session was not found." }, 404, cors);
    const returnedProviderId = session.checkout_kind === "order"
      ? body?.razorpay_order_id
      : body?.razorpay_subscription_id;
    if (returnedProviderId !== session.provider_id) {
      return jsonResponse({ error: "Payment verification details do not match." }, 400, cors);
    }
    if (!(await verifyCheckoutSignature({
      checkoutKind: session.checkout_kind,
      providerId: session.provider_id,
      paymentId,
      signature,
    }))) {
      return jsonResponse({ error: "Payment signature is invalid." }, 401, cors);
    }

    const state = await verifyProviderPayment({
      checkoutKind: session.checkout_kind,
      providerId: session.provider_id,
      paymentId,
      amount: session.amount_subunits,
      currency: session.currency,
      providerPlanId: planDefinition(session.plan_key).providerPlanId,
    });
    await applyCheckoutState(client, {
      sessionId,
      userId: user.id,
      state: state.state,
      paymentId: state.paymentId,
      startsAt: state.startsAt,
      expiresAt: state.expiresAt,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      eventTimestamp: new Date().toISOString(),
    });
    return jsonResponse({ ok: true }, 200, cors);
  } catch {
    return jsonResponse(
      { error: "Payment was received, but verification is still pending. Contact support if this continues." },
      503,
      cors,
    );
  }
});
