import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckoutPlanId = "monthly" | "yearly" | "lifetime";

export type RazorpayCheckoutSession = {
  sessionId: string;
  keyId: string;
  checkoutKind: "order" | "subscription";
  providerId: string;
  amount: number;
  currency: "INR";
  planId: CheckoutPlanId;
  description: string;
  trialEligible: boolean;
  trialEndsAt: string | null;
};

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: { email?: string };
  readonly?: { email?: boolean };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (result: RazorpaySuccess) => void;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (event: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_ID_PATTERN = /^(order|sub)_[A-Za-z0-9]+$/;
let scriptPromise: Promise<void> | null = null;

export function parseCheckoutSession(input: unknown): RazorpayCheckoutSession {
  if (!input || typeof input !== "object") {
    throw new Error("The payment session response was invalid.");
  }
  const value = input as Record<string, unknown>;
  const session: RazorpayCheckoutSession = {
    sessionId: String(value.sessionId ?? ""),
    keyId: String(value.keyId ?? ""),
    checkoutKind: value.checkoutKind as RazorpayCheckoutSession["checkoutKind"],
    providerId: String(value.providerId ?? ""),
    amount: Number(value.amount),
    currency: value.currency as "INR",
    planId: value.planId as CheckoutPlanId,
    description: String(value.description ?? ""),
    trialEligible: value.trialEligible === true,
    trialEndsAt: typeof value.trialEndsAt === "string" ? value.trialEndsAt : null,
  };
  if (
    !UUID_PATTERN.test(session.sessionId) ||
    !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(session.keyId) ||
    !PROVIDER_ID_PATTERN.test(session.providerId) ||
    !["order", "subscription"].includes(session.checkoutKind) ||
    !["monthly", "yearly", "lifetime"].includes(session.planId) ||
    !Number.isInteger(session.amount) ||
    session.amount <= 0 ||
    session.currency !== "INR" ||
    !session.description ||
    (session.trialEligible !== Boolean(session.trialEndsAt)) ||
    (session.trialEndsAt !== null && !Number.isFinite(Date.parse(session.trialEndsAt)))
  ) {
    throw new Error("The payment session response was invalid.");
  }
  if (
    (session.checkoutKind === "order") !== session.providerId.startsWith("order_") ||
    (session.planId === "lifetime") !== (session.checkoutKind === "order") ||
    (session.trialEligible && session.planId !== "monthly")
  ) {
    throw new Error("The payment session response was invalid.");
  }
  return session;
}

export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`,
    );
    const script = existing ?? document.createElement("script");
    const done = () => window.Razorpay
      ? resolve()
      : reject(new Error("Secure checkout did not load."));
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => {
      scriptPromise = null;
      reject(new Error("Secure checkout did not load."));
    }, { once: true });
    if (!existing) {
      script.src = RAZORPAY_SCRIPT;
      script.async = true;
      document.head.append(script);
    }
  });
  return scriptPromise;
}

async function invoke<T>(
  client: SupabaseClient,
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message);
  if (!data || data.ok !== true) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "The payment request failed.",
    );
  }
  return data as T;
}

export async function startRazorpayCheckout(args: {
  client: SupabaseClient;
  planId: CheckoutPlanId;
  email: string | null;
  requireTrial?: boolean;
}): Promise<"verified" | "pending" | "dismissed" | "trial-unavailable"> {
  const response = await invoke<Record<string, unknown>>(
    args.client,
    "razorpay-checkout",
    {
      planId: args.planId,
      ...(args.requireTrial ? { trialRequired: true } : {}),
    },
  );
  if (args.requireTrial && response.trialEligible === false) {
    return "trial-unavailable";
  }
  const session = parseCheckoutSession(response);
  await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Secure checkout did not load."));
      return;
    }
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    const checkout = new window.Razorpay({
      key: session.keyId,
      name: "Kural Companion",
      description: session.trialEligible
        ? "3-day free trial · then ₹99/month"
        : session.description,
      ...(session.checkoutKind === "order"
        ? {
            order_id: session.providerId,
            amount: session.amount,
            currency: session.currency,
          }
        : { subscription_id: session.providerId }),
      prefill: args.email ? { email: args.email } : undefined,
      readonly: args.email ? { email: true } : undefined,
      theme: { color: "#9b5417" },
      modal: { ondismiss: () => finish(() => resolve("dismissed")) },
      handler: (result) => {
        void invoke<{ ok: true }>(args.client, "razorpay-verify", {
          sessionId: session.sessionId,
          ...result,
        }).then(
          () => finish(() => resolve("verified")),
          // Razorpay may deliver its signed webhook after the browser callback.
          // A temporary verification-function failure must not tell a customer
          // that a completed payment failed or encourage a duplicate purchase.
          () => finish(() => resolve("pending")),
        );
      },
    });
    checkout.on("payment.failed", () => finish(() => reject(
      new Error("The payment was not completed. No premium access was activated."),
    )));
    checkout.open();
  });
}

export async function cancelRazorpayRenewal(client: SupabaseClient): Promise<void> {
  await invoke(client, "razorpay-cancel", {});
}
