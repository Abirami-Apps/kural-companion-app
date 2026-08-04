import { describe, expect, it } from "vitest";
import {
  buildRevenueCatPurchaseUrl,
  isValidRevenueCatPurchaseUrl,
} from "@/lib/checkout";
import { safeInternalPath } from "@/lib/navigation";

describe("RevenueCat checkout links", () => {
  it("accepts only a token-only RevenueCat HTTPS purchase URL", () => {
    expect(isValidRevenueCatPurchaseUrl("https://pay.rev.cat/linkToken")).toBe(true);
    expect(isValidRevenueCatPurchaseUrl("http://pay.rev.cat/linkToken")).toBe(false);
    expect(isValidRevenueCatPurchaseUrl("https://pay.rev.cat/linkToken/user-id")).toBe(false);
    expect(isValidRevenueCatPurchaseUrl("https://pay.rev.cat/linkToken?plan=monthly")).toBe(false);
    expect(isValidRevenueCatPurchaseUrl("https://example.com/linkToken")).toBe(false);
  });

  it("binds checkout to the signed-in UUID and requested package", () => {
    const checkout = new URL(buildRevenueCatPurchaseUrl({
      baseUrl: "https://pay.rev.cat/linkToken",
      userId: "11111111-1111-4111-8111-111111111111",
      email: "reader@example.com",
      planId: "yearly",
    }));

    expect(checkout.origin).toBe("https://pay.rev.cat");
    expect(checkout.pathname).toBe(
      "/linkToken/11111111-1111-4111-8111-111111111111",
    );
    expect(checkout.searchParams.get("package_id")).toBe("$rc_annual");
    expect(checkout.searchParams.get("email")).toBe("reader@example.com");
  });

  it("rejects malformed account identifiers", () => {
    expect(() => buildRevenueCatPurchaseUrl({
      baseUrl: "https://pay.rev.cat/linkToken",
      userId: "../../another-user",
      planId: "monthly",
    })).toThrow("valid signed-in account");
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
