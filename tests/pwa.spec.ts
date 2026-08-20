import { expect, test } from "@playwright/test";
import { waitForKural } from "./helpers";

test("web app manifest exposes installable Kural Companion metadata", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/",
    short_name: "Kural Companion",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "ta",
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: "/pwa-192.png", sizes: "192x192" }),
    expect.objectContaining({ src: "/pwa-512.png", sizes: "512x512" }),
    expect.objectContaining({ src: "/pwa-maskable-512.png", purpose: "maskable" }),
  ]));
});

test("service worker includes the Hourly Kural notification click handler", async ({ request }) => {
  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBeTruthy();
  expect(await worker.text()).toContain("notification-sw.js");

  const notificationWorker = await request.get("/notification-sw.js");
  expect(notificationWorker.ok()).toBeTruthy();
  expect(await notificationWorker.text()).toContain("notificationclick");
});

test("installed app keeps all Kural text available offline", async ({ page, context }) => {
  await page.goto("/kural/1");
  await waitForKural(page, 1);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });

  const cachedUrls = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = await Promise.all(keys.map(async (key) => caches.open(key).then((cache) => cache.keys())));
    return requests.flat().map((request) => request.url);
  });
  expect(cachedUrls.some((url) => url.includes("sample-kurals"))).toBeTruthy();
  expect(cachedUrls.some((url) => /supabase|pay\.rev\.cat|\.mp3(?:\?|$)/.test(url))).toBeFalsy();

  await context.setOffline(true);
  await page.goto("/kural/1330", { waitUntil: "domcontentloaded" });
  await waitForKural(page, 1330);
  // Chromium's network emulation does not consistently emit the browser event
  // that real devices dispatch when their connection disappears.
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText(/Offline · All 1,330 Kural texts remain available/)).toBeVisible();
  await context.setOffline(false);
});
