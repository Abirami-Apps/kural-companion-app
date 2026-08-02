import { describe, expect, it } from "vitest";
import { canAccessKuralWith, canUsePremiumFeaturesWith } from "@/hooks/useEntitlements";

describe("centralized entitlement rules", () => {
  it("allows every valid kural when subscriptions are disabled", () => {
    expect(canAccessKuralWith(1, { gatingEnabled: false, subscribed: false })).toBe(true);
    expect(canAccessKuralWith(1330, { gatingEnabled: false, subscribed: false })).toBe(true);
  });

  it("enforces the free boundary when gating is enabled", () => {
    expect(canAccessKuralWith(10, { gatingEnabled: true, subscribed: false })).toBe(true);
    expect(canAccessKuralWith(11, { gatingEnabled: true, subscribed: false })).toBe(false);
  });

  it("allows paid subscribers and rejects invalid numbers", () => {
    expect(canAccessKuralWith(1330, { gatingEnabled: true, subscribed: true })).toBe(true);
    expect(canAccessKuralWith(0, { gatingEnabled: false, subscribed: true })).toBe(false);
    expect(canAccessKuralWith(1331, { gatingEnabled: false, subscribed: true })).toBe(false);
  });

  it("opens premium previews safely and requires a subscription after launch", () => {
    expect(canUsePremiumFeaturesWith({ subscriptionsEnabled: false, subscribed: false })).toBe(true);
    expect(canUsePremiumFeaturesWith({ subscriptionsEnabled: true, subscribed: false })).toBe(false);
    expect(canUsePremiumFeaturesWith({ subscriptionsEnabled: true, subscribed: true })).toBe(true);
  });
});
