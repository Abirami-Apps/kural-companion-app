import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ResetPassword = () => {
  const { enabled, user, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const passwordId = useId();
  const confirmId = useId();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const parsed = passwordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      });
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setFormError(result.error);
    else setComplete(true);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm items-center px-4 py-8" lang="en">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <KeyRound className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-center text-xl font-semibold text-foreground">Choose a new password</h1>

        {loading ? (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying your reset link…
          </p>
        ) : complete ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-foreground" role="status">Your password has been updated securely.</p>
            <Button asChild className="mt-5 h-12 w-full rounded-xl"><Link to="/">Continue reading</Link></Button>
          </div>
        ) : !enabled || !user ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground" role="alert">
              This password reset link is invalid or has expired. Request a new link from the sign-in page.
            </p>
            <Button asChild variant="outline" className="mt-5 h-12 w-full rounded-xl"><Link to="/login">Return to sign in</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={passwordId}>New password</Label>
              <Input id={passwordId} type="password" autoComplete="new-password" className="h-12 rounded-xl" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={confirmId}>Confirm new password</Label>
              <Input id={confirmId} type="password" autoComplete="new-password" className="h-12 rounded-xl" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={!!errors.confirmPassword} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            {formError && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{formError}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
