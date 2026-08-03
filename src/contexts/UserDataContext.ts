import { createContext } from "react";
import type { HourlyKuralSettings } from "@/lib/hourly-kural";
import type { AppearancePreferences } from "@/lib/user-data";

export type UserDataSyncStatus = "guest" | "loading" | "saving" | "synced" | "offline";

export interface UserDataContextValue {
  favourites: number[];
  toggleFavourite: (number: number) => void;
  appearance: AppearancePreferences;
  updateAppearance: (patch: Partial<AppearancePreferences>) => void;
  hourlySettings: HourlyKuralSettings;
  updateHourlySettings: (patch: Partial<HourlyKuralSettings>) => void;
  lastHourlyKural: number | null;
  setLastHourlyKural: (number: number) => void;
  syncStatus: UserDataSyncStatus;
  syncError: string | null;
  retrySync: () => Promise<void>;
  deviceKey: (baseKey: string) => string;
}

export const UserDataContext = createContext<UserDataContextValue | null>(null);
