import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserDataContext, type UserDataSyncStatus } from "@/contexts/UserDataContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchRemoteUserData,
  syncCloudAppearance,
  syncCloudFavourites,
  syncCloudHourly,
} from "@/lib/cloud-sync";
import { supabase } from "@/lib/supabase";
import {
  CLEAN_USER_DATA,
  clearImportedGuestUserData,
  defaultUserData,
  hasImportedGuestData,
  markGuestDataImported,
  mergeGuestImport,
  readCachedUserData,
  readGuestUserData,
  scopedDeviceKey,
  writeCachedUserData,
  writeGuestUserData,
  type DirtyUserData,
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
) {
  if (category === "favourites") {
    await syncCloudFavourites(client, userId, snapshot.favourites);
  } else if (category === "appearance") {
    await syncCloudAppearance(client, userId, snapshot.appearance);
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

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const client = supabase;
  const [snapshot, setSnapshot] = useState<UserDataSnapshot>(readGuestUserData);
  const [dirty, setDirty] = useState<DirtyUserData>({ ...CLEAN_USER_DATA });
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<UserDataSyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  const dirtyRef = useRef(dirty);
  const userIdRef = useRef<string | null>(null);
  const remoteReadyRef = useRef(false);
  const generationRef = useRef(0);
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

  const persistCurrent = useCallback(() => {
    const userId = userIdRef.current;
    if (userId) writeCachedUserData(userId, snapshotRef.current, dirtyRef.current);
    else writeGuestUserData(snapshotRef.current);
  }, []);

  const flushCategory = useCallback(
    async (category: SyncCategory, expectedUserId: string, expectedVersion: number) => {
      if (!client || userIdRef.current !== expectedUserId) return false;
      try {
        await syncCategory(client, expectedUserId, category, snapshotRef.current);
        if (
          userIdRef.current === expectedUserId &&
          versionsRef.current[category] === expectedVersion
        ) {
          const nextDirty = { ...dirtyRef.current, [category]: false };
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
    [client, replaceDirty],
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
    async (userId: string, generation: number) => {
      if (!client || userIdRef.current !== userId) return;
      try {
        const remote = await fetchRemoteUserData(client, userId);
        if (generationRef.current !== generation || userIdRef.current !== userId) return;
        remoteReadyRef.current = true;

        const local = snapshotRef.current;
        const localDirty = dirtyRef.current;
        let next: UserDataSnapshot = {
          favourites: localDirty.favourites ? local.favourites : remote.snapshot.favourites,
          appearance: localDirty.appearance ? local.appearance : remote.snapshot.appearance,
          hourlySettings: localDirty.hourly
            ? local.hourlySettings
            : remote.snapshot.hourlySettings,
          lastHourlyKural: localDirty.hourly
            ? local.lastHourlyKural
            : remote.snapshot.lastHourlyKural,
          timeZone: localDirty.hourly ? local.timeZone : remote.snapshot.timeZone,
        };
        const nextDirty = { ...localDirty };
        const importingGuest = !hasImportedGuestData(userId);

        if (importingGuest) {
          const guest = readGuestUserData();
          const imported = mergeGuestImport(next, guest, remote);
          if (!sameValue(imported.favourites, next.favourites)) nextDirty.favourites = true;
          if (!sameValue(imported.appearance, next.appearance)) nextDirty.appearance = true;
          if (
            !sameValue(imported.hourlySettings, next.hourlySettings) ||
            imported.lastHourlyKural !== next.lastHourlyKural ||
            imported.timeZone !== next.timeZone
          ) {
            nextDirty.hourly = true;
          }
          next = imported;
        }

        replaceSnapshot(next);
        replaceDirty(nextDirty);
        writeCachedUserData(userId, next, nextDirty);

        const synchronized = !hasDirtyData(nextDirty) || (await synchronizeDirty(userId));
        if (generationRef.current !== generation || userIdRef.current !== userId) return;

        if (importingGuest && synchronized) {
          markGuestDataImported(userId);
          clearImportedGuestUserData();
        }
        setSyncStatus(synchronized ? "synced" : "offline");
        setSyncError(synchronized ? null : friendlySyncError);
      } catch {
        if (generationRef.current !== generation || userIdRef.current !== userId) return;
        remoteReadyRef.current = false;
        setSyncStatus("offline");
        setSyncError(friendlySyncError);
      } finally {
        if (generationRef.current === generation && userIdRef.current === userId) setReady(true);
      }
    },
    [client, replaceDirty, replaceSnapshot, synchronizeDirty],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
    timersRef.current = {};
    remoteReadyRef.current = false;
    versionsRef.current = { favourites: 0, appearance: 0, hourly: 0 };

    if (authLoading) {
      setReady(false);
      setSyncStatus("loading");
      return;
    }

    const userId = user?.id ?? null;
    userIdRef.current = userId;
    setSyncError(null);

    if (!userId || !client) {
      replaceSnapshot(readGuestUserData());
      replaceDirty({ ...CLEAN_USER_DATA });
      setSyncStatus("guest");
      setReady(true);
      return;
    }

    const cached = readCachedUserData(userId);
    replaceSnapshot(cached?.snapshot ?? defaultUserData());
    replaceDirty(cached?.dirty ?? { ...CLEAN_USER_DATA });
    setSyncStatus("loading");
    setReady(false);
    void hydrateUser(userId, generation);
  }, [authLoading, client, hydrateUser, replaceDirty, replaceSnapshot, user?.id]);

  const retrySync = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId || !client) return;
    setSyncStatus("loading");
    setSyncError(null);
    if (!remoteReadyRef.current) {
      await hydrateUser(userId, generationRef.current);
      return;
    }
    const synchronized = await synchronizeDirty(userId);
    if (!synchronized && hasDirtyData(dirtyRef.current)) return;
    try {
      const remote = await fetchRemoteUserData(client, userId);
      if (userIdRef.current !== userId || hasDirtyData(dirtyRef.current)) return;
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
      toggleFavourite: (number: number) =>
        commitCategory("favourites", (current) => ({
          ...current,
          favourites: current.favourites.includes(number)
            ? current.favourites.filter((item) => item !== number)
            : [number, ...current.favourites].slice(0, 100),
        })),
      appearance: snapshot.appearance,
      updateAppearance: (patch: Partial<UserDataSnapshot["appearance"]>) =>
        commitCategory("appearance", (current) => ({
          ...current,
          appearance: { ...current.appearance, ...patch },
        })),
      hourlySettings: snapshot.hourlySettings,
      updateHourlySettings: (patch: Partial<UserDataSnapshot["hourlySettings"]>) =>
        commitCategory("hourly", (current) => ({
          ...current,
          hourlySettings: { ...current.hourlySettings, ...patch },
        })),
      lastHourlyKural: snapshot.lastHourlyKural,
      setLastHourlyKural: (number: number) =>
        commitCategory("hourly", (current) => ({ ...current, lastHourlyKural: number })),
      syncStatus,
      syncError,
      retrySync,
      deviceKey: (baseKey: string) => scopedDeviceKey(baseKey, userIdRef.current),
    }),
    [commitCategory, retrySync, snapshot, syncError, syncStatus],
  );

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center" role="status">
        <p className="text-sm text-muted-foreground">Syncing your Kural Companion…</p>
      </div>
    );
  }

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}
