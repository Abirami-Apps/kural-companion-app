import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOURLY_SETTINGS,
  chooseHourlyKuralNumber,
  getNextHourlyOccurrence,
  hourlyNotificationContent,
  hourlyRunKey,
  isHourActive,
  parseHourlySettings,
  timeAnnouncement,
} from "@/lib/hourly-kural";

describe("Hourly Kural scheduling", () => {
  it("repairs invalid stored settings with safe defaults", () => {
    expect(parseHourlySettings(null)).toEqual(DEFAULT_HOURLY_SETTINGS);
    expect(
      parseHourlySettings({
        enabled: true,
        startHour: 99,
        endHour: -1,
        language: "en",
        selection: "favourites",
        includeMeaning: true,
      }),
    ).toEqual({
      enabled: true,
      startHour: 7,
      endHour: 22,
      language: "en",
      selection: "favourites",
      includeMeaning: true,
    });
  });

  it("supports daytime, overnight and all-day windows", () => {
    expect(isHourActive(7, 7, 22)).toBe(true);
    expect(isHourActive(22, 7, 22)).toBe(false);
    expect(isHourActive(23, 22, 6)).toBe(true);
    expect(isHourActive(5, 22, 6)).toBe(true);
    expect(isHourActive(12, 8, 8)).toBe(true);
  });

  it("finds the next top of hour inside the active window", () => {
    const evening = new Date(2026, 7, 2, 21, 45, 30);
    expect(getNextHourlyOccurrence(evening, { startHour: 7, endHour: 22 })).toEqual(
      new Date(2026, 7, 3, 7, 0, 0),
    );

    const morning = new Date(2026, 7, 2, 8, 2, 0);
    expect(getNextHourlyOccurrence(morning, { startHour: 7, endHour: 22 })).toEqual(
      new Date(2026, 7, 2, 9, 0, 0),
    );
  });

  it("creates stable local-hour keys and Tamil or English announcements", () => {
    const date = new Date(2026, 7, 2, 7, 0, 0);
    expect(hourlyRunKey(date)).toBe("2026-08-02T07");
    expect(timeAnnouncement(date, "ta")).toContain("காலை ஏழு மணி");
    expect(timeAnnouncement(date, "en")).toContain("seven o'clock in the morning");
  });

  it("creates concise Tamil and English notification copy", () => {
    const date = new Date(2026, 7, 2, 7, 0, 0);
    expect(
      hourlyNotificationContent({
        date,
        language: "ta",
        number: 141,
        chapter: "ஒழுக்கமுடைமை",
      }),
    ).toEqual({
      title: "மணிக்குறள் · குறள் 141",
      body: "இப்போது காலை ஏழு மணி. ஒழுக்கமுடைமை · கேட்கத் தட்டவும்.",
    });
    expect(
      hourlyNotificationContent({
        date,
        language: "en",
        number: 141,
        chapter: "ஒழுக்கமுடைமை",
      }),
    ).toEqual({
      title: "Hourly Kural · Kural 141",
      body: "It is seven o'clock in the morning. ஒழுக்கமுடைமை · Tap to listen.",
    });
  });

  it("selects sequential, favourite and bounded random Kurals", () => {
    expect(
      chooseHourlyKuralNumber({ selection: "sequential", lastNumber: 100, favourites: [] }),
    ).toBe(101);
    expect(
      chooseHourlyKuralNumber({ selection: "sequential", lastNumber: 1330, favourites: [] }),
    ).toBe(1);
    expect(
      chooseHourlyKuralNumber({
        selection: "favourites",
        lastNumber: 20,
        favourites: [10, 20, 30],
      }),
    ).toBe(30);
    expect(
      chooseHourlyKuralNumber({
        selection: "random",
        lastNumber: null,
        favourites: [],
        random: () => 0.999999,
      }),
    ).toBe(1330);
  });
});
