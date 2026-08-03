import { useContext } from "react";
import { UserDataContext } from "@/contexts/UserDataContext";

export function useOptionalUserData() {
  return useContext(UserDataContext);
}

export function useUserData() {
  const value = useOptionalUserData();
  if (!value) throw new Error("useUserData must be used inside UserDataProvider");
  return value;
}
