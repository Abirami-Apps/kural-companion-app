import { createContext } from "react";

export type InstallResult = "accepted" | "dismissed" | "manual" | "unavailable";

export interface PwaContextValue {
  online: boolean;
  standalone: boolean;
  installAvailable: boolean;
  install: () => Promise<InstallResult>;
}

export const PwaContext = createContext<PwaContextValue | null>(null);
