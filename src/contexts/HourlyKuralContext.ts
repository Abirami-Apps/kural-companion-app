import { createContext } from "react";
import type { HourlyKuralSettings } from "@/lib/hourly-kural";

export type HourlyPlaybackStatus = "idle" | "announcing" | "playing" | "error";
export type HourlyNotificationPermission = NotificationPermission | "unsupported";

export interface HourlyKuralContextValue {
  settings: HourlyKuralSettings;
  updateSettings: (patch: Partial<HourlyKuralSettings>) => void;
  setEnabled: (enabled: boolean) => void;
  premiumAccess: boolean;
  premiumPreview: boolean;
  status: HourlyPlaybackStatus;
  errorMessage: string | null;
  nextRun: Date | null;
  lastKuralNumber: number | null;
  notificationPermission: HourlyNotificationPermission;
  requestNotificationPermission: () => Promise<HourlyNotificationPermission>;
  testNow: () => Promise<void>;
  stopPlayback: () => void;
}

export const HourlyKuralContext = createContext<HourlyKuralContextValue | null>(null);
