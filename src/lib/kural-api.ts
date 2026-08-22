import { getKural, getAllKurals, type Kural } from "@/data/sample-kurals";

/** Public read-only origin for the Hostinger Kural database API. */
export const KURAL_API_BASE_URL = (
  import.meta.env.VITE_KURAL_API_URL?.trim() || "https://api.abirami.app"
).replace(/\/+$/, "");

type ApiResponse = { data?: unknown };

const request = async (path: string, signal?: AbortSignal): Promise<unknown> => {
  const response = await fetch(`${KURAL_API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Kural API request failed (${response.status})`);
  const payload = (await response.json()) as ApiResponse;
  return payload.data;
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

/** Normalize the API response so UI code has the same shape as the JSON fallback. */
export function normalizeApiKural(value: unknown): Kural | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const number = Number(row.number);
  const tamil = optionalString(row.tamil);
  const chapter = optionalString(row.chapter) ?? optionalString(row.chapterTitle);
  const chapterNumber = Number(row.chapterNumber);
  const section = optionalString(row.section) ?? optionalString(row.paal);
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 1330 ||
    !tamil ||
    !chapter ||
    !Number.isInteger(chapterNumber) ||
    !section
  ) {
    return undefined;
  }

  return {
    number,
    tamil,
    meaning: optionalString(row.meaning),
    generalMeaning: optionalString(row.generalMeaning),
    englishCouplet: optionalString(row.englishCouplet),
    transliteration: optionalString(row.transliteration),
    chapter,
    chapterNumber,
    section,
    paal: optionalString(row.paal),
    iyal: optionalString(row.iyal),
    chapterTitle: optionalString(row.chapterTitle),
    chapterLabel: optionalString(row.chapterLabel),
    line1: optionalString(row.line1),
    line2: optionalString(row.line2),
    audioUrl: optionalString(row.audioUrl),
    legacyAudioUrl: optionalString(row.legacyAudioUrl),
    updatedAt: row.updatedAt === null ? null : optionalString(row.updatedAt),
  };
}

const singleCache = new Map<number, Kural>();
let libraryCache: Kural[] | undefined;

export function getCachedApiKural(number: number): Kural | undefined {
  return singleCache.get(number);
}

export async function fetchKuralFromApi(
  number: number,
  signal?: AbortSignal,
): Promise<Kural | undefined> {
  if (singleCache.has(number)) return singleCache.get(number);
  try {
    const value = normalizeApiKural(await request(`/kurals/${number}`, signal));
    if (value) singleCache.set(number, value);
    return value;
  } catch {
    return undefined;
  }
}

/** Fetch the full library for chapters/favourites, with the local JSON as fallback. */
export async function fetchKuralsFromApi(signal?: AbortSignal): Promise<Kural[]> {
  if (libraryCache) return libraryCache;
  try {
    const values = await request("/kurals?limit=1330", signal);
    if (!Array.isArray(values)) throw new Error("Invalid Kural API list response");
    const normalized = values
      .map(normalizeApiKural)
      .filter((value): value is Kural => value !== undefined)
      .sort((a, b) => a.number - b.number);
    if (normalized.length !== 1330) throw new Error("Incomplete Kural API list response");
    libraryCache = normalized;
    normalized.forEach((kural) => singleCache.set(kural.number, kural));
    return normalized;
  } catch {
    return getAllKurals();
  }
}

export function getKuralWithFallback(number: number): Kural | undefined {
  return getCachedApiKural(number) ?? getKural(number);
}
