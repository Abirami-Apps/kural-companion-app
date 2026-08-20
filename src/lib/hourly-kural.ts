import { TOTAL_KURALS } from "@/data/sample-kurals";

export type HourlyLanguage = "ta" | "en";
export type HourlySelection = "random" | "sequential" | "favourites";

export interface HourlyKuralSettings {
  enabled: boolean;
  startHour: number;
  endHour: number;
  language: HourlyLanguage;
  selection: HourlySelection;
  includeMeaning: boolean;
}

export interface HourlyNotificationContent {
  title: string;
  body: string;
}

export const HOURLY_SETTINGS_KEY = "kural:hourly-settings";
export const HOURLY_LAST_KURAL_KEY = "kural:hourly-last-kural";
export const HOURLY_LAST_RUN_KEY = "kural:hourly-last-run";

export const DEFAULT_HOURLY_SETTINGS: HourlyKuralSettings = {
  enabled: false,
  startHour: 7,
  endHour: 22,
  language: "ta",
  selection: "random",
  includeMeaning: false,
};

const validHour = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23;

export function parseHourlySettings(value: unknown): HourlyKuralSettings {
  if (!value || typeof value !== "object") return DEFAULT_HOURLY_SETTINGS;
  const input = value as Partial<HourlyKuralSettings>;
  return {
    enabled: input.enabled === true,
    startHour: validHour(input.startHour) ? input.startHour : DEFAULT_HOURLY_SETTINGS.startHour,
    endHour: validHour(input.endHour) ? input.endHour : DEFAULT_HOURLY_SETTINGS.endHour,
    language: input.language === "en" ? "en" : "ta",
    selection: ["random", "sequential", "favourites"].includes(input.selection ?? "")
      ? (input.selection as HourlySelection)
      : DEFAULT_HOURLY_SETTINGS.selection,
    includeMeaning: input.includeMeaning === true,
  };
}

export function readHourlySettings(): HourlyKuralSettings {
  if (typeof window === "undefined") return DEFAULT_HOURLY_SETTINGS;
  try {
    const raw = localStorage.getItem(HOURLY_SETTINGS_KEY);
    return raw ? parseHourlySettings(JSON.parse(raw)) : DEFAULT_HOURLY_SETTINGS;
  } catch {
    return DEFAULT_HOURLY_SETTINGS;
  }
}

export function isHourActive(hour: number, startHour: number, endHour: number): boolean {
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

/** Returns the next top-of-hour occurrence inside the active window. */
export function getNextHourlyOccurrence(
  now: Date,
  settings: Pick<HourlyKuralSettings, "startHour" | "endHour">,
): Date {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);

  for (let index = 0; index < 48; index += 1) {
    if (isHourActive(next.getHours(), settings.startHour, settings.endHour)) return next;
    next.setHours(next.getHours() + 1);
  }
  return next;
}

export function hourlyRunKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}`;
}

const TAMIL_HOURS = [
  "பன்னிரண்டு",
  "ஒன்று",
  "இரண்டு",
  "மூன்று",
  "நான்கு",
  "ஐந்து",
  "ஆறு",
  "ஏழு",
  "எட்டு",
  "ஒன்பது",
  "பத்து",
  "பதினொன்று",
] as const;

const ENGLISH_HOURS = [
  "twelve",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
] as const;

export function timeAnnouncement(date: Date, language: HourlyLanguage): string {
  const hour = date.getHours();
  const hour12 = hour % 12;
  if (language === "en") {
    const period = hour < 12 ? "in the morning" : hour < 17 ? "in the afternoon" : "in the evening";
    return `It is ${ENGLISH_HOURS[hour12]} o'clock ${period}.`;
  }
  const period = hour < 5 ? "இரவு" : hour < 12 ? "காலை" : hour < 16 ? "மதியம்" : hour < 19 ? "மாலை" : "இரவு";
  return `இப்போது ${period} ${TAMIL_HOURS[hour12]} மணி.`;
}

export function hourlyNotificationContent({
  date,
  language,
  number,
  chapter,
}: {
  date: Date;
  language: HourlyLanguage;
  number: number;
  chapter: string;
}): HourlyNotificationContent {
  const title = language === "ta"
    ? `மணிக்குறள் · குறள் ${number}`
    : `Hourly Kural · Kural ${number}`;
  const action = language === "ta" ? "கேட்கத் தட்டவும்." : "Tap to listen.";

  return {
    title,
    body: `${timeAnnouncement(date, language)} ${chapter} · ${action}`,
  };
}

export function chooseHourlyKuralNumber({
  selection,
  lastNumber,
  favourites,
  random = Math.random,
}: {
  selection: HourlySelection;
  lastNumber: number | null;
  favourites: number[];
  random?: () => number;
}): number {
  if (selection === "sequential") {
    return lastNumber && lastNumber < TOTAL_KURALS ? lastNumber + 1 : 1;
  }
  if (selection === "favourites" && favourites.length) {
    if (lastNumber !== null) {
      const currentIndex = favourites.indexOf(lastNumber);
      if (currentIndex >= 0) return favourites[(currentIndex + 1) % favourites.length];
    }
    return favourites[0];
  }
  return Math.min(TOTAL_KURALS, Math.floor(random() * TOTAL_KURALS) + 1);
}

export function formatHour(hour: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
    new Date(2020, 0, 1, hour),
  );
}
