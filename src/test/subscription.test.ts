import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchPremiumEntitlement,
  INACTIVE_PREMIUM_ENTITLEMENT,
  isPremiumEntitlementActive,
  parsePremiumEntitlement,
} from "@/lib/subscription";

const now = Date.parse("2026-08-03T12:00:00.000Z");

describe("premium entitlement validation", () => {
  it.each(["active", "trialing", "grace_period"] as const)(
    "accepts a current %s entitlement",
    (status) => {
      expect(
        isPremiumEntitlementActive(
          {
            status,
            startsAt: "2026-08-01T00:00:00.000Z",
            expiresAt: "2026-09-01T00:00:00.000Z",
          },
          now,
        ),
      ).toBe(true);
    },
  );

  it("rejects inactive, expired, revoked, paused, future, and elapsed access", () => {
    for (const status of ["inactive", "expired", "revoked", "paused"] as const) {
      expect(
        isPremiumEntitlementActive({ status, startsAt: null, expiresAt: null }, now),
      ).toBe(false);
    }
    expect(
      isPremiumEntitlementActive(
        {
          status: "active",
          startsAt: "2026-08-04T00:00:00.000Z",
          expiresAt: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isPremiumEntitlementActive(
        {
          status: "active",
          startsAt: null,
          expiresAt: "2026-08-03T12:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("parses browser-safe plan details from a valid server row", () => {
    expect(
      parsePremiumEntitlement(
        {
          status: "active",
          plan_key: "yearly",
          source: "stripe",
          starts_at: "2026-08-01T00:00:00.000Z",
          expires_at: "2027-08-01T00:00:00.000Z",
          cancel_at_period_end: true,
          updated_at: "2026-08-02T00:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      active: true,
      status: "active",
      planKey: "yearly",
      source: "stripe",
      startsAt: "2026-08-01T00:00:00.000Z",
      expiresAt: "2027-08-01T00:00:00.000Z",
      cancelAtPeriodEnd: true,
      updatedAt: "2026-08-02T00:00:00.000Z",
    });
  });

  it("fails closed for missing, unknown, or malformed server data", () => {
    expect(parsePremiumEntitlement(null, now)).toEqual(INACTIVE_PREMIUM_ENTITLEMENT);
    expect(parsePremiumEntitlement({ status: "owner" }, now)).toEqual(
      INACTIVE_PREMIUM_ENTITLEMENT,
    );
    expect(
      parsePremiumEntitlement(
        {
          status: "active",
          starts_at: "not-a-date",
          expires_at: "also-not-a-date",
        },
        now,
      ),
    ).toMatchObject({ active: false, startsAt: null, expiresAt: null });
  });

  it("uses the server predicate as the final access decision", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          status: "active",
          plan_key: "yearly",
          starts_at: "2026-08-01T00:00:00.000Z",
          expires_at: "2027-08-01T00:00:00.000Z",
        },
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const client = {
      from: vi.fn().mockReturnValue(query),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as SupabaseClient;

    await expect(fetchPremiumEntitlement(client, "user-1")).resolves.toMatchObject({
      status: "active",
      active: false,
    });
    expect(client.rpc).toHaveBeenCalledWith("has_active_entitlement", {
      requested_entitlement: "premium",
    });
  });
});
