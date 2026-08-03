import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserDataContext, type UserDataSyncStatus } from "@/contexts/UserDataContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchRemoteUserData,
  syncCloudAppearance,
  syncCloudAppearancePatch,
  syncCloudFavouriteOperations,
  syncCloudFavourites,
  syncCloudHourly,
  syncCloudHourlyPatch,
} from "@/lib/cloud-sync";
import { supabase } from "@/lib/supabase";
import {
  CLEAN_USER_DATA,
  EMPTY_USER_DATA_OUTBOX,
  applyUserDataOutbox,
  clearOutboxCategory,
  clearImportedGuestUserData,
  defaultUserData,
  hasImportedGuestData,
  hasPendingOutboxCategory,
  markGuestDataImported,
  mergeGuestImport,
  queueAppearanceChange,
  queueFavouriteChange,
  queueHourlyChange,
  queueLastHourlyKuralChange,
  queueTimeZoneChange,
  readCachedUserData,
  readGuestUserData,
  readUserDataOutbox,
  scopedDeviceKey,
  writeCachedUserData,
  writeGuestUserData,
  writeUserDataOutbox,
  type DirtyUserData,
  type UserDataOutbox,
  type UserDataSnapshot,
} from "@/lib/user-data";

type SyncCategory = keyof DirtyUserData;

const friendlySyncError =
  "Cloud sync is temporarily unavailable. Your changes are safe on this device and will retry when you reconnect.";

const hasDirtyData = (dirty: DirtyUserData) =>
  dirty.favourites || dirty.appearance || dirty.hourly;

const sameValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

async function syncCategory(
  client: SupabaseClient,
  userId: string,
  category: SyncCategory,
  snapshot: UserDataSnapshot,
  outbox: UserDataOutbox,
) {
  if (category === "favourites") {
    if (hasPendingOutboxCategory(outbox, category)) {
      await syncCloudFavouriteOperations(
        client,
        userId,
        outbox.favouriteAdds,
        outbox.favouriteRemoves,
      );
    } else {
      await syncCloudFavourites(client, userId, snapshot.favourites);
    }
  } else if (category === "appearance") {
    if (hasPendingOutboxCategory(outbox, category)) {
      await syncCloudAppearancePatch(client, userId, outbox.appearance);
    } else {
      await syncCloudAppearance(client, userId, snapshot.appearance);
    }
  } else {
    if (hasPendingOutboxCategory(outbox, category)) {
      await syncCloudHourlyPatch(
        client,
        userId,
        outbox.hourlySettings,
        outbox.lastHourlyKural,
        outbox.timeZone,
      );
    } else {
      await syncCloudHourly(
        client,
        userId,
        snapshot.hourlySettings,
        snapshot.lastHourlyKural,
        snapshot.timeZone,
      );
    }
  }
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const client = supabase;
  const [snapshot, setSnapshot] = useState<UserDataSnapshot>(readGuestUserData);
  const [dirty, setDirty] = useState<DirtyUserData>({ ...CLEAN_USER_DATA });
  const [ready, setReady] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<UserDataSyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  const dirtyRef = useRef(dirty);
  const outboxRef = useRef<UserDataOutbox>({
    ...EMPTY_USER_DATA_OUTBOX,
    lastHourlyKural: { ...EMPTY_USER_DATA_OUTBOX.lastHourlyKural },
  });
  const userIdRef = useRef<string | null>(null);
  const remoteReadyRef = useRef(false);
  const generationRef = useRef(0);
  const refreshSequenceRef = useRef(0);
  const versionsRef = useRef<Record<SyncCategory, number>>({
    favourites: 0,
    appearance: 0,
    hourly: 0,
  });
  const timersRef = useRef<Partial<Record<SyncCategory, number>>>({});

  const replaceSnapshot = useCallback((next: UserDataSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const replaceDirty = useCallback((next: DirtyUserData) => {
    dirtyRef.current = next;
    setDirty(next);
  }, []);

  const replaceOutbox = useCallback((next: UserDataOutbox) => {
    outboxRef.current = next;
    const userId = userIdRef.current;
    if (userId) writeUserDataOutbox(userId, next);
  }, []);

  const persistCurrent = useCallback(() => {
    const userId = userIdRef.current;
    if (userId) writeCachedUserData(userId, snapshotRef.current, dirtyRef.current);
    else writeGuestUserData(snapshotRef.current);
  }, []);

  const flushCategory = useCallback(
    async (category: SyncCategory, expectedUserId: string, expectedVersion: number) => {
      if (!client || userIdRef.current !== expectedUserId) return false;
      try {
        const capturedSnapshot = snapshotRef.current;
        const capturedOutbox = outboxRef.current;
        await syncCategory(client, expectedUserId, category, capturedSnapshot, capturedOutbox);
        if (
          userIdRef.current === expectedUserId &&
          versionsRef.current[category] === expectedVersion
        ) {
          const nextOutbox = clearOutboxCategory(outboxRef.current, category);
          const nextDirty = { ...dirtyRef.current, [category]: false };
          replaceOutbox(nextOutbox);
          replaceDirty(nextDirty);
          writeCachedUserData(expectedUserId, snapshotRef.current, nextDirty);
          setSyncStatus(hasDirtyData(nextDirty) ? "saving" : "synced");
          setSyncError(null);
        }
        return true;
      } catch {
        if (userIdRef.current === expectedUserId) {
          setSyncStatus("offline");
          setSyncError(friendlySyncError);
        }
        return false;
      }
    },
    [client, replaceDirty, replaceOutbox],
  );

  const queueSync = useCallback(
    (category: SyncCategory) => {
      const userId = userIdRef.current;
      if (!userId || !client) {
        setSyncStatus("guest");
        return;
      }
      const existingTimer = timersRef.current[category];
      if (existingTimer) window.clearTimeout(existingTimer);
      const expectedVersion = versionsRef.current[category];
      setSyncStatus("saving");
      timersRef.current[category] = window.setTimeout(() => {
        delete timersRef.current[category];
        void flushCategory(category, userId, expectedVersion);
      }, 350);
    },
    [client, flushCategory],
  );

  const commitCategory = useCallback(
    (category: SyncCategory, update: (current: UserDataSnapshot) => UserDataSnapshot) => {
      const next = update(snapshotRef.current);
      versionsRef.current[category] += 1;
      const nextDirty = userIdRef.current
        ? { ...dirtyRef.current, [category]: true }
        : dirtyRef.current;
      replaceSnapshot(next);
      replaceDirty(nextDirty);
      persistCurrent();
      queueSync(category);
    },
    [persistCurrent, queueSync, replaceDirty, replaceSnapshot],
  );

  const synchronizeDirty = useCallback(
    async (userId: string) => {
      if (!client || userIdRef.current !== userId) return false;
      let allSucceeded = true;
      for (const category of ["favourites", "appearance", "hourly"] as const) {
        if (!dirtyRef.current[category]) continue;
        const version = versionsRef.current[category];
        const succeeded = await flushCategory(category, userId, version);
        allSucceeded = allSucceeded && succeeded;
      }
      return allSucceeded && !hasDirtyData(dirtyRef.current);
    },
    [client, flushCategory],
  );

  const hydrateUser = useCallback(
    async (userId: string, generation: number, refreshSequence: number) => {
      if (!client || userIdRef.current !== userId) return;
      try {
        const remote = await fetchRemoteUserData(client, userId);
        if (
          generationRef.current !== generation ||
          refreshSequenceRef.current !== refreshSequence ||
          userIdRef.current !== userId
        ) {
          return;
        }
        remoteReadyRef.current = true;

        const local = snapshotRef.current;
        const localDirty = { ...dirtyRef.current };
        let localOutbox = outboxRef.current;

        // Phase 2B caches stored only a dirty flag. Convert those one time into
        // explicit operations. Favourites use a conservative union so a stale
        // device can never erase a newer favourite added elsewhere.
        if (localDirty.favourites && !hasPendingOutboxCategory(localOutbox, "favourites")) {
          for (const number of local.favourites) {
            if (!remote.snapshot.favourites.includes(number)) {
              localOutbox = queueFavouriteChange(localOutbox, number, true);
            }
          }
          localDirty.favourites = hasPendingOutboxCategory(localOutbox, "favourites");
        }
        if (localDirty.appearance && !hasPendingOutboxCategory(localOutbox, "appearance")) {
          localOutbox = queueAppearanceChange(localOutbox, local.appearance);
        }
        if (localDirty.hourly && !hasPendingOutboxCategory(localOutbox, "hourly")) {
          localOutbox = queueHourlyChange(localOutbox, local.hourlySettings);
          localOutbox = queueLastHourlyKuralChange(localOutbox, local.lastHourlyKural);
          localOutbox = queueTimeZoneChange(localOutbox, local.timeZone);
        }
        const remoteWithPendingChanges = applyUserDataOutbox(remote.snapshot, localOutbox);
        let next: UserDataSnapshot = {
          favourites: localDirty.favourites
            ? hasPendingOutboxCategory(localOutbox, "favourites")
              ? remoteWithPendingChanges.favourites
              : local.favourites
            : remote.snapshot.favourites,
          appearance: localDirty.appearance
            ? hasPendingOutboxCategory(localOutbox, "appearance")
              ? remoteWithPendingChanges.appearance
              : local.appearance
            : remote.snapshot.appearance,
          hourlySettings: localDirty.hourly
            ? hasPendingOutboxCategory(localOutbox, "hourly")
              ? remoteWithPendingChanges.hourlySettings
              : local.hourlySettings
            : remote.snapshot.hourlySettings,
          lastHourlyKural: localDirty.hourly
            ? hasPendingOutboxCategory(localOutbox, "hourly")
              ? remoteWithPendingChanges.lastHourlyKural
              : local.lastHourlyKural
            : remote.snapshot.lastHourlyKural,
          timeZone: localDirty.hourly
            ? hasPendingOutboxCategory(localOutbox, "hourly")
              ? remoteWithPendingChanges.timeZone
              : local.timeZone
            : remote.snapshot.timeZone,
        };
        const nextDirty = { ...localDirty };
        let nextOutbox = localOutbox;
        const importingGuest = !hasImportedGuestData(userId);

        if (importingGuest) {
          const guest = readGuestUserData();
          const imported = mergeGuestImport(next, guest, remote);
          if (!sameValue(imported.favourites, next.favourites)) {
            for (const number of imported.favourites) {
              if (!next.favourites.includes(number)) {
                nextOutbox = queueFavouriteChange(nextOutbox, number, true);
              }
            }
            nextDirty.favourites = true;
          }
          if (!sameValue(imported.appearance, next.appearance)) {
            nextOutbox = queueAppearanceChange(nextOutbox, imported.appearance);
            nextDirty.appearance = true;
          }
          if (
            !sameValue(imported.hourlySettings, next.hourlySettings) ||
            imported.lastHourlyKural !== next.lastHourlyKural ||
            imported.timeZone !== next.timeZone
          ) {
            nextOutbox = queueHourlyChange(nextOutbox, imported.hourlySettings);
            nextOutbox = queueLastHourlyKuralChange(
              nextOutbox,
              imported.lastHourlyKural,
            );
            nextOutbox = queueTimeZoneChange(nextOutbox, imported.timeZone);
            nextDirty.hourly = true;
          }
          next = imported;
        }

        replaceSnapshot(next);
        replaceDirty(nextDirty);
        replaceOutbox(nextOutbox);
        writeCachedUserData(userId, next, nextDirty);

        const synchronized = !hasDirtyData(nextDirty) || (await synchronizeDirty(userId));
        if (
          generationRef.current !== generation ||
          refreshSequenceRef.current !== refreshSequence ||
          userIdRef.current !== userId
        ) {
          return;
        }

        if (importingGuest && synchronized) {
          markGuestDataImported(userId);
          clearImportedGuestUserData();
        }
        setSyncStatus(synchronized ? "synced" : "offline");
        setSyncError(synchronized ? null : friendlySyncError);
      } catch {
        if (
          generationRef.current !== generation ||
          refreshSequenceRef.current !== refreshSequence ||
          userIdRef.current !== userId
        ) {
          return;
        }
        remoteReadyRef.current = false;
        setSyncStatus("offline");
        setSyncError(friendlySyncError);
      } finally {
        if (
          generationRef.current === generation &&
          refreshSequenceRef.current === refreshSequence &&
          userIdRef.current === userId
        ) {
          setReady(true);
        }
      }
    },
    [client, replaceDirty, replaceOutbox, replaceSnapshot, synchronizeDirty],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    refreshSequenceRef.current += 1;
    Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
    timersRef.current = {};
    remoteReadyRef.current = false;
    versionsRef.current = { favourites: 0, appearance: 0, hourly: 0 };

    if (authLoading) {
      userIdRef.current = null;
      setActiveUserId(undefined);
      setReady(false);
      setSyncStatus("loading");
      return;
    }

    const userId = user?.id ?? null;
    userIdRef.current = userId;
    setActiveUserId(userId);
    setSyncError(null);

    if (!userId || !client) {
      replaceOutbox({
        ...EMPTY_USER_DATA_OUTBOX,
        lastHourlyKural: { ...EMPTY_USER_DATA_OUTBOX.lastHourlyKural },
      });
      replaceSnapshot(readGuestUserData());
      replaceDirty({ ...CLEAN_USER_DATA });
      setSyncStatus("guest");
      setReady(true);
      return;
    }

    const cached = readCachedUserData(userId);
    const storedOutbox = readUserDataOutbox(userId);
    const cachedDirty = cached?.dirty ?? { ...CLEAN_USER_DATA };
    const restoredDirty: DirtyUserData = {
      favourites:
        cachedDirty.favourites || hasPendingOutboxCategory(storedOutbox, "favourites"),
      appearance:
        cachedDirty.appearance || hasPendingOutboxCategory(storedOutbox, "appearance"),
      hourly: cachedDirty.hourly || hasPendingOutboxCategory(storedOutbox, "hourly"),
    };
    replaceOutbox(storedOutbox);
    replaceSnapshot(cached?.snapshot ?? defaultUserData());
    replaceDirty(restoredDirty);
    setSyncStatus("loading");
    setReady(false);
    void hydrateUser(userId, generation, refreshSequenceRef.current);
  }, [
    authLoading,
    client,
    hydrateUser,
    replaceDirty,
    replaceOutbox,
    replaceSnapshot,
    user?.id,
  ]);

  const retrySync = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId || !client) return;
    const generation = generationRef.current;
    const refreshSequence = ++refreshSequenceRef.current;
    setSyncStatus("loading");
    setSyncError(null);
    if (!remoteReadyRef.current) {
      await hydrateUser(userId, generation, refreshSequence);
      return;
    }
    const synchronized = await synchronizeDirty(userId);
    if (
      generationRef.current !== generation ||
      refreshSequenceRef.current !== refreshSequence ||
      userIdRef.current !== userId
    ) {
      return;
    }
    if (!synchronized && hasDirtyData(dirtyRef.current)) return;
    try {
      const remote = await fetchRemoteUserData(client, userId);
      if (
        generationRef.current !== generation ||
        refreshSequenceRef.current !== refreshSequence ||
        userIdRef.current !== userId ||
        hasDirtyData(dirtyRef.current)
      ) {
        return;
      }
      replaceSnapshot(remote.snapshot);
      writeCachedUserData(userId, remote.snapshot, dirtyRef.current);
      setSyncStatus("synced");
      setSyncError(null);
    } catch {
      setSyncStatus("offline");
      setSyncError(friendlySyncError);
    }
  }, [client, hydrateUser, replaceSnapshot, synchronizeDirty]);

  useEffect(() => {
    const retry = () => void retrySync();
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [retrySync]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const value = useMemo(
    () => ({
      favourites: snapshot.favourites,
      toggleFavourite: (number: number) => {
        const favourite = !snapshotRef.current.favourites.includes(number);
        if (userIdRef.current) {
          replaceOutbox(queueFavouriteChange(outboxRef.current, number, favourite));
        }
        commitCategory("favourites", (current) => ({
          ...current,
          favourites: favourite
            ? [number, ...current.favourites.filter((item) => item !== number)].slice(0, 100)
            : current.favourites.filter((item) => item !== number),
        }));
      },
      appearance: snapshot.appearance,
      updateAppearance: (patch: Partial<UserDataSnapshot["appearance"]>) => {
        if (userIdRef.current) {
          replaceOutbox(queueAppearanceChange(outboxRef.current, patch));
        }
        commitCategory("appearance", (current) => ({
          ...current,
          appearance: { ...current.appearance, ...patch },
        }));
      },
      hourlySettings: snapshot.hourlySettings,
      updateHourlySettings: (patch: Partial<UserDataSnapshot["hourlySettings"]>) => {
        if (userIdRef.current) {
          replaceOutbox(queueHourlyChange(outboxRef.current, patch));
        }
        commitCategory("hourly", (current) => ({
          ...current,
          hourlySettings: { ...current.hourlySettings, ...patch },
        }));
      },
      lastHourlyKural: snapshot.lastHourlyKural,
      setLastHourlyKural: (number: number) => {
        if (userIdRef.current) {
          replaceOutbox(queueLastHourlyKuralChange(outboxRef.current, number));
        }
        commitCategory("hourly", (current) => ({ ...current, lastHourlyKural: number }));
      },
      syncStatus,
      syncError,
      retrySync,
      deviceKey: (baseKey: string) => scopedDeviceKey(baseKey, userIdRef.current),
    }),
    [commitCategory, replaceOutbox, retrySync, snapshot, syncError, syncStatus],
  );

  const requestedUserId = authLoading ? undefined : user?.id ?? null;
  if (!ready || activeUserId !== requestedUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center" role="status">
        <p className="text-sm text-muted-foreground">Syncing your Kural Companion…</p>
      </div>
    );
  }

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}
