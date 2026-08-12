import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCheckoutSession, startRazorpayCheckout } from "@/lib/checkout";
import { safeInternalPath } from "@/lib/navigation";

const validSession = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  keyId: "rzp_test_1234567890",
  checkoutKind: "subscription",
  providerId: "sub_1234567890",
  amount: 99900,
  currency: "INR",
  planId: "yearly",
  description: "Kural Companion Plus Yearly",
};

describe("Razorpay checkout session validation", () => {
  it("accepts a server-created recurring checkout session", () => {
    expect(parseCheckoutSession(validSession)).toEqual(validSession);
  });

  it("accepts only lifetime purchases as one-time orders", () => {
    expect(parseCheckoutSession({
      ...validSession,
      checkoutKind: "order",
      providerId: "order_1234567890",
      planId: "lifetime",
      amount: 349900,
      description: "Kural Companion Plus Lifetime",
    })).toMatchObject({ checkoutKind: "order", planId: "lifetime" });

    expect(() => parseCheckoutSession({
      ...validSession,
      checkoutKind: "order",
      providerId: "order_1234567890",
    })).toThrow("invalid");
  });

  it("rejects malformed IDs, currencies and amounts", () => {
    expect(() => parseCheckoutSession({ ...validSession, sessionId: "another-user" }))
      .toThrow("invalid");
    expect(() => parseCheckoutSession({ ...validSession, currency: "USD" }))
      .toThrow("invalid");
    expect(() => parseCheckoutSession({ ...validSession, amount: 0 }))
      .toThrow("invalid");
  });
});

describe("Razorpay browser checkout", () => {
  afterEach(() => {
    delete window.Razorpay;
  });

  it("verifies the provider callback through the authenticated Edge Function", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ data: { ok: true, ...validSession }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    window.Razorpay = function RazorpayMock(options) {
      return {
        open: () => options.handler({
          razorpay_payment_id: "pay_123",
          razorpay_subscription_id: validSession.providerId,
          razorpay_signature: "a".repeat(64),
        }),
        on: vi.fn(),
      };
    } as unknown as typeof window.Razorpay;

    await expect(startRazorpayCheckout({
      client,
      planId: "yearly",
      email: "reader@example.com",
    })).resolves.toBe("verified");
    expect(invoke).toHaveBeenNthCalledWith(1, "razorpay-checkout", {
      body: { planId: "yearly" },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "razorpay-verify", {
      body: {
        sessionId: validSession.sessionId,
        razorpay_payment_id: "pay_123",
        razorpay_subscription_id: validSession.providerId,
        razorpay_signature: "a".repeat(64),
      },
    });
  });

  it("does not verify or grant access when checkout is dismissed", async () => {
    const invoke = vi.fn().mockResolvedValueOnce({
      data: { ok: true, ...validSession },
      error: null,
    });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    window.Razorpay = function RazorpayMock(options) {
      return {
        open: () => options.modal?.ondismiss?.(),
        on: vi.fn(),
      };
    } as unknown as typeof window.Razorpay;

    await expect(startRazorpayCheckout({
      client,
      planId: "yearly",
      email: null,
    })).resolves.toBe("dismissed");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe("post-login navigation", () => {
  it("keeps safe internal subscription returns", () => {
    expect(safeInternalPath("/subscribe?plan=monthly")).toBe(
      "/subscribe?plan=monthly",
    );
  });

  it("rejects external and protocol-relative returns", () => {
    expect(safeInternalPath("https://attacker.example/checkout")).toBe("/");
    expect(safeInternalPath("//attacker.example/checkout")).toBe("/");
  });
});
