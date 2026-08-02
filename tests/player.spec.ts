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
  await page.goto("/kural/1");
  await waitForKural(page, 1);

  await page.getByRole("button", { name: "Choose a Kural number, currently 1" }).click();
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
  await expect(page.locator('a[href="/kural/17"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('a[href="/kural/17"]')).toBeVisible();
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

test("player shortcuts never hijack typing in the sign-in form", async ({ page }) => {
  await page.goto("/login");
  const email = page.getByLabel("Email address");
  await email.fill("reader@example.com");
  await email.press("ArrowDown");
  await email.press("1");
  await expect(email).toHaveValue("reader@example.com1");
  await expect(page).toHaveURL(/\/login$/);
});

test("unfinished services are disclosed and all kurals remain free", async ({ page }) => {
  await page.goto("/kural/1330");
  await expect(page.getByRole("button", { name: "Play audio" })).toBeEnabled();

  await page.goto("/login");
  await expect(page.getByText("Sign-in is not connected yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();

  await page.goto("/subscribe");
  await expect(page.getByText(/All 1,330 kurals are free to play right now/)).toBeVisible();
  await expect(page.getByText(/Checkout is not connected/)).toBeVisible();
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

  for (const route of ["/", "/kural/1330", "/favourites", "/chapters", "/hourly", "/login", "/subscribe"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }

  expect(errors).toEqual([]);
});
