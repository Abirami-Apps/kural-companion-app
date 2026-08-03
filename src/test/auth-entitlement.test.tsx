import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/features", () => ({
  authEnabled: true,
  subscriptionsEnabled: true,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
    },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

function session() {
  return {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "reader@example.com",
    },
  };
}

function EntitlementProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.entitlementStatus}</span>
      <span data-testid="subscribed">{String(auth.subscribed)}</span>
      <span data-testid="plan">{auth.premiumEntitlement.planKey ?? "none"}</span>
      {auth.entitlementError && <span role="alert">{auth.entitlementError}</span>}
    </div>
  );
}

describe("AuthProvider premium entitlement integration", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ data: { session: session() } });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });
    mocks.from.mockImplementation(() => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            status: "active",
            plan_key: "yearly",
            source: "stripe",
            starts_at: "2026-08-01T00:00:00.000Z",
            expires_at: "2027-08-01T00:00:00.000Z",
            cancel_at_period_end: false,
            updated_at: "2026-08-03T00:00:00.000Z",
          },
          error: null,
        }),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("grants premium only after the server predicate succeeds", async () => {
    render(
      <AuthProvider>
        <EntitlementProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("subscribed")).toHaveTextContent("true");
    expect(screen.getByTestId("plan")).toHaveTextContent("yearly");
    expect(mocks.rpc).toHaveBeenCalledWith("has_active_entitlement", {
      requested_entitlement: "premium",
    });
  });

  it("fails closed when the server cannot verify access", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "network unavailable" },
    });

    render(
      <AuthProvider>
        <EntitlementProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
    expect(screen.getByTestId("subscribed")).toHaveTextContent("false");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not verify your subscription",
    );
  });
});
