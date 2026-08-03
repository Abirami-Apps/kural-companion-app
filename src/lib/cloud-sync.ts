import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_APPEARANCE,
  defaultUserData,
  isDefaultAppearance,
  isDefaultHourly,
  parseAppearance,
  reconcileFavouriteNumbers,
  type AppearancePreferences,
  type UserDataSnapshot,
} from "@/lib/user-data";
import { parseHourlySettings, type HourlyKuralSettings } from "@/lib/hourly-kural";

interface FavouriteRow {
  kural_number: number;
}

interface PreferencesRow {
  theme: string;
  font_step: number;
  high_contrast: boolean;
  reduced_motion: boolean;
  updated_at: string;
}

interface HourlyRow {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  language: string;
  selection_mode: string;
  include_meaning: boolean;
  time_zone: string;
  last_kural_number: number | null;
  updated_at: string;
}

interface ProfileRow {
  created_at: string;
}

export interface RemoteUserData {
  snapshot: UserDataSnapshot;
  preferencesUntouched: boolean;
  hourlyUntouched: boolean;
}

const closeToCreation = (updatedAt: string | undefined, createdAt: string | undefined) => {
  if (!updatedAt || !createdAt) return false;
  const difference = Math.abs(Date.parse(updatedAt) - Date.parse(createdAt));
  return Number.isFinite(difference) && difference <= 15_000;
};

const throwFirstError = (...results: { error: { message: string } | null }[]) => {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
};

export async function fetchRemoteUserData(
  client: SupabaseClient,
  userId: string,
): Promise<RemoteUserData> {
  const [favouritesResult, preferencesResult, hourlyResult, profileResult] = await Promise.all([
    client
      .from("favourites")
      .select("kural_number")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    client
      .from("user_preferences")
      .select("theme,font_step,high_contrast,reduced_motion,updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("hourly_kural_settings")
      .select(
        "enabled,start_hour,end_hour,language,selection_mode,include_meaning,time_zone,last_kural_number,updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    client.from("profiles").select("created_at").eq("user_id", userId).maybeSingle(),
  ]);

  throwFirstError(favouritesResult, preferencesResult, hourlyResult, profileResult);

  const defaults = defaultUserData();
  const preferences = preferencesResult.data as PreferencesRow | null;
  const hourly = hourlyResult.data as HourlyRow | null;
  const profile = profileResult.data as ProfileRow | null;

  const appearance = preferences
    ? parseAppearance({
        theme: preferences.theme,
        fontStep: preferences.font_step,
        highContrast: preferences.high_contrast,
        reducedMotion: preferences.reduced_motion,
      })
    : { ...DEFAULT_APPEARANCE };
  const hourlySettings = hourly
    ? parseHourlySettings({
        enabled: hourly.enabled,
        startHour: hourly.start_hour,
        endHour: hourly.end_hour,
        language: hourly.language,
        selection: hourly.selection_mode,
        includeMeaning: hourly.include_meaning,
      })
    : defaults.hourlySettings;

  return {
    snapshot: {
      favourites: ((favouritesResult.data ?? []) as FavouriteRow[]).map(
        (row) => row.kural_number,
      ),
      appearance,
      hourlySettings,
      lastHourlyKural: hourly?.last_kural_number ?? null,
      timeZone: hourly?.time_zone ?? defaults.timeZone,
    },
    preferencesUntouched:
      (!preferences || closeToCreation(preferences.updated_at, profile?.created_at)) &&
      isDefaultAppearance(appearance),
    hourlyUntouched:
      (!hourly || closeToCreation(hourly.updated_at, profile?.created_at)) &&
      isDefaultHourly(hourlySettings, hourly?.last_kural_number ?? null),
  };
}

export async function syncCloudFavourites(
  client: SupabaseClient,
  userId: string,
  favourites: number[],
): Promise<void> {
  const remoteResult = await client
    .from("favourites")
    .select("kural_number")
    .eq("user_id", userId);
  if (remoteResult.error) throw new Error(remoteResult.error.message);

  const remote = ((remoteResult.data ?? []) as FavouriteRow[]).map((row) => row.kural_number);
  const { add, remove } = reconcileFavouriteNumbers(favourites, remote);

  if (add.length) {
    const result = await client.from("favourites").upsert(
      add.map((kuralNumber) => ({ user_id: userId, kural_number: kuralNumber })),
      { onConflict: "user_id,kural_number", ignoreDuplicates: true },
    );
    if (result.error) throw new Error(result.error.message);
  }
  if (remove.length) {
    const result = await client
      .from("favourites")
      .delete()
      .eq("user_id", userId)
      .in("kural_number", remove);
    if (result.error) throw new Error(result.error.message);
  }
}

export async function syncCloudFavouriteOperations(
  client: SupabaseClient,
  userId: string,
  additions: number[],
  removals: number[],
): Promise<void> {
  if (removals.length) {
    const result = await client
      .from("favourites")
      .delete()
      .eq("user_id", userId)
      .in("kural_number", removals);
    if (result.error) throw new Error(result.error.message);
  }
  if (additions.length) {
    const result = await client.from("favourites").upsert(
      additions.map((kuralNumber) => ({ user_id: userId, kural_number: kuralNumber })),
      { onConflict: "user_id,kural_number", ignoreDuplicates: true },
    );
    if (result.error) throw new Error(result.error.message);
  }
}

export async function syncCloudAppearance(
  client: SupabaseClient,
  userId: string,
  appearance: AppearancePreferences,
): Promise<void> {
  const result = await client
    .from("user_preferences")
    .update({
      theme: appearance.theme,
      font_step: appearance.fontStep,
      high_contrast: appearance.highContrast,
      reduced_motion: appearance.reducedMotion,
    })
    .eq("user_id", userId);
  if (result.error) throw new Error(result.error.message);
}

export async function syncCloudAppearancePatch(
  client: SupabaseClient,
  userId: string,
  appearance: Partial<AppearancePreferences>,
): Promise<void> {
  const payload: Record<string, string | number | boolean> = {};
  if (appearance.theme !== undefined) payload.theme = appearance.theme;
  if (appearance.fontStep !== undefined) payload.font_step = appearance.fontStep;
  if (appearance.highContrast !== undefined) payload.high_contrast = appearance.highContrast;
  if (appearance.reducedMotion !== undefined) payload.reduced_motion = appearance.reducedMotion;
  if (!Object.keys(payload).length) return;

  const result = await client.from("user_preferences").update(payload).eq("user_id", userId);
  if (result.error) throw new Error(result.error.message);
}

export async function syncCloudHourly(
  client: SupabaseClient,
  userId: string,
  settings: HourlyKuralSettings,
  lastHourlyKural: number | null,
  timeZone: string,
): Promise<void> {
  const result = await client
    .from("hourly_kural_settings")
    .update({
      enabled: settings.enabled,
      start_hour: settings.startHour,
      end_hour: settings.endHour,
      language: settings.language,
      selection_mode: settings.selection,
      include_meaning: settings.includeMeaning,
      time_zone: timeZone,
      last_kural_number: lastHourlyKural,
    })
    .eq("user_id", userId);
  if (result.error) throw new Error(result.error.message);
}

export async function syncCloudHourlyPatch(
  client: SupabaseClient,
  userId: string,
  settings: Partial<HourlyKuralSettings>,
  lastHourlyKural: { pending: boolean; value: number | null },
  timeZone: string | null,
): Promise<void> {
  const payload: Record<string, string | number | boolean | null> = {};
  if (settings.enabled !== undefined) payload.enabled = settings.enabled;
  if (settings.startHour !== undefined) payload.start_hour = settings.startHour;
  if (settings.endHour !== undefined) payload.end_hour = settings.endHour;
  if (settings.language !== undefined) payload.language = settings.language;
  if (settings.selection !== undefined) payload.selection_mode = settings.selection;
  if (settings.includeMeaning !== undefined) payload.include_meaning = settings.includeMeaning;
  if (lastHourlyKural.pending) payload.last_kural_number = lastHourlyKural.value;
  if (timeZone !== null) payload.time_zone = timeZone;
  if (!Object.keys(payload).length) return;

  const result = await client
    .from("hourly_kural_settings")
    .update(payload)
    .eq("user_id", userId);
  if (result.error) throw new Error(result.error.message);
}
