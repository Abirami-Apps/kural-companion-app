import { TOTAL_KURALS } from "@/data/sample-kurals";

/**
 * Parses a kural number coming from a URL (route param or `?k=`).
 * Returns null for anything that is not an in-range integer.
 */
export function parseKuralNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_KURALS) return null;
  return n;
}

export function isValidKuralNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_KURALS;
}

export function prevNumber(n: number): number | null {
  return n > 1 ? n - 1 : null;
}

export function nextNumber(n: number): number | null {
  return n < TOTAL_KURALS ? n + 1 : null;
}

/** Can this keypad entry still grow into another valid kural number? */
export function canGrow(value: string): boolean {
  if (value.length >= 4) return false;
  return Number(value + "0") <= TOTAL_KURALS;
}

/** Reads a persisted number list, recovering from corrupted localStorage. */
export function readNumberList(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is number => typeof n === "number" && isValidKuralNumber(n),
    );
  } catch {
    return [];
  }
}

export function writeNumberList(key: string, list: number[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage unavailable (private mode / quota) — keep working in memory */
  }
}

export function readPersistedKuralNumber(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key));
    return isValidKuralNumber(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePersistedKuralNumber(key: string, number: number): void {
  if (!isValidKuralNumber(number)) return;
  try {
    localStorage.setItem(key, String(number));
  } catch {
    /* Storage unavailable; the current player still works in memory. */
  }
}

/** Formats seconds as m:ss, tolerating NaN/Infinity from unloaded media. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const FAVS_KEY = "kural:favs";
export const RECENTS_KEY = "kural:recents";
export const HINT_KEY = "kural:hint-seen";
export const LAST_PLAYED_KEY = "kural:last-played";
