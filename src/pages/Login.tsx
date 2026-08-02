import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_NAME, authEnabled } from "@/lib/features";
import { useTheme } from "@/components/theme/ThemeProvider";

const emailSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,16}$/, "Enter a valid mobile number with country code"),
});

const Login = () => {
  const navigate = useNavigate();
  const systemReduce = useReducedMotion();
  const { reducedMotion } = useTheme();
  const reduce = systemReduce || reducedMotion;
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ids = {
    email: useId(),
    password: useId(),
    phone: useId(),
    notice: useId(),
  };

  const validate = () => {
    const result =
      mode === "email"
        ? emailSchema.safeParse({ email, password })
        : phoneSchema.safeParse({ phone });
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    result.error.issues.forEach((i) => {
      const key = String(i.path[0]);
      if (!next[key]) next[key] = i.message;
    });
    setErrors(next);
    return false;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    validate();
  };

  const err = (field: string) => errors[field];

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-6" lang="en">
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

      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Sign in to {PRODUCT_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounts keep your favourites in sync across devices.
          </p>
        </div>

        {!authEnabled && (
          <p
            id={ids.notice}
            className="mb-5 flex gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground/80"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Sign-in is not connected yet. Email, mobile OTP and Google sign-in need an
              authentication backend to be configured — until then this form only checks
              your details and nothing is submitted. Every kural stays free to play, and
              favourites are saved on this device.
            </span>
          </p>
        )}

        <div className="mb-4 flex rounded-lg bg-secondary p-1" role="group" aria-label="Sign-in method">
          <button
            type="button"
            onClick={() => setMode("email")}
            aria-pressed={mode === "email"}
            className={`flex-1 min-h-11 rounded-md text-sm transition-colors ${
              mode === "email"
                ? "bg-card text-foreground shadow-sm"
                : "text-secondary-foreground/70"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode("otp")}
            aria-pressed={mode === "otp"}
            className={`flex-1 min-h-11 rounded-md text-sm transition-colors ${
              mode === "otp"
                ? "bg-card text-foreground shadow-sm"
                : "text-secondary-foreground/70"
            }`}
          >
            Mobile OTP
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "email" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={ids.email}>Email address</Label>
                <Input
                  id={ids.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!err("email")}
                  aria-describedby={err("email") ? `${ids.email}-error` : undefined}
                  className="h-12 rounded-xl"
                />
                {err("email") && (
                  <p id={`${ids.email}-error`} className="text-xs text-destructive">
                    {err("email")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={ids.password}>Password</Label>
                <Input
                  id={ids.password}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!err("password")}
                  aria-describedby={err("password") ? `${ids.password}-error` : undefined}
                  className="h-12 rounded-xl"
                />
                {err("password") && (
                  <p id={`${ids.password}-error`} className="text-xs text-destructive">
                    {err("password")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor={ids.phone}>Mobile number</Label>
              <Input
                id={ids.phone}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!err("phone")}
                aria-describedby={err("phone") ? `${ids.phone}-error` : undefined}
                className="h-12 rounded-xl"
              />
              {err("phone") && (
                <p id={`${ids.phone}-error`} className="text-xs text-destructive">
                  {err("phone")}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl"
            disabled={!authEnabled}
            aria-describedby={!authEnabled ? ids.notice : undefined}
          >
            {mode === "email" ? "Sign in" : "Send OTP"}
          </Button>
          {!authEnabled && (
            <p className="text-center text-xs text-muted-foreground">
              Sign-in becomes available once an authentication backend is connected.
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
            Continue without an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
