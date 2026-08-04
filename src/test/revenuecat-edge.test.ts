import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseWebhookIdentity,
  resolveRevenueCatEntitlement,
  verifyWebhookSignature,
} from "../../supabase/functions/_shared/revenuecat";

const environment: Record<string, string> = {};
const monthlyProduct = "pri_monthly";

function customerInfo(overrides: Record<string, unknown> = {}) {
  return {
    subscriber: {
      entitlements: {
        premium: {
          product_identifier: monthlyProduct,
          purchase_date: "2026-08-04T05:23:00.000Z",
          expires_date: "2026-09-04T05:23:00.000Z",
          grace_period_expires_date: null,
        },
      },
      subscriptions: {
        [monthlyProduct]: {
          is_sandbox: true,
          purchase_date: "2026-08-04T05:23:00.000Z",
          expires_date: "2026-09-04T05:23:00.000Z",
          unsubscribe_detected_at: null,
        },
      },
      non_subscriptions: {},
      ...overrides,
    },
  };
}

beforeEach(() => {
  environment.REVENUECAT_ALLOWED_ENVIRONMENTS = "SANDBOX";
  environment.REVENUECAT_MONTHLY_PRODUCT_ID = monthlyProduct;
  environment.REVENUECAT_WEBHOOK_HMAC_SECRET = "test-signing-secret";
  vi.stubGlobal("Deno", {
    env: { get: (name: string) => environment[name] },
  });
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  for (const key of Object.keys(environment)) delete environment[key];
  vi.unstubAllGlobals();
});

describe("RevenueCat entitlement resolution", () => {
  it("resolves a current sandbox subscription to the configured plan", () => {
    expect(
      resolveRevenueCatEntitlement(
        customerInfo(),
        Date.parse("2026-08-05T00:00:00.000Z"),
      ),
    ).toEqual({
      status: "active",
      planKey: "monthly",
      startsAt: "2026-08-04T05:23:00.000Z",
      expiresAt: "2026-09-04T05:23:00.000Z",
      cancelAtPeriodEnd: false,
      environment: "SANDBOX",
    });
  });

  it("fails closed when a purchase comes from a disallowed environment", () => {
    environment.REVENUECAT_ALLOWED_ENVIRONMENTS = "PRODUCTION";
    expect(
      resolveRevenueCatEntitlement(
        customerInfo(),
        Date.parse("2026-08-05T00:00:00.000Z"),
      ),
    ).toMatchObject({ status: "inactive", planKey: null });
  });

  it("keeps cancelled subscriptions active until their paid expiry", () => {
    const info = customerInfo();
    const subscription = (
      info.subscriber.subscriptions[monthlyProduct]
    );
    subscription.unsubscribe_detected_at = "2026-08-05T00:00:00.000Z";

    expect(
      resolveRevenueCatEntitlement(
        info,
        Date.parse("2026-08-06T00:00:00.000Z"),
      ),
    ).toMatchObject({ status: "active", cancelAtPeriodEnd: true });
  });
});
describe("RevenueCat webhook verification", () => {
  it("extracts unique subscriber identity candidates", () => {
    expect(parseWebhookIdentity({
      api_version: "1.0",
      event: {
        id: "evt_1",
        type: "INITIAL_PURCHASE",
        event_timestamp_ms: 1_785_819_600_000,
        environment: "SANDBOX",
        app_user_id: "11111111-1111-4111-8111-111111111111",
        original_app_user_id: "11111111-1111-4111-8111-111111111111",
        aliases: ["22222222-2222-4222-8222-222222222222"],
      },
    })).toMatchObject({
      eventId: "evt_1",
      eventType: "INITIAL_PURCHASE",
      environment: "SANDBOX",
      candidateUserIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
  });

  it("accepts an exact raw-body HMAC and rejects changed content", async () => {
    const timestamp = 1_785_819_600;
    const body = '{"event":{"id":"evt_1"}}';
    const key = await webcrypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(environment.REVENUECAT_WEBHOOK_HMAC_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await webcrypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${body}`),
    );
    const signature = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const header = `t=${timestamp},v1=${signature}`;

    await expect(verifyWebhookSignature(body, header, timestamp)).resolves.toBe(true);
    await expect(
      verifyWebhookSignature(`${body} `, header, timestamp),
    ).resolves.toBe(false);
  });
});
