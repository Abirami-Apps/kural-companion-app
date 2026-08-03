import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Crown, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { checkoutEnabled, subscriptionsEnabled } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    id: "monthly",
    label: "Monthly",
    price: "₹99",
    period: "/month",
    description: "Try premium for a month",
    popular: false,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "₹999",
    period: "/year",
    description: "Save ₹189 compared to monthly",
    popular: true,
  },
  {
    id: "lifetime",
    label: "Lifetime",
    price: "₹3,499",
    period: "one-time",
    description: "Pay once, access forever",
    popular: false,
  },
];

const features = [
  "Hourly Kural clock and reminders",
  "Cross-device favourites, appearance and Hourly Kural settings",
  "Offline listening in the native apps (coming soon)",
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

  return (
    <div className="min-h-full px-4 py-6 max-w-lg mx-auto">
      {/* Back */}
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

      {/* Header */}
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
            ? "Premium access is verified securely through your account. Live checkout is not connected yet, so these plans remain a preview."
            : "All 1,330 kurals are free to play right now. Checkout is not connected until a payment provider is configured, so these plans are a preview."}
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
                  : entitlementStatus === "loading"
                    ? "Verifying your subscription…"
                    : subscribed
                      ? "Kural Companion Plus is active"
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
                    ? " · Ends after the current billing period"
                    : ""}
                </p>
              )}
              {entitlementError && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {entitlementError}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!user && (
              <Button type="button" className="min-h-11 rounded-lg" onClick={() => navigate("/login")}>
                Sign in
              </Button>
            )}
            {user && entitlementStatus === "error" && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-lg"
                onClick={() => void refreshEntitlement()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry verification
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-3 mb-8">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.15 + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <button
              type="button"
              disabled={!checkoutEnabled}
              aria-describedby={!checkoutEnabled ? "checkout-status" : undefined}
              className={`w-full text-left rounded-xl p-5 border transition-all duration-150 active:scale-[0.98] ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              } disabled:cursor-not-allowed disabled:active:scale-100`}
              onClick={() => {
                if (checkoutEnabled) navigate("/login");
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {plan.label}
                    </span>
                    {plan.popular && (
                      <span className="text-[10px] font-medium uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Best Value
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    {plan.period}
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {!checkoutEnabled && (
        <p id="checkout-status" className="mb-6 text-center text-xs text-muted-foreground">
          {subscriptionsEnabled
            ? "Server-verified access is ready. Plan selection remains disabled until secure checkout and signed webhooks are connected."
            : "Plan selection is disabled until secure checkout is connected."}
        </p>
      )}

      {/* Features */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-3 px-2"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          What you get
        </p>
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
