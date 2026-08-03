import { describe, expect, it } from "vitest";
import {
  canGrow,
  formatTime,
  isValidKuralNumber,
  nextNumber,
  parseKuralNumber,
  prevNumber,
  readNumberList,
  readPersistedKuralNumber,
  writeNumberList,
  writePersistedKuralNumber,
} from "@/lib/player-utils";

describe("player number parsing", () => {
  it.each([
    ["1", 1],
    ["0001", 1],
    ["1330", 1330],
    [" 42 ", 42],
  ])("parses %s", (raw, expected) => {
    expect(parseKuralNumber(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "0", "-1", "1.5", "1331", "abcd", "00000"])(
    "rejects %s",
    (raw) => {
      expect(parseKuralNumber(raw)).toBeNull();
    },
  );

  it("enforces sequence boundaries", () => {
    expect(isValidKuralNumber(1)).toBe(true);
    expect(isValidKuralNumber(1330)).toBe(true);
    expect(isValidKuralNumber(0)).toBe(false);
    expect(prevNumber(1)).toBeNull();
    expect(prevNumber(2)).toBe(1);
    expect(nextNumber(1329)).toBe(1330);
    expect(nextNumber(1330)).toBeNull();
  });

  it("knows when keypad input must commit", () => {
    expect(canGrow("1")).toBe(true);
    expect(canGrow("13")).toBe(true);
    expect(canGrow("133")).toBe(true);
    expect(canGrow("1330")).toBe(false);
    expect(canGrow("999")).toBe(false);
  });
});

describe("player persistence and formatting", () => {
  it("round-trips valid persisted lists", () => {
    writeNumberList("test:list", [1, 2, 1330]);
    expect(readNumberList("test:list")).toEqual([1, 2, 1330]);
  });

  it("recovers from malformed or out-of-range storage", () => {
    localStorage.setItem("test:bad-json", "not-json");
    localStorage.setItem("test:mixed", JSON.stringify([0, 1, "2", 42, 1331]));
    expect(readNumberList("test:bad-json")).toEqual([]);
    expect(readNumberList("test:mixed")).toEqual([1, 42]);
  });

  it("persists only a valid last-played Kural number", () => {
    writePersistedKuralNumber("test:last-played", 770);
    expect(readPersistedKuralNumber("test:last-played")).toBe(770);

    writePersistedKuralNumber("test:last-played", 1331);
    expect(readPersistedKuralNumber("test:last-played")).toBe(770);
    localStorage.setItem("test:last-played", "not-a-kural");
    expect(readPersistedKuralNumber("test:last-played")).toBeNull();
  });

  it.each([
    [Number.NaN, "0:00"],
    [Number.POSITIVE_INFINITY, "0:00"],
    [0, "0:00"],
    [5, "0:05"],
    [65.8, "1:05"],
  ])("formats %s seconds", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});
