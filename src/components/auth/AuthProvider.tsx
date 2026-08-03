import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthActionResult, type SignUpResult } from "@/lib/auth-context";
import { authEnabled } from "@/lib/features";
import { supabase } from "@/lib/supabase";

function authRedirect(path: string) {
  return new URL(path, window.location.origin).toString();
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (normalized.includes("password should be")) {
    return "Use a password with at least 8 characters.";
  }
  if (normalized.includes("rate limit") || normalized.includes("security purposes")) {
    return "Too many attempts. Please wait a little and try again.";
  }

  return message || "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = supabase;
  const enabled = authEnabled && Boolean(client);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !client) {
      setLoading(false);
      return;
    }

    let mounted = true;
    void client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [client, enabled]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!enabled || !client) {
        return { error: "Account access is not configured for this build." };
      }

      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error ? friendlyAuthError(error.message) : null };
    },
    [client, enabled],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      if (!enabled || !client) {
        return {
          error: "Account access is not configured for this build.",
          requiresEmailConfirmation: false,
        };
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirect("/login?confirmed=1") },
      });

      return {
        error: error ? friendlyAuthError(error.message) : null,
        requiresEmailConfirmation: !error && !data.session,
      };
    },
    [client, enabled],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!enabled || !client) return { error: null };
    const { error } = await client.auth.signOut({ scope: "local" });
    return { error: error ? friendlyAuthError(error.message) : null };
  }, [client, enabled]);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      if (!enabled || !client) {
        return { error: "Account access is not configured for this build." };
      }

      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirect("/reset-password"),
      });
      return { error: error ? friendlyAuthError(error.message) : null };
    },
    [client, enabled],
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthActionResult> => {
      if (!enabled || !client) {
        return { error: "Account access is not configured for this build." };
      }

      const { error } = await client.auth.updateUser({ password });
      return { error: error ? friendlyAuthError(error.message) : null };
    },
    [client, enabled],
  );

  const user = useMemo(
    () => session?.user
      ? { id: session.user.id, email: session.user.email ?? null }
      : null,
    [session],
  );

  const value = useMemo(
    () => ({
      enabled,
      user,
      loading,
      signedIn: Boolean(user),
      subscribed: false,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [enabled, loading, requestPasswordReset, signIn, signOut, signUp, updatePassword, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
