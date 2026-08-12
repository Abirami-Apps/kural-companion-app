import { describe, expect, it } from "vitest";
import { nativeRouteFromUrl } from "@/lib/native";

describe("nativeRouteFromUrl", () => {
  it("accepts canonical Kural Companion links", () => {
    expect(nativeRouteFromUrl("https://kural.abirami.app/kural/1330?autoplay=1")).toBe(
      "/kural/1330?autoplay=1",
    );
    expect(nativeRouteFromUrl("https://kural.abirami.app/chapters")).toBe("/chapters");
  });

  it("accepts the private app scheme", () => {
    expect(nativeRouteFromUrl("kuralcompanion://kural/141")).toBe("/kural/141");
    expect(nativeRouteFromUrl("kuralcompanion://reset-password?code=test")).toBe(
      "/reset-password?code=test",
    );
  });

  it("rejects unknown hosts, routes, and invalid Kural numbers", () => {
    expect(nativeRouteFromUrl("https://example.com/kural/141")).toBeNull();
    expect(nativeRouteFromUrl("https://kural.abirami.app/admin")).toBeNull();
    expect(nativeRouteFromUrl("kuralcompanion://kural/1331")).toBeNull();
    expect(nativeRouteFromUrl("not a url")).toBeNull();
  });
});
