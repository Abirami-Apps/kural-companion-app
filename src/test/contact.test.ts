import { describe, expect, it } from "vitest";
import { buildSupportMailto, SUPPORT_EMAIL } from "@/lib/contact";

describe("contact email composer", () => {
  it("builds an encoded support email with the supplied details", () => {
    const url = buildSupportMailto({
      name: "Kani & Co",
      email: "kani@example.com",
      topic: "Purchase or subscription",
      message: "Please help with order order_123.",
    });

    expect(url).toMatch(new RegExp(`^mailto:${SUPPORT_EMAIL}\\?`));
    const query = new URL(url).searchParams;
    expect(query.get("subject")).toBe(
      "Kural Companion support: Purchase or subscription",
    );
    expect(query.get("body")).toContain("Name: Kani & Co");
    expect(query.get("body")).toContain("Reply email: kani@example.com");
    expect(query.get("body")).toContain("Please help with order order_123.");
  });

  it("keeps header fields on one line and handles a missing optional name", () => {
    const url = buildSupportMailto({
      name: "\n",
      email: "person@example.com\r\nUnexpected: value",
      topic: "Technical problem",
      message: "Audio does not start on my device.",
    });
    const body = new URL(url).searchParams.get("body");

    expect(body).toContain("Name: Not provided");
    expect(body).toContain("Reply email: person@example.com Unexpected: value");
  });
});
