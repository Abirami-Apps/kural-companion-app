import { useContext } from "react";
import { HourlyKuralContext } from "@/contexts/HourlyKuralContext";

export function useHourlyKural() {
  const context = useContext(HourlyKuralContext);
  if (!context) throw new Error("useHourlyKural must be used inside HourlyKuralProvider");
  return context;
}
