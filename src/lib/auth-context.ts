import { createContext } from "react";
import {
  INACTIVE_PREMIUM_ENTITLEMENT,
  type PremiumEntitlement,
} from "@/lib/subscription";

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

export type EntitlementLoadStatus =
  | "disabled"
  | "signed-out"
  | "loading"
  | "ready"
  | "error";

export interface AuthContextValue {
  /** True only when the feature flag and public Supabase configuration are present. */
  enabled: boolean;
  user: AuthUser | null;
  loading: boolean;
  signedIn: boolean;
  /** Paid access must come from a verified backend entitlement, never merely from sign-in. */
  subscribed: boolean;
  premiumEntitlement: PremiumEntitlement;
  entitlementStatus: EntitlementLoadStatus;
  entitlementError: string | null;
  refreshEntitlement: () => Promise<void>;
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
  premiumEntitlement: INACTIVE_PREMIUM_ENTITLEMENT,
  entitlementStatus: "disabled",
  entitlementError: null,
  refreshEntitlement: async () => {},
  signIn: unavailable,
  signUp: async () => ({
    error: "Account access is not configured for this build.",
    requiresEmailConfirmation: false,
  }),
  signOut: unavailable,
  requestPasswordReset: unavailable,
  updatePassword: unavailable,
});
