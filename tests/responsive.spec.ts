import { expect, test } from "@playwright/test";
import { installMediaMock, waitForKural } from "./helpers";

const viewports = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 825 },
  { width: 667, height: 375 },
  { width: 825, height: 393 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`${viewport.width}x${viewport.height} fits and preserves touch targets`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installMediaMock(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      localStorage.setItem(
        "kural:appearance",
        JSON.stringify({
          theme: "classic",
          fontStep: 3,
          highContrast: false,
          reducedMotion: true,
        }),
      );
    });

    await page.goto("/kural/1");
    await waitForKural(page, 1);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);

    const dimensions = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      appWidth: document.getElementById("app-root")?.scrollWidth ?? 0,
      appHeight: document.getElementById("app-root")?.scrollHeight ?? 0,
    }));
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.appWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.bodyHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
    expect(dimensions.appHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1);

    const undersized = await page.locator('button, a[href], input, [role="radio"], [role="switch"]').evaluateAll(
      (elements) =>
        elements.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (element.classList.contains("sr-only")) return [];
          if (!rect.width || !rect.height || style.visibility === "hidden" || style.display === "none") {
            return [];
          }
          if (rect.width >= 43.5 && rect.height >= 43.5) return [];
          return [
            {
              label:
                element.getAttribute("aria-label") ||
                element.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ||
                element.tagName,
              width: Math.round(rect.width * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
            },
          ];
        }),
    );
    expect(undersized, JSON.stringify(undersized, null, 2)).toEqual([]);

    const verseLines = page.locator('[data-fit-probe="verse-line"]');
    await expect(verseLines).toHaveCount(2);
    const overflowingLines = await verseLines.evaluateAll((lines) =>
      lines.flatMap((line) => {
        const rect = line.getBoundingClientRect();
        const parent = line.parentElement?.getBoundingClientRect();
        const fontSize = Number.parseFloat(getComputedStyle(line).fontSize);
        if (parent && rect.width <= parent.width + 1 && fontSize >= 13.5) return [];
        return [{
          text: line.textContent,
          width: rect.width,
          available: parent?.width ?? 0,
          fontSize,
        }];
      }),
    );
    expect(overflowingLines, JSON.stringify(overflowingLines, null, 2)).toEqual([]);

    const clippedMeaning = await page.locator('[data-fit-probe="meaning"]').evaluate((meaning) => {
      const rect = meaning.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const box = meaning.parentElement?.getBoundingClientRect();
      if (box && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1) return null;
      return { top: rect.top, bottom: rect.bottom, boxTop: box?.top, boxBottom: box?.bottom };
    });
    expect(clippedMeaning, JSON.stringify(clippedMeaning, null, 2)).toBeNull();

    const clippedReadingActions = await page.locator('section[aria-label="Kural verse"]').evaluate(
      (section) => {
        return [...section.querySelectorAll("button")].flatMap((button) => {
          const rect = button.getBoundingClientRect();
          const visible = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
          let parent: HTMLElement | null = button.parentElement;
          while (parent) {
            const style = getComputedStyle(parent);
            const clipsX = ["auto", "clip", "hidden", "scroll"].includes(style.overflowX);
            const clipsY = ["auto", "clip", "hidden", "scroll"].includes(style.overflowY);
            if (clipsX || clipsY) {
              const bounds = parent.getBoundingClientRect();
              if (clipsX) {
                visible.left = Math.max(visible.left, bounds.left);
                visible.right = Math.min(visible.right, bounds.right);
              }
              if (clipsY) {
                visible.top = Math.max(visible.top, bounds.top);
                visible.bottom = Math.min(visible.bottom, bounds.bottom);
              }
            }
            if (parent === section) break;
            parent = parent.parentElement;
          }
          const visibleWidth = Math.max(0, visible.right - visible.left);
          const visibleHeight = Math.max(0, visible.bottom - visible.top);
          if (visibleWidth >= rect.width - 1 && visibleHeight >= rect.height - 1) return [];
          return [{
            label: button.getAttribute("aria-label"),
            width: rect.width,
            height: rect.height,
            visibleWidth,
            visibleHeight,
          }];
        });
      },
    );
    expect(clippedReadingActions, JSON.stringify(clippedReadingActions, null, 2)).toEqual([]);

    await page.screenshot({
      path: `artifacts/screenshots/${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  });
}
