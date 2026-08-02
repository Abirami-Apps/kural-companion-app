import kuralsJson from "./kurals.json";

export interface Kural {
  number: number;
  tamil: string;
  meaning?: string;
  chapter: string;
  chapterNumber: number;
  section: string;
  audioUrl?: string;
}

interface RawKural {
  kuralno: number;
  Kural: string;
  Porul?: string;
  Adikaram: string;
  adikaramno: number;
  pirivu: string;
  audiolink?: string;
}

const rawData = kuralsJson as Record<string, RawKural>;

const canonicalSection = (number: number) => {
  if (number <= 380) return "அறத்துப்பால்";
  if (number <= 1080) return "பொருட்பால்";
  return "காமத்துப்பால்";
};

/**
 * The legacy export's metadata contains one extra heading ("ஊழியல்") at
 * chapter 38 and omits "பிரிவாற்றாமை" at chapter 116. Its verse, meaning and
 * audio records are correctly numbered, so repair only the presentation
 * metadata here and leave the source JSON untouched.
 */
const canonicalChapter = (raw: RawKural) => {
  if (raw.adikaramno === 116) return "பிரிவாற்றாமை";
  if (raw.adikaramno >= 38 && raw.adikaramno <= 115) {
    const nextChapter = rawData[String(raw.adikaramno * 10 + 1)];
    return nextChapter?.Adikaram ?? raw.Adikaram;
  }
  return raw.Adikaram;
};

const kuralsMap = new Map<number, Kural>();
const allKurals: Kural[] = [];

Object.values(rawData).forEach((raw) => {
  const kural: Kural = {
    number: raw.kuralno,
    tamil: raw.Kural,
    meaning: raw.Porul,
    chapter: canonicalChapter(raw),
    chapterNumber: raw.adikaramno,
    section: canonicalSection(raw.kuralno),
    audioUrl: raw.audiolink,
  };
  kuralsMap.set(raw.kuralno, kural);
  allKurals.push(kural);
});

allKurals.sort((a, b) => a.number - b.number);

export function getKural(number: number): Kural | undefined {
  return kuralsMap.get(number);
}

export function getKuralsBySection(section: string): Kural[] {
  return allKurals.filter((k) => k.section === section);
}

export function getRandomKural(): Kural {
  const idx = Math.floor(Math.random() * allKurals.length);
  return allKurals[idx];
}

export function getAllKurals(): Kural[] {
  return allKurals;
}

// Canonical section names. Some editions call the third division
// "இன்பத்துப்பால்"; this app uses "காமத்துப்பால்" consistently.
export const SECTIONS = ["அறத்துப்பால்", "பொருட்பால்", "காமத்துப்பால்"] as const;
export const TOTAL_KURALS = 1330;
export const FREE_LIMIT = 10;
