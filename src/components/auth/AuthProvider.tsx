import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthActionResult, type SignUpResult } from "@/lib/auth-context";
import { authEnabled, checkoutEnabled, subscriptionsEnabled } from "@/lib/features";
import {
  fetchPremiumEntitlement,
  INACTIVE_PREMIUM_ENTITLEMENT,
  syncRevenueCatEntitlement,
  type PremiumEntitlement,
} from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type EntitlementState = {
  userId: string | null;
  status: "disabled" | "signed-out" | "loading" | "ready" | "error";
  data: PremiumEntitlement;
  error: string | null;
};

const entitlementErrorMessage =
  "We could not verify your subscription. Check your connection and try again.";

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
  const currentUserId = session?.user.id ?? null;
  const currentUserIdRef = useRef<string | null>(currentUserId);
  const entitlementRequestRef = useRef(0);
  const [entitlementState, setEntitlementState] = useState<EntitlementState>({
    userId: null,
    status: subscriptionsEnabled ? "signed-out" : "disabled",
    data: { ...INACTIVE_PREMIUM_ENTITLEMENT },
    error: null,
  });
  currentUserIdRef.current = currentUserId;

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

  const refreshEntitlement = useCallback(async () => {
    const expectedUserId = currentUserIdRef.current;
    if (!subscriptionsEnabled || !client || !expectedUserId) return;

    const request = ++entitlementRequestRef.current;
    setEntitlementState((current) => ({
      userId: expectedUserId,
      status: "loading",
      data:
        current.userId === expectedUserId
          ? current.data
          : { ...INACTIVE_PREMIUM_ENTITLEMENT },
      error: null,
    }));

    try {
      const data = await fetchPremiumEntitlement(client, expectedUserId);
      if (
        entitlementRequestRef.current !== request ||
        currentUserIdRef.current !== expectedUserId
      ) {
        return;
      }
      setEntitlementState({
        userId: expectedUserId,
        status: "ready",
        data,
        error: null,
      });
    } catch {
      if (
        entitlementRequestRef.current !== request ||
        currentUserIdRef.current !== expectedUserId
      ) {
        return;
      }
      setEntitlementState({
        userId: expectedUserId,
        status: "error",
        data: { ...INACTIVE_PREMIUM_ENTITLEMENT },
        error: entitlementErrorMessage,
      });
    }
  }, [client]);

  useEffect(() => {
    entitlementRequestRef.current += 1;
    if (!subscriptionsEnabled) {
      setEntitlementState({
        userId: null,
        status: "disabled",
        data: { ...INACTIVE_PREMIUM_ENTITLEMENT },
        error: null,
      });
      return;
    }
    if (!currentUserId || !client) {
      setEntitlementState({
        userId: null,
        status: "signed-out",
        data: { ...INACTIVE_PREMIUM_ENTITLEMENT },
        error: null,
      });
      return;
    }
    void refreshEntitlement();
  }, [client, currentUserId, refreshEntitlement]);

  useEffect(() => {
    if (!subscriptionsEnabled || !currentUserId) return;
    const refresh = () => void refreshEntitlement();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [currentUserId, refreshEntitlement]);

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

  const syncPremiumEntitlement = useCallback(async (): Promise<AuthActionResult> => {
    if (!checkoutEnabled || !client || !currentUserIdRef.current) {
      return { error: "Sign in before refreshing your subscription." };
    }

    try {
      await syncRevenueCatEntitlement(client);
      await refreshEntitlement();
      return { error: null };
    } catch {
      return {
        error: "We could not refresh your purchase yet. Wait a moment and try again.",
      };
    }
  }, [client, refreshEntitlement]);

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
    () => {
      const entitlementMatchesUser = Boolean(
        user && entitlementState.userId === user.id,
      );
      return {
        enabled,
        user,
        loading,
        signedIn: Boolean(user),
        subscribed:
          entitlementMatchesUser &&
          entitlementState.status === "ready" &&
          entitlementState.data.active,
        premiumEntitlement: entitlementMatchesUser
          ? entitlementState.data
          : INACTIVE_PREMIUM_ENTITLEMENT,
        entitlementStatus: entitlementMatchesUser
          ? entitlementState.status
          : subscriptionsEnabled
            ? user
              ? "loading" as const
              : "signed-out" as const
            : "disabled" as const,
        entitlementError: entitlementMatchesUser ? entitlementState.error : null,
        refreshEntitlement,
        syncPremiumEntitlement,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
      };
    },
    [
      enabled,
      entitlementState,
      loading,
      refreshEntitlement,
      requestPasswordReset,
      signIn,
      signOut,
      signUp,
      syncPremiumEntitlement,
      updatePassword,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
