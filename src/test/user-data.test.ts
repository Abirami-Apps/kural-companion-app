import { describe, expect, it } from "vitest";
import { DEFAULT_HOURLY_SETTINGS, HOURLY_SETTINGS_KEY } from "@/lib/hourly-kural";
import { FAVS_KEY } from "@/lib/player-utils";
import {
  APPEARANCE_KEY,
  CLEAN_USER_DATA,
  clearImportedGuestUserData,
  defaultUserData,
  mergeGuestImport,
  readCachedUserData,
  readGuestUserData,
  reconcileFavouriteNumbers,
  scopedDeviceKey,
  userDataCacheKey,
  writeCachedUserData,
  writeGuestUserData,
} from "@/lib/user-data";

describe("user data storage and migration", () => {
  it("keeps guest, account A and account B data isolated across logout", () => {
    const guest = { ...defaultUserData(), favourites: [7] };
    const accountA = { ...defaultUserData(), favourites: [10, 20] };
    const accountB = { ...defaultUserData(), favourites: [30] };

    writeGuestUserData(guest);
    writeCachedUserData("account-a", accountA, { ...CLEAN_USER_DATA });
    writeCachedUserData("account-b", accountB, { ...CLEAN_USER_DATA });

    expect(readGuestUserData().favourites).toEqual([7]);
    expect(readCachedUserData("account-a")?.snapshot.favourites).toEqual([10, 20]);
    expect(readCachedUserData("account-b")?.snapshot.favourites).toEqual([30]);
    expect(userDataCacheKey("account-a")).not.toBe(userDataCacheKey("account-b"));

    clearImportedGuestUserData();

    expect(readGuestUserData().favourites).toEqual([]);
    expect(readCachedUserData("account-a")?.snapshot.favourites).toEqual([10, 20]);
    expect(readCachedUserData("account-b")?.snapshot.favourites).toEqual([30]);
  });

  it("persists dirty categories so offline changes can retry later", () => {
    const snapshot = { ...defaultUserData(), favourites: [42] };
    writeCachedUserData("offline-user", snapshot, {
      favourites: true,
      appearance: false,
      hourly: true,
    });

    expect(readCachedUserData("offline-user")).toMatchObject({
      snapshot: { favourites: [42] },
      dirty: { favourites: true, appearance: false, hourly: true },
    });
  });

  it("imports guest choices only over untouched cloud defaults", () => {
    const remote = { ...defaultUserData(), favourites: [1] };
    const guest = {
      ...defaultUserData(),
      favourites: [2, 1],
      appearance: {
        theme: "sepia" as const,
        fontStep: 2,
        highContrast: true,
        reducedMotion: false,
      },
      hourlySettings: {
        ...DEFAULT_HOURLY_SETTINGS,
        enabled: true,
        selection: "sequential" as const,
      },
      lastHourlyKural: 80,
    };

    expect(
      mergeGuestImport(remote, guest, {
        preferencesUntouched: true,
        hourlyUntouched: true,
      }),
    ).toMatchObject({
      favourites: [1, 2],
      appearance: guest.appearance,
      hourlySettings: guest.hourlySettings,
      lastHourlyKural: 80,
    });
  });

  it("does not overwrite established cloud preferences during guest import", () => {
    const remote = {
      ...defaultUserData(),
      appearance: {
        theme: "palm" as const,
        fontStep: 3,
        highContrast: false,
        reducedMotion: true,
      },
      hourlySettings: { ...DEFAULT_HOURLY_SETTINGS, language: "en" as const },
      lastHourlyKural: 900,
    };
    const guest = {
      ...defaultUserData(),
      appearance: {
        theme: "sepia" as const,
        fontStep: 2,
        highContrast: true,
        reducedMotion: false,
      },
      hourlySettings: { ...DEFAULT_HOURLY_SETTINGS, enabled: true },
      lastHourlyKural: 12,
    };

    const merged = mergeGuestImport(remote, guest, {
      preferencesUntouched: false,
      hourlyUntouched: false,
    });
    expect(merged.appearance).toEqual(remote.appearance);
    expect(merged.hourlySettings).toEqual(remote.hourlySettings);
    expect(merged.lastHourlyKural).toBe(900);
  });

  it("computes exact favourite additions and removals for cloud reconciliation", () => {
    expect(reconcileFavouriteNumbers([2, 3, 4], [1, 2, 4])).toEqual({
      add: [3],
      remove: [1],
    });
  });

  it("namespaces device-only schedule state for each signed-in account", () => {
    expect(scopedDeviceKey("kural:hourly-last-run", null)).toBe("kural:hourly-last-run");
    expect(scopedDeviceKey("kural:hourly-last-run", "user-a")).toBe(
      "kural:hourly-last-run:account:user-a",
    );
    expect(scopedDeviceKey("kural:hourly-last-run", "user-a")).not.toBe(
      scopedDeviceKey("kural:hourly-last-run", "user-b"),
    );
  });

  it("clears only imported guest sync keys", () => {
    localStorage.setItem(FAVS_KEY, "[1]");
    localStorage.setItem(APPEARANCE_KEY, "{}");
    localStorage.setItem(HOURLY_SETTINGS_KEY, "{}");
    localStorage.setItem("unrelated", "keep");

    clearImportedGuestUserData();

    expect(localStorage.getItem(FAVS_KEY)).toBeNull();
    expect(localStorage.getItem(APPEARANCE_KEY)).toBeNull();
    expect(localStorage.getItem(HOURLY_SETTINGS_KEY)).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});
