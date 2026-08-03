import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Crown, Info, Loader2, LogOut, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_NAME, subscriptionsEnabled } from "@/lib/features";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";

type FormMode = "sign-in" | "sign-up" | "forgot";

const emailSchema = z.string().trim().min(1, "Enter your email address").email("Enter a valid email address");
const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const systemReduce = useReducedMotion();
  const { reducedMotion } = useTheme();
  const reduce = systemReduce || reducedMotion;
  const {
    enabled,
    user,
    loading,
    subscribed,
    premiumEntitlement,
    entitlementStatus,
    entitlementError,
    refreshEntitlement,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
  } = useAuth();
  const { syncStatus, syncError, retrySync } = useUserData();
  const [mode, setMode] = useState<FormMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = {
    email: useId(),
    password: useId(),
    notice: useId(),
  };

  const selectMode = (next: FormMode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
    setStatus(null);
  };

  const validate = () => {
    const result = mode === "forgot"
      ? emailSchema.safeParse(email)
      : credentialsSchema.safeParse({ email, password });

    if (result.success) {
      setErrors({});
      return true;
    }

    const next: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const key = mode === "forgot" ? "email" : String(issue.path[0]);
      if (!next[key]) next[key] = issue.message;
    });
    setErrors(next);
    return false;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setStatus(null);
    if (!validate() || !enabled) return;

    setBusy(true);
    try {
      if (mode === "sign-in") {
        const result = await signIn(email.trim(), password);
        if (result.error) setFormError(result.error);
        else navigate("/", { replace: true });
      } else if (mode === "sign-up") {
        const result = await signUp(email.trim(), password);
        if (result.error) {
          setFormError(result.error);
        } else if (result.requiresEmailConfirmation) {
          setPassword("");
          setStatus("Check your email and open the confirmation link to finish creating your account.");
        } else {
          navigate("/", { replace: true });
        }
      } else {
        const result = await requestPasswordReset(email.trim());
        if (result.error) setFormError(result.error);
        else setStatus("Password reset instructions have been sent. Check your email.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setFormError(null);
    const result = await signOut();
    setBusy(false);
    if (result.error) setFormError(result.error);
    else setStatus("You have been signed out on this device.");
  };

  const err = (field: string) => errors[field];
  const title = mode === "sign-up" ? "Create your account" : mode === "forgot" ? "Reset your password" : `Sign in to ${PRODUCT_NAME}`;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col px-4 py-6" lang="en">
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      </motion.div>

      <div className="flex flex-1 flex-col justify-center py-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking your account…
          </div>
        ) : user ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">Your account</h1>
            {searchParams.get("confirmed") === "1" && (
              <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm text-foreground" role="status">
                Email confirmed. You are signed in.
              </p>
            )}
            <p className="mt-2 break-all text-sm text-muted-foreground">{user.email}</p>
            {subscriptionsEnabled && (
              <div className="mt-5 rounded-xl border border-border bg-background/70 p-4 text-left">
                <div className="flex items-start gap-3">
                  <Crown className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {entitlementStatus === "loading"
                        ? "Verifying premium access…"
                        : subscribed
                          ? "Kural Companion Plus is active"
                          : entitlementStatus === "error"
                            ? "Premium access could not be verified"
                            : "Free plan"}
                    </p>
                    {subscribed && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {premiumEntitlement.planKey
                          ? `${premiumEntitlement.planKey} plan`
                          : "Premium entitlement"}
                        {premiumEntitlement.expiresAt
                          ? ` · Access through ${new Intl.DateTimeFormat("en-IN", {
                              dateStyle: "medium",
                            }).format(new Date(premiumEntitlement.expiresAt))}`
                          : ""}
                      </p>
                    )}
                    {!subscribed && entitlementStatus === "ready" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Premium features require an active server-verified entitlement.
                      </p>
                    )}
                    {entitlementError && (
                      <p className="mt-1 text-xs text-destructive" role="alert">
                        {entitlementError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="min-h-11 rounded-lg">
                    <Link to="/subscribe">{subscribed ? "View subscription" : "View plans"}</Link>
                  </Button>
                  {entitlementStatus === "error" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
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
            <p className="mt-3 text-xs text-muted-foreground" role="status">
              {syncStatus === "synced"
                ? "Favourites and settings are synced across your devices."
                : syncStatus === "saving" || syncStatus === "loading"
                  ? "Syncing your favourites and settings…"
                  : "Changes are saved on this device and will sync when you reconnect."}
            </p>
            {syncError && (
              <button
                type="button"
                className="mt-2 min-h-11 text-sm font-medium text-primary underline underline-offset-4"
                onClick={() => void retrySync()}
              >
                Retry cloud sync
              </button>
            )}
            {formError && <p className="mt-4 text-sm text-destructive" role="alert">{formError}</p>}
            <Button asChild className="mt-6 h-12 w-full rounded-xl">
              <Link to="/">Continue reading</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-12 w-full rounded-xl"
              disabled={busy}
              onClick={handleSignOut}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
              Sign out
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "forgot"
                  ? "We will email you a secure password reset link."
                  : "Keep your account ready for favourites and preferences to sync across devices."}
              </p>
            </div>

            {!enabled && (
              <p id={ids.notice} className="mb-5 flex gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground/80">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Sign-in is unavailable in this build because its public Supabase configuration is missing.
                  Every kural stays free to play, and favourites remain saved on this device.
                </span>
              </p>
            )}

            {mode !== "forgot" && (
              <div className="mb-4 grid grid-cols-2 rounded-lg bg-secondary p-1" role="group" aria-label="Account action">
                <button
                  type="button"
                  onClick={() => selectMode("sign-in")}
                  aria-pressed={mode === "sign-in"}
                  className={`min-h-11 rounded-md text-sm transition-colors ${mode === "sign-in" ? "bg-card text-foreground shadow-sm" : "text-secondary-foreground/70"}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => selectMode("sign-up")}
                  aria-pressed={mode === "sign-up"}
                  className={`min-h-11 rounded-md text-sm transition-colors ${mode === "sign-up" ? "bg-card text-foreground shadow-sm" : "text-secondary-foreground/70"}`}
                >
                  Create account
                </button>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor={ids.email}>Email address</Label>
                <Input
                  id={ids.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={!!err("email")}
                  aria-describedby={err("email") ? `${ids.email}-error` : undefined}
                  className="h-12 rounded-xl"
                />
                {err("email") && <p id={`${ids.email}-error`} className="text-xs text-destructive">{err("email")}</p>}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor={ids.password}>Password</Label>
                  <Input
                    id={ids.password}
                    name="password"
                    type="password"
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={!!err("password")}
                    aria-describedby={err("password") ? `${ids.password}-error` : undefined}
                    className="h-12 rounded-xl"
                  />
                  {err("password") && <p id={`${ids.password}-error`} className="text-xs text-destructive">{err("password")}</p>}
                  {mode === "sign-in" && (
                    <button type="button" onClick={() => selectMode("forgot")} className="inline-flex min-h-11 items-center text-xs text-primary underline underline-offset-4">
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              {formError && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{formError}</p>}
              {status && (
                <p className="flex gap-2 rounded-xl bg-primary/10 p-3 text-sm text-foreground" role="status">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {status}
                </p>
              )}

              <Button type="submit" className="h-12 w-full rounded-xl" disabled={!enabled || busy} aria-describedby={!enabled ? ids.notice : undefined}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {mode === "sign-up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </Button>
            </form>

            {mode === "forgot" && (
              <button type="button" onClick={() => selectMode("sign-in")} className="mt-3 min-h-11 text-sm text-primary underline underline-offset-4">
                Back to sign in
              </button>
            )}

            <p className="mt-5 text-center text-xs text-muted-foreground">
              <Link to="/" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                Continue without an account
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
