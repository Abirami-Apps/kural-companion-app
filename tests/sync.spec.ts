import { expect, test, type Page, type Route } from "@playwright/test";
import { installMediaMock } from "./helpers";

const USERS = {
  "alpha@example.com": "11111111-1111-4111-8111-111111111111",
  "beta@example.com": "22222222-2222-4222-8222-222222222222",
} as const;

type TestEmail = keyof typeof USERS;

interface SyncServer {
  online: boolean;
  delayAlphaReads: boolean;
  favourites: Record<string, number[]>;
}

const timestamp = "2026-08-03T00:00:00.000Z";

const userForToken = (authorization: string | undefined) => {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const email = token.replace(/^token-/, "") as TestEmail;
  return USERS[email] ? { email, id: USERS[email] } : null;
};

const authUser = (email: TestEmail) => ({
  id: USERS[email],
  aud: "authenticated",
  role: "authenticated",
  email,
  email_confirmed_at: timestamp,
  phone: "",
  confirmed_at: timestamp,
  last_sign_in_at: timestamp,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: timestamp,
  updated_at: timestamp,
  is_anonymous: false,
});

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installSyncServer(page: Page): Promise<SyncServer> {
  const server: SyncServer = {
    online: true,
    delayAlphaReads: false,
    favourites: {
      [USERS["alpha@example.com"]]: [770],
      [USERS["beta@example.com"]]: [222],
    },
  };

  await page.route("https://test.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/auth/v1/token") {
      const credentials = request.postDataJSON() as { email: TestEmail };
      const email = credentials.email;
      await json(route, {
        access_token: `token-${email}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `refresh-${email}`,
        user: authUser(email),
      });
      return;
    }

    if (url.pathname === "/auth/v1/logout") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (url.pathname === "/auth/v1/user") {
      const current = userForToken(request.headers().authorization);
      if (!current) {
        await json(route, { message: "missing session" }, 401);
      } else {
        await json(route, authUser(current.email));
      }
      return;
    }

    if (!url.pathname.startsWith("/rest/v1/")) {
      await json(route, {});
      return;
    }

    if (!server.online) {
      await route.abort("internetdisconnected");
      return;
    }

    const current = userForToken(request.headers().authorization);
    if (!current) {
      await json(route, { message: "missing session" }, 401);
      return;
    }
    const isRead = request.method() === "GET";
    if (server.delayAlphaReads && current.id === USERS["alpha@example.com"] && isRead) {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
    }

    if (url.pathname === "/rest/v1/favourites") {
      if (request.method() === "GET") {
        await json(
          route,
          (server.favourites[current.id] ?? []).map((kuralNumber) => ({
            kural_number: kuralNumber,
          })),
        );
        return;
      }
      if (request.method() === "POST") {
        const rows = request.postDataJSON() as { kural_number: number }[];
        const existing = new Set(server.favourites[current.id] ?? []);
        rows.forEach((row) => existing.add(row.kural_number));
        server.favourites[current.id] = [...existing];
        await route.fulfill({ status: 201, body: "" });
        return;
      }
      if (request.method() === "DELETE") {
        const filter = url.searchParams.get("kural_number") ?? "";
        const removals = new Set(
          [...filter.matchAll(/\d+/g)].map((match) => Number(match[0])),
        );
        server.favourites[current.id] = (server.favourites[current.id] ?? []).filter(
          (number) => !removals.has(number),
        );
        await route.fulfill({ status: 204, body: "" });
        return;
      }
    }

    if (url.pathname === "/rest/v1/user_preferences") {
      if (request.method() === "GET") {
        await json(route, {
          theme: current.email === "beta@example.com" ? "sepia" : "classic",
          font_step: 1,
          high_contrast: false,
          reduced_motion: false,
          updated_at: timestamp,
        });
      } else {
        await route.fulfill({ status: 204, body: "" });
      }
      return;
    }

    if (url.pathname === "/rest/v1/hourly_kural_settings") {
      if (request.method() === "GET") {
        await json(route, {
          enabled: false,
          start_hour: 7,
          end_hour: 22,
          language: "ta",
          selection_mode: "random",
          include_meaning: false,
          time_zone: "Asia/Kolkata",
          last_kural_number: null,
          updated_at: timestamp,
        });
      } else {
        await route.fulfill({ status: 204, body: "" });
      }
      return;
    }

    if (url.pathname === "/rest/v1/profiles") {
      await json(route, { created_at: timestamp });
      return;
    }

    await json(route, []);
  });

  return server;
}

async function signIn(page: Page, email: TestEmail) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("correct-password");
  await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.beforeEach(async ({ page }) => {
  await installMediaMock(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("offline favourite changes merge with another device and retry safely", async ({ page }) => {
  const server = await installSyncServer(page);
  await signIn(page, "alpha@example.com");
  await page.getByRole("link", { name: "Favourites", exact: true }).first().click();
  await expect(page.locator('a[href="/kural/770"]')).toBeVisible();
  await expect(page.getByText("Synced securely to your account.")).toBeVisible();

  server.online = false;
  await page.goto("/kural/969");
  await page.getByRole("button", { name: "Add kural 969 to favourites" }).click();
  await page.getByRole("link", { name: "Favourites", exact: true }).first().click();
  await expect(page.locator('a[href="/kural/969"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry cloud sync" })).toBeVisible();

  server.favourites[USERS["alpha@example.com"]].push(555);
  server.online = true;
  await page.getByRole("button", { name: "Retry cloud sync" }).click();

  await expect(page.getByText("Synced securely to your account.")).toBeVisible();
  await expect(page.locator('a[href="/kural/770"]')).toBeVisible();
  await expect(page.locator('a[href="/kural/969"]')).toBeVisible();
  await expect(page.locator('a[href="/kural/555"]')).toBeVisible();
  expect(server.favourites[USERS["alpha@example.com"]]).toEqual(
    expect.arrayContaining([555, 770, 969]),
  );
});

test("a legacy dirty cache cannot delete a newer cloud favourite", async ({ page }) => {
  await installSyncServer(page);
  await page.addInitScript((userId) => {
    localStorage.setItem(
      `kural:account-data:v1:${userId}`,
      JSON.stringify({
        version: 1,
        snapshot: {
          favourites: [969],
          appearance: {
            theme: "classic",
            fontStep: 1,
            highContrast: false,
            reducedMotion: false,
          },
          hourlySettings: {
            enabled: false,
            startHour: 7,
            endHour: 22,
            language: "ta",
            selection: "random",
            includeMeaning: false,
          },
          lastHourlyKural: null,
          timeZone: "Asia/Kolkata",
        },
        dirty: { favourites: true, appearance: false, hourly: false },
      }),
    );
  }, USERS["alpha@example.com"]);

  await signIn(page, "alpha@example.com");
  await page.goto("/favourites");
  await expect(page.getByText("Synced securely to your account.")).toBeVisible();
  await expect(page.locator('a[href="/kural/770"]')).toBeVisible();
  await expect(page.locator('a[href="/kural/969"]')).toBeVisible();
});

test("a delayed account A refresh cannot replace account B data", async ({ page }) => {
  const server = await installSyncServer(page);
  await signIn(page, "alpha@example.com");
  await page.goto("/favourites");
  await expect(page.locator('a[href="/kural/770"]')).toBeVisible();

  server.delayAlphaReads = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email address").fill("beta@example.com");
  await page.getByLabel("Password").fill("correct-password");
  await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
  await page.goto("/favourites");

  await expect(page.locator('a[href="/kural/222"]')).toBeVisible();
  await expect(page.locator('a[href="/kural/770"]')).toHaveCount(0);
  await page.waitForTimeout(1_400);
  await expect(page.locator('a[href="/kural/222"]')).toBeVisible();
  await expect(page.locator('a[href="/kural/770"]')).toHaveCount(0);
});
