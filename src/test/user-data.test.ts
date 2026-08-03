import { describe, expect, it } from "vitest";
import { DEFAULT_HOURLY_SETTINGS, HOURLY_SETTINGS_KEY } from "@/lib/hourly-kural";
import { FAVS_KEY } from "@/lib/player-utils";
import {
  APPEARANCE_KEY,
  CLEAN_USER_DATA,
  EMPTY_USER_DATA_OUTBOX,
  applyUserDataOutbox,
  clearOutboxCategory,
  clearImportedGuestUserData,
  defaultUserData,
  mergeGuestImport,
  queueAppearanceChange,
  queueFavouriteChange,
  queueHourlyChange,
  queueLastHourlyKuralChange,
  readCachedUserData,
  readGuestUserData,
  readUserDataOutbox,
  reconcileFavouriteNumbers,
  scopedDeviceKey,
  userDataCacheKey,
  userDataOutboxKey,
  writeCachedUserData,
  writeGuestUserData,
  writeUserDataOutbox,
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

  it("merges offline favourite operations without erasing another device's additions", () => {
    let deviceBOutbox = queueFavouriteChange(EMPTY_USER_DATA_OUTBOX, 30, true);
    const remoteAfterDeviceA = { ...defaultUserData(), favourites: [20, 10] };

    expect(applyUserDataOutbox(remoteAfterDeviceA, deviceBOutbox).favourites).toEqual([
      30,
      20,
      10,
    ]);

    deviceBOutbox = queueFavouriteChange(deviceBOutbox, 10, false);
    expect(applyUserDataOutbox(remoteAfterDeviceA, deviceBOutbox).favourites).toEqual([
      30,
      20,
    ]);
  });

  it("cancels opposite pending favourite operations before reconnect", () => {
    const added = queueFavouriteChange(EMPTY_USER_DATA_OUTBOX, 770, true);
    const removedAgain = queueFavouriteChange(added, 770, false);

    expect(removedAgain.favouriteAdds).toEqual([]);
    expect(removedAgain.favouriteRemoves).toEqual([770]);

    const restored = queueFavouriteChange(removedAgain, 770, true);
    expect(restored.favouriteAdds).toEqual([770]);
    expect(restored.favouriteRemoves).toEqual([]);
  });

  it("merges only locally edited preference and Hourly fields over newer remote data", () => {
    const remote = {
      ...defaultUserData(),
      appearance: {
        theme: "palm" as const,
        fontStep: 3,
        highContrast: false,
        reducedMotion: true,
      },
      hourlySettings: {
        ...DEFAULT_HOURLY_SETTINGS,
        enabled: true,
        language: "en" as const,
      },
      lastHourlyKural: 500,
    };
    let outbox = queueAppearanceChange(EMPTY_USER_DATA_OUTBOX, { highContrast: true });
    outbox = queueHourlyChange(outbox, { startHour: 9 });
    outbox = queueLastHourlyKuralChange(outbox, 501);

    const merged = applyUserDataOutbox(remote, outbox);
    expect(merged.appearance).toEqual({ ...remote.appearance, highContrast: true });
    expect(merged.hourlySettings).toEqual({ ...remote.hourlySettings, startHour: 9 });
    expect(merged.lastHourlyKural).toBe(501);
  });

  it("persists retry operations independently for each account", () => {
    const accountA = queueFavouriteChange(EMPTY_USER_DATA_OUTBOX, 100, true);
    const accountB = queueAppearanceChange(EMPTY_USER_DATA_OUTBOX, { theme: "sepia" });
    writeUserDataOutbox("account-a", accountA);
    writeUserDataOutbox("account-b", accountB);

    expect(readUserDataOutbox("account-a")).toMatchObject({
      favouriteAdds: [100],
      appearance: {},
    });
    expect(readUserDataOutbox("account-b")).toMatchObject({
      favouriteAdds: [],
      appearance: { theme: "sepia" },
    });
    expect(userDataOutboxKey("account-a")).not.toBe(userDataOutboxKey("account-b"));
  });

  it("clears only the successfully synchronized outbox category", () => {
    let outbox = queueFavouriteChange(EMPTY_USER_DATA_OUTBOX, 42, true);
    outbox = queueAppearanceChange(outbox, { fontStep: 2 });

    expect(clearOutboxCategory(outbox, "favourites")).toMatchObject({
      favouriteAdds: [],
      appearance: { fontStep: 2 },
    });
  });
});
