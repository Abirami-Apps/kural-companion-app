import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  "All 1,330 Kurals with audio",
  "Tamil verse & meaning",
  "English translation",
  "Offline listening (coming soon)",
];

const Subscribe = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mt-8 mb-10"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
          <Crown className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Unlock All Kurals
        </h1>
        <p className="text-sm text-muted-foreground">
          First 10 kurals are free. Subscribe to access all 1,330.
        </p>
      </motion.div>

      {/* Plans */}
      <div className="space-y-3 mb-8">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.15 + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <button
              className={`w-full text-left rounded-xl p-5 border transition-all duration-150 active:scale-[0.98] ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
              onClick={() => {
                // TODO: Stripe checkout
                navigate("/login");
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

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
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
