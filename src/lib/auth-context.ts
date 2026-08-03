import { createContext } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthActionResult {
  error: string | null;
}

export interface SignUpResult extends AuthActionResult {
  requiresEmailConfirmation: boolean;
}

export interface AuthContextValue {
  /** True only when the feature flag and public Supabase configuration are present. */
  enabled: boolean;
  user: AuthUser | null;
  loading: boolean;
  signedIn: boolean;
  /** Paid access must come from a verified backend entitlement, never merely from sign-in. */
  subscribed: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
}

const unavailable = async (): Promise<AuthActionResult> => ({
  error: "Account access is not configured for this build.",
});

export const AuthContext = createContext<AuthContextValue>({
  enabled: false,
  user: null,
  loading: false,
  signedIn: false,
  subscribed: false,
  signIn: unavailable,
  signUp: async () => ({
    error: "Account access is not configured for this build.",
    requiresEmailConfirmation: false,
  }),
  signOut: unavailable,
  requestPasswordReset: unavailable,
  updatePassword: unavailable,
});
