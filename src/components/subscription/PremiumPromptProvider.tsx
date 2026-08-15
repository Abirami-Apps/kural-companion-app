import { Crown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PremiumPromptContext } from "@/contexts/PremiumPromptContext";
import { useAuth } from "@/hooks/useAuth";
import { startRazorpayCheckout } from "@/lib/checkout";
import { checkoutEnabled } from "@/lib/features";
import { waitForPremiumActivation } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type PromptMode = "trial" | "standard";
type PromptStatus = "idle" | "opening" | "activating";

export function PremiumPromptProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, subscribed, refreshEntitlement } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PromptMode>("trial");
  const [status, setStatus] = useState<PromptStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const activationRunRef = useRef(0);

  const openPremiumPrompt = useCallback(() => {
    setMode("trial");
    setStatus("idle");
    setError(null);
    setOpen(true);
  }, []);

  useEffect(() => () => {
    activationRunRef.current += 1;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!user || subscribed || params.get("premium") !== "1") return;
    params.delete("premium");
    const nextSearch = params.toString();
    navigate(
      `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`,
      { replace: true },
    );
    openPremiumPrompt();
  }, [location.hash, location.pathname, location.search, navigate, openPremiumPrompt, subscribed, user]);

  const signInForTrial = () => {
    const params = new URLSearchParams(location.search);
    params.set("premium", "1");
    const returnTo = `${location.pathname}?${params.toString()}${location.hash}`;
    setOpen(false);
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const activateAccess = async () => {
    const run = ++activationRunRef.current;
    setStatus("activating");
    const active = await waitForPremiumActivation(refreshEntitlement, {
      shouldContinue: () => activationRunRef.current === run,
    });
    if (activationRunRef.current !== run) return;
    if (active) {
      setOpen(false);
      setStatus("idle");
      return;
    }
    setStatus("idle");
    setError(
      "Your subscription was authorised, but access is still updating. Please wait a moment and try again.",
    );
  };

  const beginCheckout = async () => {
    setError(null);
    if (!user) {
      signInForTrial();
      return;
    }
    if (subscribed) {
      setOpen(false);
      return;
    }
    if (!checkoutEnabled || !supabase) {
      setError("Secure checkout is unavailable in this build.");
      return;
    }

    setStatus("opening");
    try {
      const result = await startRazorpayCheckout({
        client: supabase,
        planId: "monthly",
        email: user.email,
        requireTrial: mode === "trial",
      });
      if (result === "trial-unavailable") {
        setMode("standard");
        setStatus("idle");
        return;
      }
      if (result === "dismissed") {
        setStatus("idle");
        return;
      }
      await activateAccess();
    } catch (checkoutError) {
      setStatus("idle");
      setError(
        checkoutError instanceof Error && checkoutError.message
          ? checkoutError.message
          : "Secure checkout is temporarily unavailable. Please try again.",
      );
    }
  };

  const value = useMemo(() => ({ openPremiumPrompt }), [openPremiumPrompt]);
  const busy = status !== "idle";
  const trial = mode === "trial";

  return (
    <PremiumPromptContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && status === "activating") return;
          setOpen(nextOpen);
          if (!nextOpen) setError(null);
        }}
      >
        <DialogContent className="bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 gap-3 rounded-t-[2rem] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+var(--safe-bottom))] pt-5 text-center sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem] sm:border sm:p-6">
          <span className="mx-auto inline-flex min-h-7 items-center rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">
            Premium feature
          </span>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Crown className="h-6 w-6" aria-hidden="true" />
          </span>
          <DialogTitle className="text-center text-xl">
            {trial ? "Start your 3-day free trial" : "Kural Companion Plus"}
          </DialogTitle>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">₹99</span>
            <span className="text-sm text-muted-foreground">
              {trial ? "/month after trial" : "/month"}
            </span>
          </div>
          <DialogDescription className="text-center text-sm text-foreground/80">
            All 1,330 Kurals, meanings and Hourly Kural.
          </DialogDescription>
          {mode === "standard" && (
            <p className="text-xs text-muted-foreground" role="status">
              This account has already used its introductory trial.
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="button"
            className="min-h-12 w-full rounded-xl"
            disabled={busy}
            onClick={() => void beginCheckout()}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {!user
              ? "Sign in to start trial"
              : status === "opening"
                ? "Opening secure checkout…"
                : status === "activating"
                  ? "Activating access…"
                  : trial
                    ? "Start free trial"
                    : "Subscribe for ₹99/month"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {trial ? "Auto-renews at ₹99/month after 3 days until cancelled." : "Auto-renews monthly until cancelled."}
          </p>
          <Button asChild variant="link" className="min-h-11 text-xs">
            <Link to="/subscribe" onClick={() => setOpen(false)}>
              See yearly and lifetime plans
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </PremiumPromptContext.Provider>
  );
}
