import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/lib/auth-context";

export type {
  AuthActionResult,
  AuthContextValue,
  AuthUser,
  EntitlementLoadStatus,
  SignUpResult,
} from "@/lib/auth-context";

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
