import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installMediaMock } from "./helpers";

const routes = ["/", "/favourites", "/chapters", "/hourly", "/login", "/subscribe", "/kural/1331"];

test.beforeEach(async ({ page }) => {
  await installMediaMock(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const route of routes) {
  test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).analyze();
    const blocking = result.violations.filter(({ impact }) =>
      impact === "serious" || impact === "critical",
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
