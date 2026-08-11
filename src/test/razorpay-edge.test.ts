import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseWebhookEvent,
  planDefinition,
  publicKeyId,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../../supabase/functions/_shared/razorpay";

const environment: Record<string, string> = {};

async function hmac(secret: string, message: string) {
  const key = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await webcrypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

beforeEach(() => {
  environment.RAZORPAY_ENVIRONMENT = "TEST";
  environment.RAZORPAY_KEY_ID = "rzp_test_1234567890";
  environment.RAZORPAY_KEY_SECRET = "checkout-secret";
  environment.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
  environment.RAZORPAY_MONTHLY_PLAN_ID = "plan_monthly123";
  environment.RAZORPAY_YEARLY_PLAN_ID = "plan_yearly123";
  vi.stubGlobal("Deno", {
    env: { get: (name: string) => environment[name] },
  });
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  for (const key of Object.keys(environment)) delete environment[key];
  vi.unstubAllGlobals();
});

describe("Razorpay server configuration", () => {
  it("keeps the price and checkout kind server-owned", () => {
    expect(planDefinition("monthly")).toMatchObject({
      checkoutKind: "subscription",
      amount: 9900,
      providerPlanId: "plan_monthly123",
    });
    expect(planDefinition("lifetime")).toMatchObject({
      checkoutKind: "order",
      amount: 349900,
      providerPlanId: null,
    });
    expect(() => planDefinition("discounted-lifetime")).toThrow("valid");
  });

  it("rejects a live key in a test deployment", () => {
    environment.RAZORPAY_KEY_ID = "rzp_live_1234567890";
    expect(() => publicKeyId()).toThrow("environment");
  });
});

describe("Razorpay signatures", () => {
  it("uses Razorpay's order and subscription signature ordering", async () => {
    const orderSignature = await hmac(
      environment.RAZORPAY_KEY_SECRET,
      "order_123|pay_123",
    );
    const subscriptionSignature = await hmac(
      environment.RAZORPAY_KEY_SECRET,
      "pay_123|sub_123",
    );
    await expect(verifyCheckoutSignature({
      checkoutKind: "order",
      providerId: "order_123",
      paymentId: "pay_123",
      signature: orderSignature,
    })).resolves.toBe(true);
    await expect(verifyCheckoutSignature({
      checkoutKind: "subscription",
      providerId: "sub_123",
      paymentId: "pay_123",
      signature: subscriptionSignature,
    })).resolves.toBe(true);
  });

  it("validates the exact raw webhook body", async () => {
    const body = '{"event":"order.paid"}';
    const signature = await hmac(environment.RAZORPAY_WEBHOOK_SECRET, body);
    await expect(verifyWebhookSignature(body, signature)).resolves.toBe(true);
    await expect(verifyWebhookSignature(`${body} `, signature)).resolves.toBe(false);
  });
});

describe("Razorpay webhook mapping", () => {
  it("maps an active recurring subscription with its validity window", () => {
    expect(parseWebhookEvent({
      event: "subscription.activated",
      payload: {
        subscription: { entity: {
          id: "sub_123",
          status: "active",
          current_start: 1_785_819_600,
          current_end: 1_788_498_000,
        } },
        payment: { entity: { id: "pay_123" } },
      },
    })).toMatchObject({
      providerId: "sub_123",
      state: "active",
      paymentId: "pay_123",
      cancelAtPeriodEnd: false,
    });
  });

  it("does not grant an authenticated subscription before a paid period exists", () => {
    expect(parseWebhookEvent({
      event: "subscription.authenticated",
      payload: {
        subscription: { entity: {
          id: "sub_123",
          status: "authenticated",
          start_at: 1_785_819_600,
          end_at: 2_732_073_600,
        } },
      },
    })).toMatchObject({
      providerId: "sub_123",
      state: "pending",
      expiresAt: null,
    });
  });

  it("revokes lifetime access only after a full refund", () => {
    const partial = {
      event: "refund.processed",
      payload: {
        refund: { entity: {
          id: "rfnd_123",
          status: "processed",
          payment_id: "pay_123",
        } },
        payment: { entity: {
          id: "pay_123",
          order_id: "order_123",
          amount: 349900,
          amount_refunded: 10000,
        } },
      },
    };
    expect(parseWebhookEvent(partial)).toBeNull();
    expect(parseWebhookEvent({
      ...partial,
      payload: {
        ...partial.payload,
        payment: { entity: {
          ...partial.payload.payment.entity,
          amount_refunded: 349900,
        } },
      },
    })).toMatchObject({ providerId: "order_123", state: "revoked" });
  });
});
