import { createContext, useContext } from "react";

export type PremiumPromptContextValue = {
  openPremiumPrompt: () => void;
};

export const PremiumPromptContext = createContext<PremiumPromptContextValue | null>(null);

export function usePremiumPrompt(): PremiumPromptContextValue {
  const value = useContext(PremiumPromptContext);
  if (!value) throw new Error("usePremiumPrompt must be used inside PremiumPromptProvider.");
  return value;
}
