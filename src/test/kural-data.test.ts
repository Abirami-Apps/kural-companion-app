import { describe, expect, it } from "vitest";
import {
  getAllKurals,
  getKural,
  getKuralsBySection,
  SECTIONS,
  TOTAL_KURALS,
} from "@/data/sample-kurals";
import { validateKurals } from "@/lib/validateKurals";

describe("bundled Thirukkural data", () => {
  it("contains every numbered kural exactly once", () => {
    const kurals = getAllKurals();
    expect(kurals).toHaveLength(TOTAL_KURALS);
    expect(kurals.map((k) => k.number)).toEqual(
      Array.from({ length: TOTAL_KURALS }, (_, index) => index + 1),
    );
    expect(getKural(1)?.number).toBe(1);
    expect(getKural(1330)?.number).toBe(1330);
  });

  it("passes the non-destructive release validator", () => {
    const report = validateKurals();
    expect(report.ok, report.errors.join("\n")).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.chapterCount).toBe(133);
    expect(new Set(report.sections)).toEqual(new Set(SECTIONS));
  });

  it("preserves exactly two non-empty source lines for all 1,330 records", () => {
    for (const kural of getAllKurals()) {
      const lines = kural.tamil.split(/\r?\n/);
      expect(lines, `Kural ${kural.number}`).toHaveLength(2);
      expect(lines[0].trim(), `Kural ${kural.number} line 1`).not.toBe("");
      expect(lines[1].trim(), `Kural ${kural.number} line 2`).not.toBe("");
    }
  });

  it("reports the known whitespace-token anomalies without altering text", () => {
    const report = validateKurals();
    expect(report.tokenAnomalies).toHaveLength(83);
    expect(report.tokenAnomalies.every((item) => item.counts.length === 2)).toBe(true);
  });

  it("maps all three source section names to non-empty chapter results", () => {
    expect(getKuralsBySection("அறத்துப்பால்")).toHaveLength(380);
    expect(getKuralsBySection("பொருட்பால்")).toHaveLength(700);
    expect(getKuralsBySection("காமத்துப்பால்")).toHaveLength(250);
  });

  it("repairs the legacy chapter-metadata shift without changing source verse text", () => {
    expect(getKural(371)?.chapter).toBe("ஊழ்");
    expect(getKural(381)?.chapter).toBe("இறைமாட்சி");
    expect(getKural(1081)?.chapter).toBe("தகையணங்குறுத்தல்");
    expect(getKural(1151)?.chapter).toBe("பிரிவாற்றாமை");
    expect(getKural(1161)?.chapter).toBe("படர்மெலிந்திரங்கல்");
  });
});
