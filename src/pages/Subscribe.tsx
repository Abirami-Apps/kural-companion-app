import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Crown, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { checkoutEnabled, subscriptionsEnabled } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import {
  cancelRazorpayRenewal,
  startRazorpayCheckout,
  type CheckoutPlanId,
} from "@/lib/checkout";
import { supabase } from "@/lib/supabase";
import { waitForPremiumActivation } from "@/lib/subscription";

const plans = [
  {
    id: "monthly" as const,
    label: "Monthly",
    price: "₹99",
    period: "/month",
    description: "3 days free for eligible new subscribers",
    popular: false,
  },
  {
    id: "yearly" as const,
    label: "Yearly",
    price: "₹999",
    period: "/year",
    description: "Save ₹189 compared to monthly",
    popular: true,
  },
  {
    id: "lifetime" as const,
    label: "Lifetime",
    price: "₹3,499",
    period: "one-time",
    description: "One-time purchase, no renewal",
    popular: false,
  },
];

const features = [
  "Complete Kural audio and meanings",
  "Hourly Kural clock and reminders",
  "Premium access across supported devices",
];

const Subscribe = () => {
  const navigate = useNavigate();
  const systemReduce = useReducedMotion();
  const { reducedMotion } = useTheme();
  const reduce = systemReduce || reducedMotion;
  const {
    user,
    subscribed,
    premiumEntitlement,
    entitlementStatus,
    entitlementError,
    refreshEntitlement,
  } = useAuth();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [monthlyTrialUnavailable, setMonthlyTrialUnavailable] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<
    | "idle"
    | "opening"
    | "activating"
    | "activation-delayed"
    | "verified"
    | "cancelling"
  >("idle");
  const activationRunRef = useRef(0);

  const busy = purchaseStatus === "opening" ||
    purchaseStatus === "activating" || purchaseStatus === "cancelling";
  const paymentPending = purchaseStatus === "activating" ||
    purchaseStatus === "activation-delayed";

  useEffect(() => () => {
    activationRunRef.current += 1;
  }, []);

  useEffect(() => {
    setMonthlyTrialUnavailable(false);
  }, [user?.id]);

  const activatePremiumAccess = async () => {
    const activationRun = ++activationRunRef.current;
    setCheckoutError(null);
    setPurchaseStatus("activating");

    const activated = await waitForPremiumActivation(refreshEntitlement, {
      shouldContinue: () => activationRunRef.current === activationRun,
    });
    if (activationRunRef.current !== activationRun) return;
    if (activated) {
      setPurchaseStatus("verified");
      return;
    }

    setPurchaseStatus("activation-delayed");
  };

  const startCheckout = async (planId: CheckoutPlanId) => {
    setCheckoutError(null);
    if (!checkoutEnabled || !supabase) return;
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/subscribe?plan=${planId}`)}`);
      return;
    }

    setPurchaseStatus("opening");
    try {
      const result = await startRazorpayCheckout({
        client: supabase,
        planId,
        email: user.email,
        requireTrial: planId === "monthly" && !monthlyTrialUnavailable,
      });
      if (result === "dismissed") {
        setPurchaseStatus("idle");
        return;
      }
      if (result === "trial-unavailable") {
        setMonthlyTrialUnavailable(true);
        setPurchaseStatus("idle");
        setCheckoutError(
          "This account has already used its introductory trial. Select Monthly again to subscribe for ₹99/month.",
        );
        return;
      }
      await activatePremiumAccess();
    } catch (error) {
      setPurchaseStatus("idle");
      setCheckoutError(
        error instanceof Error && error.message
          ? error.message
          : "Secure checkout is temporarily unavailable. Please try again later.",
      );
    }
  };

  const cancelRenewal = async () => {
    if (!supabase || !user) return;
    setCheckoutError(null);
    setPurchaseStatus("cancelling");
    try {
      await cancelRazorpayRenewal(supabase);
      await refreshEntitlement();
      setPurchaseStatus("verified");
    } catch (error) {
      setPurchaseStatus("idle");
      setCheckoutError(
        error instanceof Error && error.message
          ? error.message
          : "We could not cancel renewal. Please contact support.",
      );
    }
  };

  return (
    <div className="min-h-full px-4 py-6 max-w-lg mx-auto">
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex min-h-11 items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mt-8 mb-10"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
          <Crown className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Kural Companion plans
        </h1>
        <p className="text-sm text-muted-foreground">
          {subscriptionsEnabled
            ? checkoutEnabled
              ? "Start with 3 days free on the monthly plan, or choose yearly or lifetime access."
              : "Premium access is verified securely through your account. Checkout is not enabled for this build, so these plans remain a preview."
            : "All 1,330 kurals are free to play right now. These plans are a preview until paid access is enabled."}
        </p>
      </motion.div>

      {subscriptionsEnabled && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            {entitlementStatus === "loading" ? (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
            ) : (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {!user
                  ? "Sign in to check premium access"
                  : purchaseStatus === "activating"
                    ? "Payment received. Activating your subscription…"
                    : purchaseStatus === "activation-delayed"
                      ? "Payment received. Activation is taking longer than expected"
                    : entitlementStatus === "loading"
                      ? "Verifying your subscription…"
                      : subscribed
                        ? premiumEntitlement.status === "trialing"
                          ? "Your Kural Companion Plus trial is active"
                          : "Kural Companion Plus is active"
                        : entitlementStatus === "error"
                          ? "Subscription verification unavailable"
                          : "No active premium entitlement"}
              </p>
              {subscribed && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {premiumEntitlement.planKey
                    ? `${premiumEntitlement.planKey} plan`
                    : "Premium access"}
                  {premiumEntitlement.cancelAtPeriodEnd
                    ? premiumEntitlement.status === "trialing"
                      ? " · Ends when the free trial finishes"
                      : " · Ends after the current billing period"
                    : ""}
                  {premiumEntitlement.status === "trialing" && premiumEntitlement.expiresAt
                    ? ` · Trial ends ${new Intl.DateTimeFormat(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(premiumEntitlement.expiresAt))}`
                    : ""}
                </p>
              )}
              {purchaseStatus === "activating" && (
                <p className="mt-1 text-xs text-muted-foreground" role="status">
                  We will refresh automatically. Please do not make another payment.
                </p>
              )}
              {purchaseStatus === "activation-delayed" && !subscribed && (
                <p className="mt-1 text-xs text-muted-foreground" role="status">
                  Your payment is being processed. Try activation again in a moment, or contact support if it remains pending.
                </p>
              )}
              {entitlementError && !paymentPending && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {entitlementError}
                </p>
              )}
              {checkoutError && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {checkoutError}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!user && (
              <Button type="button" className="min-h-11 rounded-lg" onClick={() => navigate("/login")}>Sign in</Button>
            )}
            {user && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-lg"
                disabled={busy}
                onClick={() => void (paymentPending
                  ? activatePremiumAccess()
                  : refreshEntitlement())}
              >
                {purchaseStatus === "activating"
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                {purchaseStatus === "activating"
                  ? "Activating…"
                  : purchaseStatus === "activation-delayed"
                    ? "Try activation again"
                    : "Refresh access"}
              </Button>
            )}
            {user && subscribed && premiumEntitlement.planKey !== "lifetime" &&
              !premiumEntitlement.cancelAtPeriodEnd && checkoutEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-lg"
                  disabled={busy}
                  onClick={() => void cancelRenewal()}
                >
                  {purchaseStatus === "cancelling" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Cancel renewal
                </Button>
              )}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              disabled={!checkoutEnabled || subscribed || busy || paymentPending}
              aria-describedby={!checkoutEnabled ? "checkout-status" : undefined}
              className={`w-full text-left rounded-xl p-5 border transition-all duration-150 active:scale-[0.98] ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              } disabled:cursor-not-allowed disabled:active:scale-100`}
              onClick={() => void startCheckout(plan.id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{plan.label}</span>
                    {plan.popular && (
                      <span className="text-[10px] font-medium uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Best Value</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.id === "monthly" && monthlyTrialUnavailable
                      ? "Monthly access; introductory trial already used"
                      : plan.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-semibold text-foreground tabular-nums">{plan.price}</span>
                  <span className="text-xs text-muted-foreground block">{plan.period}</span>
                  {checkoutEnabled && !subscribed && (
                    <span className="mt-1 inline-flex text-[11px] font-medium text-primary">
                      {user
                        ? plan.id === "monthly"
                          ? monthlyTrialUnavailable
                            ? "Subscribe for ₹99/month"
                            : "Start free trial"
                          : "Pay securely"
                        : "Sign in to purchase"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {!checkoutEnabled && (
        <p id="checkout-status" className="mb-6 text-center text-xs text-muted-foreground">
          {subscriptionsEnabled
            ? "Plan selection remains disabled until Razorpay checkout and signed webhooks are configured and verified."
            : "Plan selection is disabled until secure checkout is connected."}
        </p>
      )}

      {subscribed && (
        <p className="mb-6 text-center text-xs text-muted-foreground">
          {premiumEntitlement.planKey === "lifetime"
            ? "Your lifetime access is active."
            : premiumEntitlement.cancelAtPeriodEnd
              ? premiumEntitlement.status === "trialing"
                ? "Renewal is cancelled. Premium access continues until the free trial ends."
                : "Renewal is cancelled. Premium access continues until the current paid period ends."
              : premiumEntitlement.status === "trialing"
                ? "Your free trial is active. ₹99 monthly billing starts after the trial unless you cancel renewal."
                : "Your recurring plan is active. You can cancel its next renewal above."}
        </p>
      )}

      {checkoutEnabled && (
        <div className="mb-8 rounded-xl border border-border bg-muted/35 p-4 text-xs leading-5 text-muted-foreground">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Payments are processed securely by Razorpay. The final amount and applicable taxes are shown before payment. By purchasing, you agree to the{" "}
              <Link to="/terms" className="font-medium text-primary underline underline-offset-4">Terms</Link>{" "}
              and acknowledge the{" "}
              <Link to="/privacy" className="font-medium text-primary underline underline-offset-4">Privacy Policy</Link>.
              {" "}Read our{" "}
              <Link to="/refunds" className="font-medium text-primary underline underline-offset-4">Refund &amp; Cancellation Policy</Link>,{" "}
              <Link to="/delivery" className="font-medium text-primary underline underline-offset-4">Digital Delivery Policy</Link>, or{" "}
              <Link to="/contact" className="font-medium text-primary underline underline-offset-4">contact support</Link>.
            </p>
          </div>
        </div>
      )}

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-3 px-2"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What you get</p>
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground">{feature}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default Subscribe;
