import { createContext } from "react";
import type { HourlyKuralSettings } from "@/lib/hourly-kural";

export type HourlyPlaybackStatus = "idle" | "announcing" | "loading" | "playing" | "error";
export type HourlyNotificationPermission = NotificationPermission | "unsupported";

export interface HourlyPlaybackRequest {
  id: number;
  number: number;
  includeMeaning: boolean;
}

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
  playbackRequest: HourlyPlaybackRequest | null;
  notificationPermission: HourlyNotificationPermission;
  requestNotificationPermission: () => Promise<HourlyNotificationPermission>;
  testNow: () => Promise<void>;
  stopPlayback: () => void;
  markPlayerPlaybackStarted: (requestId: number) => void;
  completePlayerPlayback: (requestId: number, meaning: string) => Promise<void>;
  reportPlayerPlaybackError: (requestId: number, message: string) => void;
}

export const HourlyKuralContext = createContext<HourlyKuralContextValue | null>(null);
