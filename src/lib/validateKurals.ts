import { getAllKurals, SECTIONS, TOTAL_KURALS, type Kural } from "@/data/sample-kurals";

export interface KuralDataReport {
  ok: boolean;
  total: number;
  errors: string[];
  chapterCount: number;
  sections: string[];
  /** Records whose whitespace token counts are not 4 then 3. Informational only. */
  tokenAnomalies: { number: number; counts: number[] }[];
}

const EXPECTED_SECTIONS = [...SECTIONS] as string[];

/**
 * Non-destructive validation of the bundled kural dataset.
 * It only reports; it never edits, reflows or corrects Tamil text.
 */
export function validateKurals(data: Kural[] = getAllKurals()): KuralDataReport {
  const errors: string[] = [];
  const seen = new Set<number>();
  const chapters = new Set<number>();
  const sections = new Set<string>();
  const tokenAnomalies: { number: number; counts: number[] }[] = [];

  if (data.length !== TOTAL_KURALS) {
    errors.push(`Expected ${TOTAL_KURALS} records, found ${data.length}`);
  }

  for (const k of data) {
    const id = k.number;
    if (!Number.isInteger(id) || id < 1 || id > TOTAL_KURALS) {
      errors.push(`Invalid kural number: ${String(id)}`);
      continue;
    }
    if (seen.has(id)) errors.push(`Duplicate kural number: ${id}`);
    seen.add(id);

    if (!k.tamil || !k.tamil.trim()) errors.push(`Kural ${id}: missing Tamil text`);
    if (!k.chapter || !k.chapter.trim()) errors.push(`Kural ${id}: missing chapter`);
    if (!Number.isInteger(k.chapterNumber)) errors.push(`Kural ${id}: missing chapter number`);
    if (!k.section || !k.section.trim()) errors.push(`Kural ${id}: missing section`);
    if (!k.audioUrl) errors.push(`Kural ${id}: missing audio URL`);
    else if (!k.audioUrl.startsWith("https://"))
      errors.push(`Kural ${id}: audio URL is not HTTPS`);

    const lines = (k.tamil ?? "").split(/\r?\n/);
    if (lines.length !== 2) {
      errors.push(`Kural ${id}: expected exactly 2 source lines, found ${lines.length}`);
    } else if (!lines[0].trim() || !lines[1].trim()) {
      errors.push(`Kural ${id}: a source line is empty`);
    } else {
      // Whitespace tokens are NOT Tamil சீர். Report only.
      const counts = lines.map((l) => l.trim().split(/\s+/).length);
      if (counts[0] !== 4 || counts[1] !== 3) tokenAnomalies.push({ number: id, counts });
    }

    if (Number.isInteger(k.chapterNumber)) chapters.add(k.chapterNumber);
    if (k.section) sections.add(k.section);
  }

  for (let i = 1; i <= TOTAL_KURALS; i++) {
    if (!seen.has(i)) errors.push(`Missing kural number: ${i}`);
  }

  if (chapters.size !== 133) errors.push(`Expected 133 chapters, found ${chapters.size}`);

  const sectionList = [...sections];
  const unexpected = sectionList.filter((s) => !EXPECTED_SECTIONS.includes(s));
  if (unexpected.length) errors.push(`Unexpected sections: ${unexpected.join(", ")}`);
  const missingSections = EXPECTED_SECTIONS.filter((s) => !sections.has(s));
  if (missingSections.length) errors.push(`Missing sections: ${missingSections.join(", ")}`);

  return {
    ok: errors.length === 0,
    total: data.length,
    errors,
    chapterCount: chapters.size,
    sections: sectionList,
    tokenAnomalies,
  };
}
