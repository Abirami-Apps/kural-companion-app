import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelRazorpayRenewal,
  parseCheckoutSession,
  startRazorpayCheckout,
} from "@/lib/checkout";
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
  trialEligible: false,
  trialEndsAt: null,
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
    let checkoutOptions: ConstructorParameters<NonNullable<typeof window.Razorpay>>[0] | undefined;
    const invoke = vi.fn()
      .mockResolvedValueOnce({ data: { ok: true, ...validSession }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    window.Razorpay = function RazorpayMock(options) {
      checkoutOptions = options;
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
    expect(checkoutOptions).not.toHaveProperty("amount");
  });

  it("stops before opening checkout when the introductory trial was already used", async () => {
    const invoke = vi.fn().mockResolvedValueOnce({
      data: { ok: true, trialEligible: false, planId: "monthly" },
      error: null,
    });
    const client = { functions: { invoke } } as unknown as SupabaseClient;

    await expect(startRazorpayCheckout({
      client,
      planId: "monthly",
      email: "reader@example.com",
      requireTrial: true,
    })).resolves.toBe("trial-unavailable");
    expect(invoke).toHaveBeenCalledWith("razorpay-checkout", {
      body: { planId: "monthly", trialRequired: true },
    });
    expect(window.Razorpay).toBeUndefined();
  });

  it("opens an eligible monthly trial without passing a recurring charge amount", async () => {
    let checkoutOptions: ConstructorParameters<NonNullable<typeof window.Razorpay>>[0] | undefined;
    const trialSession = {
      ...validSession,
      planId: "monthly",
      providerId: "sub_trial123456",
      amount: 9900,
      description: "Kural Companion Plus Monthly",
      trialEligible: true,
      trialEndsAt: "2026-08-18T07:00:00.000Z",
    };
    const invoke = vi.fn()
      .mockResolvedValueOnce({ data: { ok: true, ...trialSession }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    window.Razorpay = function RazorpayMock(options) {
      checkoutOptions = options;
      return {
        open: () => options.handler({
          razorpay_payment_id: "pay_trial123",
          razorpay_subscription_id: trialSession.providerId,
          razorpay_signature: "c".repeat(64),
        }),
        on: vi.fn(),
      };
    } as unknown as typeof window.Razorpay;

    await expect(startRazorpayCheckout({
      client,
      planId: "monthly",
      email: "reader@example.com",
      requireTrial: true,
    })).resolves.toBe("verified");
    expect(checkoutOptions).toMatchObject({
      subscription_id: trialSession.providerId,
      description: "3-day free trial · then ₹99/month",
    });
    expect(checkoutOptions).not.toHaveProperty("amount");
    expect(checkoutOptions).not.toHaveProperty("currency");
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

  it("treats a delayed verification response as pending after payment", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ data: { ok: true, ...validSession }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Edge Function returned a non-2xx status code" },
      });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    window.Razorpay = function RazorpayMock(options) {
      return {
        open: () => options.handler({
          razorpay_payment_id: "pay_pending123",
          razorpay_subscription_id: validSession.providerId,
          razorpay_signature: "b".repeat(64),
        }),
        on: vi.fn(),
      };
    } as unknown as typeof window.Razorpay;

    await expect(startRazorpayCheckout({
      client,
      planId: "yearly",
      email: "reader@example.com",
    })).resolves.toBe("pending");
  });

  it("shows the safe server cancellation error instead of a transport error", async () => {
    const invoke = vi.fn().mockResolvedValueOnce({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response(JSON.stringify({
          error: "We could not cancel renewal. Please contact support.",
        }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      },
    });
    const client = { functions: { invoke } } as unknown as SupabaseClient;

    await expect(cancelRazorpayRenewal(client)).rejects.toThrow(
      "We could not cancel renewal. Please contact support.",
    );
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
