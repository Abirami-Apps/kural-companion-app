import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSupportMailto, getContactEndpoint, submitSupportMessage, SUPPORT_EMAIL } from "@/lib/contact";

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

describe("direct support submission", () => {
  const input = { name: " Kani ", email: " kani@example.com ", topic: "Technical problem" as const,
    message: " Audio does not start. ", website: "" };
  const endpoint = "https://api.abirami.app/contact.php";
  afterEach(() => vi.unstubAllGlobals());

  it("enables only a valid HTTPS endpoint without embedded credentials", () => {
    expect(getContactEndpoint(undefined)).toBe("");
    expect(getContactEndpoint("http://example.com/contact")).toBe("");
    expect(getContactEndpoint("https://password@example.com/contact")).toBe("");
    expect(getContactEndpoint("https://example.com/contact#secret")).toBe("");
    expect(getContactEndpoint(` ${endpoint} `)).toBe(endpoint);
  });

  it("sends only form fields and requires a confirmed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await submitSupportMessage(input, endpoint);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(endpoint);
    expect(options).toMatchObject({ method: "POST", credentials: "omit", redirect: "error" });
    expect(JSON.parse(options.body)).toEqual({ name: "Kani", email: "kani@example.com",
      topic: "Technical problem", message: "Audio does not start.", website: "" });
  });

  it.each([200, 503])("does not treat an unconfirmed %i response as success", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status })));
    await expect(submitSupportMessage(input, endpoint)).rejects.toThrow("could not be confirmed");
  });

  it("handles sending limits and network failures without leaking server details", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockRejectedValueOnce(new Error("smtp password: private"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitSupportMessage(input, endpoint)).rejects.toThrow("Too many messages");
    await expect(submitSupportMessage(input, endpoint)).rejects.toThrow("Your draft is kept");
  });

  it("does not send if the endpoint is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitSupportMessage(input, "")).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
