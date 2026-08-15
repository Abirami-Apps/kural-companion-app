import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PremiumPromptProvider } from "@/components/subscription/PremiumPromptProvider";
import { usePremiumPrompt } from "@/contexts/PremiumPromptContext";

const mocks = vi.hoisted(() => ({
  startCheckout: vi.fn(),
  refreshEntitlement: vi.fn(),
  auth: {
    user: null as { email: string } | null,
    subscribed: false,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    ...mocks.auth,
    refreshEntitlement: mocks.refreshEntitlement,
  }),
}));

vi.mock("@/lib/checkout", () => ({
  startRazorpayCheckout: mocks.startCheckout,
}));

vi.mock("@/lib/features", () => ({ checkoutEnabled: true }));
vi.mock("@/lib/subscription", () => ({ waitForPremiumActivation: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

function PromptTrigger() {
  const { openPremiumPrompt } = usePremiumPrompt();
  return <button onClick={openPremiumPrompt}>Open premium</button>;
}

describe("premium feature prompt", () => {
  beforeEach(() => {
    mocks.auth.user = null;
    mocks.auth.subscribed = false;
    mocks.startCheckout.mockReset();
  });

  afterEach(() => cleanup());

  it("shows the concise trial price and renewal disclosure", () => {
    render(
      <MemoryRouter>
        <PremiumPromptProvider>
          <PromptTrigger />
        </PremiumPromptProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open premium" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Premium feature");
    expect(screen.getByRole("heading", { name: "Start your 3-day free trial" })).toBeVisible();
    expect(screen.getByText("₹99")).toBeVisible();
    expect(screen.getByText("/month after trial")).toBeVisible();
    expect(screen.getByText("All 1,330 Kurals, meanings and Hourly Kural.")).toBeVisible();
    expect(screen.getByText("Auto-renews at ₹99/month after 3 days until cancelled.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in to start trial" })).toBeVisible();
  });

  it("never starts a paid subscription silently when the trial was already used", async () => {
    mocks.auth.user = { email: "reader@example.com" };
    mocks.startCheckout.mockResolvedValueOnce("trial-unavailable");
    render(
      <MemoryRouter>
        <PremiumPromptProvider>
          <PromptTrigger />
        </PremiumPromptProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open premium" }));
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Kural Companion Plus" })).toBeVisible();
    });
    expect(screen.getByText("This account has already used its introductory trial.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Subscribe for ₹99/month" })).toBeVisible();
    expect(mocks.startCheckout).toHaveBeenCalledTimes(1);
  });
});
