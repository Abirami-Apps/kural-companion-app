import kuralsJson from "./kurals.json";

export interface Kural {
  number: number;
  tamil: string;
  chapter: string;
  section: string;
  audioUrl?: string;
}

interface RawKural {
  kuralno: number;
  Kural: string;
  Adikaram: string;
  pirivu: string;
  audiolink?: string;
}

const rawData = kuralsJson as Record<string, RawKural>;

const kuralsMap = new Map<number, Kural>();

Object.values(rawData).forEach((raw) => {
  kuralsMap.set(raw.kuralno, {
    number: raw.kuralno,
    tamil: raw.Kural,
    chapter: raw.Adikaram,
    section: raw.pirivu,
    audioUrl: raw.audiolink,
  });
});

export function getKural(number: number): Kural | undefined {
  return kuralsMap.get(number);
}

export const TOTAL_KURALS = 1330;
export const FREE_LIMIT = 10;
