import { expect, test } from "@playwright/test";
import { installMediaMock, waitForKural } from "./helpers";

test.beforeEach(async ({ page }) => {
  await installMediaMock(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("home, query and path routes resolve to the same player", async ({ page }) => {
  await page.goto("/");
  await waitForKural(page, 1);

  await page.goto("/?k=123");
  await waitForKural(page, 123);

  await page.goto("/kural/1330");
  await waitForKural(page, 1330);
  await expect(page).toHaveTitle(/Kural Companion/);
});

test("home restores the last Kural that successfully started playing", async ({ page }) => {
  await page.goto("/kural/321");
  await page.getByRole("button", { name: "Play audio" }).click();
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();

  await page.goto("/");
  await waitForKural(page, 321);
  await expect(page.getByRole("button", { name: "Play audio" })).toBeVisible();
});

test("play continues automatically to the next Kural by default", async ({ page }) => {
  await page.goto("/kural/141");
  await waitForKural(page, 141);

  await page.getByRole("button", { name: "Play audio" }).click();
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();
  await page.locator("audio").dispatchEvent("ended");

  await expect(page).toHaveURL(/\/kural\/142$/);
  await waitForKural(page, 142);
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();
});

test("loop one repeats the current Kural instead of advancing", async ({ page }) => {
  await page.goto("/kural/141");
  await waitForKural(page, 141);

  const loopOne = page.getByRole("button", { name: "Loop current kural" });
  await loopOne.click();
  await expect(loopOne).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Play audio" }).click();
  const audio = page.locator("audio");
  await audio.evaluate((element) => {
    element.currentTime = 37;
  });
  await audio.dispatchEvent("ended");

  await expect(page).toHaveURL(/\/kural\/141$/);
  await waitForKural(page, 141);
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBe(0);
});

test("sequential playback stops safely after Kural 1330", async ({ page }) => {
  await page.goto("/kural/1330");
  await waitForKural(page, 1330);

  await page.getByRole("button", { name: "Play audio" }).click();
  await page.locator("audio").dispatchEvent("ended");

  await expect(page).toHaveURL(/\/kural\/1330$/);
  await expect(page.getByRole("button", { name: "Play audio" })).toBeVisible();
});

test("keypad entry updates the URL and browser history remains authoritative", async ({ page }) => {
  await page.goto("/");
  for (const digit of ["1", "3", "3", "0"]) {
    await page.getByRole("button", { name: `Digit ${digit}` }).click();
  }
  await expect(page).toHaveURL(/\?k=1330$/);
  await waitForKural(page, 1330);

  await page.getByRole("button", { name: "Previous kural" }).click();
  await waitForKural(page, 1329);
  await page.goBack();
  await waitForKural(page, 1330);
  await page.goForward();
  await waitForKural(page, 1329);
});

test("compact layouts open an accessible keypad sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kural/141");
  await waitForKural(page, 141);

  const portraitMain = await page.locator("#main").evaluate((main) => ({
    clientHeight: main.clientHeight,
    scrollHeight: main.scrollHeight,
  }));
  expect(portraitMain.scrollHeight).toBeLessThanOrEqual(portraitMain.clientHeight + 1);

  const numberButton = page.getByRole("button", { name: "Choose a Kural number, currently 141" });
  const numberButtonBox = await numberButton.boundingBox();
  expect(numberButtonBox).not.toBeNull();
  expect(numberButtonBox!.y).toBeGreaterThanOrEqual(0);
  expect(numberButtonBox!.y + numberButtonBox!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "artifacts/screenshots/390x844-player.png" });

  await numberButton.click();
  const sheet = page.getByRole("dialog", { name: "Go to a Kural" });
  await expect(sheet).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/390x844-keypad.png" });

  await sheet.getByRole("button", { name: "Clear entry" }).click();
  for (const digit of ["1", "0", "0"]) {
    await sheet.getByRole("button", { name: `Digit ${digit}` }).click();
  }
  await sheet.getByRole("button", { name: "Go to entered kural" }).click();

  await expect(page).toHaveURL(/\/kural\/100$/);
  await waitForKural(page, 100);
  await expect(sheet).toBeHidden();
});

test("landscape player and keypad remain fully visible", async ({ page }) => {
  const viewport = { width: 844, height: 390 };
  await page.setViewportSize(viewport);
  await page.goto("/kural/141");
  await waitForKural(page, 141);

  const landscapeMain = await page.locator("#main").evaluate((main) => ({
    clientHeight: main.clientHeight,
    scrollHeight: main.scrollHeight,
  }));
  expect(landscapeMain.scrollHeight).toBeLessThanOrEqual(landscapeMain.clientHeight + 1);

  const reading = page.getByRole("region", { name: "Kural verse" });
  const controls = page.getByRole("region", { name: "Compact player controls" });
  const readingBox = await reading.boundingBox();
  const controlsBox = await controls.boundingBox();
  expect(readingBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(controlsBox!.x).toBeGreaterThan(readingBox!.x + readingBox!.width - 1);
  expect(Math.abs(controlsBox!.y - readingBox!.y)).toBeLessThanOrEqual(1);

  const numberButton = page.getByRole("button", { name: "Choose a Kural number, currently 141" });
  const numberButtonBox = await numberButton.boundingBox();
  expect(numberButtonBox).not.toBeNull();
  expect(numberButtonBox!.y + numberButtonBox!.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: "artifacts/screenshots/844x390-player.png" });
  await numberButton.click();

  const sheet = page.getByRole("dialog", { name: "Go to a Kural" });
  await expect(sheet).toBeVisible();
  const clippedControls = await sheet.locator("button").evaluateAll(
    (buttons, bounds) =>
      buttons.flatMap((button) => {
        const rect = button.getBoundingClientRect();
        if (
          rect.left >= -1 &&
          rect.top >= -1 &&
          rect.right <= bounds.width + 1 &&
          rect.bottom <= bounds.height + 1
        ) {
          return [];
        }
        return [{
          label: button.getAttribute("aria-label") || button.textContent?.trim(),
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        }];
      }),
    viewport,
  );
  expect(clippedControls, JSON.stringify(clippedControls, null, 2)).toEqual([]);
  await page.screenshot({ path: "artifacts/screenshots/844x390-keypad.png" });
});

test("invalid kural links recover safely", async ({ page }) => {
  await page.goto("/kural/1331");
  await expect(page.getByRole("heading", { name: "That kural does not exist" })).toBeVisible();
  await page.getByRole("link", { name: "Go to Kural 1" }).click();
  await expect(page).toHaveURL(/\/kural\/1$/);
  await waitForKural(page, 1);
});

test("favourites persist on this device", async ({ page }) => {
  await page.goto("/kural/17");
  await page.getByRole("button", { name: "Add kural 17 to favourites" }).click();
  await expect(page.getByRole("button", { name: "Remove kural 17 from favourites" })).toBeVisible();

  await page.goto("/favourites");
  const savedKural = page.locator('a[href="/kural/17"]');
  await expect(savedKural).toBeVisible();
  await page.reload();
  await expect(savedKural).toBeVisible();
  await savedKural.click();
  await waitForKural(page, 17);
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();
});

test("all three source section names filter chapters correctly", async ({ page }) => {
  await page.goto("/chapters");
  for (const section of ["அறத்துப்பால்", "பொருட்பால்", "காமத்துப்பால்"]) {
    await page.getByRole("button", { name: section }).click();
    await expect(page.getByRole("list").getByRole("listitem").first()).toBeVisible();
  }
  await page.getByRole("button", { name: "காமத்துப்பால்" }).click();
  await expect(page.getByRole("list").getByRole("listitem")).toHaveCount(25);
});

test("selecting a chapter starts its first Kural in the shared player", async ({ page }) => {
  await page.goto("/chapters");
  await page.getByRole("list").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/kural\/1$/);
  await waitForKural(page, 1);
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(1);
});

test("appearance preferences survive reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Appearance settings" }).click();
  await page.getByRole("radio", { name: "Sepia theme" }).click();
  await page.getByRole("button", { name: "Increase text size" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await expect(page.locator("html")).toHaveCSS("--font-scale", "1.15");
});

test("Hourly Kural premium preview saves its schedule", async ({ page }) => {
  await page.goto("/hourly");
  await expect(page.getByRole("heading", { name: "மணிக்குறள்" })).toBeVisible();
  await expect(page.getByText("Premium preview", { exact: true })).toBeVisible();

  await page.getByRole("switch", { name: "Enable Hourly Kural schedule" }).click();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText("Schedule active")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("switch", { name: "Enable Hourly Kural schedule" })).toBeChecked();
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
});

test("Hourly Kural hands playback to the existing main player", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kural:hourly-last-kural", "122");
    localStorage.setItem(
      "kural:hourly-settings",
      JSON.stringify({
        enabled: false,
        startHour: 7,
        endHour: 22,
        language: "en",
        selection: "sequential",
        includeMeaning: false,
      }),
    );
  });

  await page.goto("/hourly");
  await page.getByRole("button", { name: "Test now" }).click();

  await expect(page).toHaveURL(/\/kural\/123$/);
  await waitForKural(page, 123);
  await expect(
    page.getByLabel("Player controls", { exact: true }).getByText("Hourly Kural", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause audio" })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(1);
});

test("player shortcuts never hijack typing in the sign-in form", async ({ page }) => {
  await page.goto("/login");
  const email = page.getByLabel("Email address");
  await email.fill("reader@example.com");
  await email.press("ArrowDown");
  await email.press("1");
  await expect(email).toHaveValue("reader@example.com1");
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid email credentials show a safe error", async ({ page }) => {
  await page.route("https://test.supabase.co/auth/v1/token?grant_type=password", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email address").fill("reader@example.com");
  await page.getByLabel("Password").fill("incorrect-password");
  await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.");
  await expect(page).toHaveURL(/\/login$/);
});

test("connected auth and unfinished paid services are disclosed while all kurals remain free", async ({ page }) => {
  await page.goto("/kural/1330");
  await expect(page.getByRole("button", { name: "Play audio" })).toBeEnabled();

  await page.goto("/login");
  await expect(page.getByText(/Sign-in is unavailable in this build/)).toHaveCount(0);
  await expect(page.locator("form").getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();

  await page.goto("/subscribe");
  await expect(page.getByText(/All 1,330 kurals are free to play right now/)).toBeVisible();
  await expect(page.getByText(/plans are a preview until paid access is enabled/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Monthly/ })).toBeDisabled();
});

test("debug UI is hidden in production unless explicitly requested", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Toggle layout debug panel" })).toHaveCount(0);

  await page.goto("/?debug=1");
  await expect(page.getByRole("button", { name: "Toggle layout debug panel" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Layout diagnostics" })).toBeVisible();
});

test("core routes emit no uncaught runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  for (const route of ["/", "/kural/1330", "/favourites", "/chapters", "/hourly", "/login", "/reset-password", "/subscribe", "/terms", "/privacy", "/refunds", "/delivery", "/contact"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }

  expect(errors).toEqual([]);
});
