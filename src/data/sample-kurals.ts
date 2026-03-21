import kuralsJson from "./kurals.json";

export interface Kural {
  number: number;
  tamil: string;
  chapter: string;
  chapterNumber: number;
  section: string;
  audioUrl?: string;
}

interface RawKural {
  kuralno: number;
  Kural: string;
  Adikaram: string;
  adikaramno: number;
  pirivu: string;
  audiolink?: string;
}

const rawData = kuralsJson as Record<string, RawKural>;

const kuralsMap = new Map<number, Kural>();
const allKurals: Kural[] = [];

Object.values(rawData).forEach((raw) => {
  const kural: Kural = {
    number: raw.kuralno,
    tamil: raw.Kural,
    chapter: raw.Adikaram,
    chapterNumber: raw.adikaramno,
    section: raw.pirivu,
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

export const SECTIONS = ["அறத்துப்பால்", "பொருட்பால்", "இன்பத்துப்பால்"] as const;
export const TOTAL_KURALS = 1330;
export const FREE_LIMIT = 10;
