import { TOTAL_KURALS } from "@/data/sample-kurals";
import {
  DEFAULT_HOURLY_SETTINGS,
  HOURLY_LAST_KURAL_KEY,
  HOURLY_SETTINGS_KEY,
  parseHourlySettings,
  type HourlyKuralSettings,
} from "@/lib/hourly-kural";
import { FAVS_KEY, readNumberList, writeNumberList } from "@/lib/player-utils";

export type ThemeName = "classic" | "palm" | "midnight" | "sepia";

export interface AppearancePreferences {
  theme: ThemeName;
  fontStep: number;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface UserDataSnapshot {
  favourites: number[];
  appearance: AppearancePreferences;
  hourlySettings: HourlyKuralSettings;
  lastHourlyKural: number | null;
  timeZone: string;
}

export interface DirtyUserData {
  favourites: boolean;
  appearance: boolean;
  hourly: boolean;
}

export interface CachedUserData {
  version: 1;
  snapshot: UserDataSnapshot;
  dirty: DirtyUserData;
}

export const APPEARANCE_KEY = "kural:appearance";
const CACHE_PREFIX = "kural:account-data:v1";
const MIGRATION_PREFIX = "kural:guest-imported:v1";

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "classic",
  fontStep: 1,
  highContrast: false,
  reducedMotion: false,
};

export const CLEAN_USER_DATA: DirtyUserData = {
  favourites: false,
  appearance: false,
  hourly: false,
};

const validTheme = (value: unknown): value is ThemeName =>
  value === "classic" || value === "palm" || value === "midnight" || value === "sepia";

const validKural = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= TOTAL_KURALS;

const safeTimeZone = (value: unknown): string => {
  if (typeof value === "string" && value.length >= 1 && value.length <= 64) return value;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
};

export function parseAppearance(value: unknown): AppearancePreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE };
  const input = value as Partial<AppearancePreferences>;
  return {
    theme: validTheme(input.theme) ? input.theme : DEFAULT_APPEARANCE.theme,
    fontStep:
      typeof input.fontStep === "number" && Number.isInteger(input.fontStep)
        ? Math.min(3, Math.max(0, input.fontStep))
        : DEFAULT_APPEARANCE.fontStep,
    highContrast: input.highContrast === true,
    reducedMotion: input.reducedMotion === true,
  };
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep the in-memory experience working when storage is unavailable. */
  }
}

function readLastHourlyKural(): number | null {
  try {
    const value = Number(localStorage.getItem(HOURLY_LAST_KURAL_KEY));
    return validKural(value) ? value : null;
  } catch {
    return null;
  }
}

export function defaultUserData(): UserDataSnapshot {
  return {
    favourites: [],
    appearance: { ...DEFAULT_APPEARANCE },
    hourlySettings: { ...DEFAULT_HOURLY_SETTINGS },
    lastHourlyKural: null,
    timeZone: safeTimeZone(null),
  };
}

export function readGuestUserData(): UserDataSnapshot {
  return {
    favourites: readNumberList(FAVS_KEY),
    appearance: parseAppearance(readJson(APPEARANCE_KEY)),
    hourlySettings: parseHourlySettings(readJson(HOURLY_SETTINGS_KEY)),
    lastHourlyKural: readLastHourlyKural(),
    timeZone: safeTimeZone(null),
  };
}

export function writeGuestUserData(snapshot: UserDataSnapshot): void {
  writeNumberList(FAVS_KEY, snapshot.favourites);
  writeJson(APPEARANCE_KEY, snapshot.appearance);
  writeJson(HOURLY_SETTINGS_KEY, snapshot.hourlySettings);
  try {
    if (snapshot.lastHourlyKural === null) localStorage.removeItem(HOURLY_LAST_KURAL_KEY);
    else localStorage.setItem(HOURLY_LAST_KURAL_KEY, String(snapshot.lastHourlyKural));
  } catch {
    /* Storage unavailable. */
  }
}

export function clearImportedGuestUserData(): void {
  try {
    localStorage.removeItem(FAVS_KEY);
    localStorage.removeItem(APPEARANCE_KEY);
    localStorage.removeItem(HOURLY_SETTINGS_KEY);
    localStorage.removeItem(HOURLY_LAST_KURAL_KEY);
  } catch {
    /* Storage unavailable. */
  }
}

export function userDataCacheKey(userId: string): string {
  return `${CACHE_PREFIX}:${userId}`;
}

export function guestMigrationKey(userId: string): string {
  return `${MIGRATION_PREFIX}:${userId}`;
}

export function scopedDeviceKey(baseKey: string, userId: string | null): string {
  return userId ? `${baseKey}:account:${userId}` : baseKey;
}

export function readCachedUserData(userId: string): CachedUserData | null {
  const value = readJson(userDataCacheKey(userId));
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<CachedUserData>;
  if (input.version !== 1 || !input.snapshot || !input.dirty) return null;

  const snapshotInput = input.snapshot as Partial<UserDataSnapshot>;
  const favouriteInput = Array.isArray(snapshotInput.favourites)
    ? snapshotInput.favourites.filter(validKural)
    : [];
  const dirtyInput = input.dirty as Partial<DirtyUserData>;

  return {
    version: 1,
    snapshot: {
      favourites: [...new Set(favouriteInput)].slice(0, 100),
      appearance: parseAppearance(snapshotInput.appearance),
      hourlySettings: parseHourlySettings(snapshotInput.hourlySettings),
      lastHourlyKural: validKural(snapshotInput.lastHourlyKural)
        ? snapshotInput.lastHourlyKural
        : null,
      timeZone: safeTimeZone(snapshotInput.timeZone),
    },
    dirty: {
      favourites: dirtyInput.favourites === true,
      appearance: dirtyInput.appearance === true,
      hourly: dirtyInput.hourly === true,
    },
  };
}

export function writeCachedUserData(
  userId: string,
  snapshot: UserDataSnapshot,
  dirty: DirtyUserData,
): void {
  writeJson(userDataCacheKey(userId), { version: 1, snapshot, dirty } satisfies CachedUserData);
}

export function hasImportedGuestData(userId: string): boolean {
  try {
    return localStorage.getItem(guestMigrationKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markGuestDataImported(userId: string): void {
  try {
    localStorage.setItem(guestMigrationKey(userId), "1");
  } catch {
    /* A repeated idempotent import is safe if storage is unavailable. */
  }
}

export function isDefaultAppearance(value: AppearancePreferences): boolean {
  return (
    value.theme === DEFAULT_APPEARANCE.theme &&
    value.fontStep === DEFAULT_APPEARANCE.fontStep &&
    value.highContrast === DEFAULT_APPEARANCE.highContrast &&
    value.reducedMotion === DEFAULT_APPEARANCE.reducedMotion
  );
}

export function isDefaultHourly(
  settings: HourlyKuralSettings,
  lastHourlyKural: number | null,
): boolean {
  return (
    settings.enabled === DEFAULT_HOURLY_SETTINGS.enabled &&
    settings.startHour === DEFAULT_HOURLY_SETTINGS.startHour &&
    settings.endHour === DEFAULT_HOURLY_SETTINGS.endHour &&
    settings.language === DEFAULT_HOURLY_SETTINGS.language &&
    settings.selection === DEFAULT_HOURLY_SETTINGS.selection &&
    settings.includeMeaning === DEFAULT_HOURLY_SETTINGS.includeMeaning &&
    lastHourlyKural === null
  );
}

export function mergeGuestImport(
  remote: UserDataSnapshot,
  guest: UserDataSnapshot,
  options: { preferencesUntouched: boolean; hourlyUntouched: boolean },
): UserDataSnapshot {
  return {
    favourites: [...new Set([...remote.favourites, ...guest.favourites])].slice(0, 100),
    appearance:
      options.preferencesUntouched && !isDefaultAppearance(guest.appearance)
        ? guest.appearance
        : remote.appearance,
    hourlySettings:
      options.hourlyUntouched &&
      !isDefaultHourly(guest.hourlySettings, guest.lastHourlyKural)
        ? guest.hourlySettings
        : remote.hourlySettings,
    lastHourlyKural:
      options.hourlyUntouched && guest.lastHourlyKural !== null
        ? guest.lastHourlyKural
        : remote.lastHourlyKural,
    timeZone: options.hourlyUntouched ? guest.timeZone : remote.timeZone,
  };
}

export function reconcileFavouriteNumbers(local: number[], remote: number[]) {
  const localSet = new Set(local);
  const remoteSet = new Set(remote);
  return {
    add: local.filter((number) => !remoteSet.has(number)),
    remove: remote.filter((number) => !localSet.has(number)),
  };
}
