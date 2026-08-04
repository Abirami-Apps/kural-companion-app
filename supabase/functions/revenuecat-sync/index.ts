import { corsHeaders, jsonResponse } from "../_shared/responses.ts";
import { fetchRevenueCatEntitlement, sha256Hex } from "../_shared/revenuecat.ts";
import { applyEntitlement, serviceClient } from "../_shared/supabase.ts";

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

  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return jsonResponse({ error: "Authentication required." }, 401, cors);

    const client = serviceClient();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return jsonResponse({ error: "Authentication required." }, 401, cors);
    }

    const entitlement = await fetchRevenueCatEntitlement(data.user.id);
    await applyEntitlement(client, {
      eventId: null,
      eventType: "CUSTOMER_SYNC",
      eventTimestamp: new Date().toISOString(),
      payloadSha256: await sha256Hex(`customer-sync:${data.user.id}`),
      userId: data.user.id,
      entitlement,
    });

    return jsonResponse({
      ok: true,
      entitlement: {
        status: entitlement.status,
        planKey: entitlement.planKey,
        expiresAt: entitlement.expiresAt,
        cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      },
    }, 200, cors);
  } catch {
    return jsonResponse(
      { error: "Subscription verification is temporarily unavailable." },
      503,
      cors,
    );
  }
});
