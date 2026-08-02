import { authEnabled } from "@/lib/features";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthState {
  /** Whether an authentication backend is configured at all. */
  enabled: boolean;
  user: AuthUser | null;
  loading: boolean;
  signedIn: boolean;
  /** Paid access must come from the backend, never merely from sign-in. */
  subscribed: boolean;
}

/**
 * Placeholder auth state.
 *
 * There is intentionally no authentication backend in this project yet, so this
 * hook always reports "not configured / signed out". It exists so that every
 * consumer already reads auth from one place; wiring a real backend only
 * requires replacing the body of this hook.
 */
export function useAuth(): AuthState {
  return {
    enabled: authEnabled,
    user: null,
    loading: false,
    signedIn: false,
    subscribed: false,
  };
}
