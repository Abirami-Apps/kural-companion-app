# Kural Companion

Kural Companion is a responsive Thirukkural web player. Enter any number from
1–1330 to open its Tamil verse, meaning, and audio. Deep links, browser history,
favourites, chapter browsing, themes, text sizing, keyboard controls, and
accessibility preferences work without an account.

## Current release scope

- Production-ready responsive web SPA
- All 1,330 bundled Kurals and HTTPS audio links
- Device-local guest data plus account-isolated cloud sync for favourites,
  appearance preferences, and Hourly Kural settings
- Hourly Kural scheduling with Tamil or English time announcements, configurable
  active hours, Kural selection, and an optional spoken Tamil meaning
- Supabase email authentication, confirmation, password recovery, and secure
  row-level access to each user's synchronized data
- Subscriptions, checkout, offline audio downloads, and native iOS/Android
  packages are not connected yet
- Paid gating is off, so every valid Kural is accessible

The plan screen deliberately discloses those limitations and does not allow plan
selection in the default build. Sign-in becomes active only when the public
Supabase configuration and authentication feature flag are present.

## Account data sync

Signed-in accounts synchronize favourites, theme, text size, contrast, reduced
motion, and Hourly Kural configuration through the tables in the versioned
Supabase migration. Guest data remains available without an account. On the
first successful sign-in, existing guest choices are imported only when they do
not overwrite established cloud preferences, then the shared guest keys are
cleared so one account's data cannot appear in another account.

Each account also has an isolated local cache. Changes made while offline are
marked as pending and retried after connectivity returns; the Favourites and
Account screens disclose the current sync state and provide a manual retry.
Recent-player history and the current hourly run marker remain device-only.

## Hourly Kural

Open `/hourly` to configure the premium Hourly Kural experience. Until paid
subscriptions are connected, this feature is available as a clearly labelled
premium preview. When subscription gating is enabled, access automatically
requires an active entitlement.

Web browsers allow scheduled voice and audio while the app remains active. When
the hour arrives, the selected verse opens and plays through the same main Kural
player, keeping its URL, verse, controls, favourites, and sharing state aligned.
When the page is in the background, the app uses an approved browser notification
as the reminder instead of promising unattended playback. Reliable hourly
playback with the app fully closed belongs in the future native iOS and Android
packages.

## Local development

Requirements: Node.js 20.19 or newer and npm.

```sh
git clone https://github.com/Abirami-Apps/kural-companion-app.git
cd kural-companion-app
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:8080`.

## Configuration

The safe defaults in `.env.example` keep unfinished services disabled:

```dotenv
VITE_SUBSCRIPTIONS_ENABLED=false
VITE_AUTH_ENABLED=false
VITE_CHECKOUT_ENABLED=false
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_URL=
```

Set `VITE_SITE_URL` to the final HTTPS origin before deployment so canonical
metadata is absolute. To enable email accounts, set `VITE_AUTH_ENABLED=true`
and provide the Supabase project URL and publishable key. Never use a Supabase
secret or service-role key in a `VITE_` variable. Checkout and subscriptions
must remain disabled until payment handling and verified server-side
entitlements are implemented.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`npm run check` runs the complete sequence. Playwright covers player routing,
history, persistence, feature disclosures, runtime errors, serious/critical axe
violations, touch-target sizing, text fitting, overflow, and screenshots at 11
phone, tablet, landscape, and desktop viewport sizes.

GitHub Actions runs the same release checks on pushes and pull requests.

### Database development

Supabase schema changes are versioned in `supabase/migrations` and tested with
pgTAP. Docker must be running before using the local database commands:

```sh
npm run db:start
npm run db:reset
npm run db:lint
npm run test:db
npm run db:stop
```

Deploy migrations through `supabase db push` after linking the intended project;
do not make parallel schema changes directly in the hosted SQL editor because
that bypasses migration history.

## Data integrity

`src/data/kurals.json` remains an untouched legacy source export. The adapter
repairs two known chapter-heading offsets and canonical section boundaries at
runtime without changing verse text, meanings, or audio URLs. Unit validation
checks sequential numbering, 133 chapters, the 380/700/250 section split, two
non-empty verse lines, HTTPS audio, and reports whitespace-token anomalies
without rewriting Tamil text.

## Deployment requirements

- Serve `dist/` over HTTPS after `npm run build`.
- Configure the host to rewrite unknown routes such as `/kural/123` to
  `index.html` for client-side routing.
- Set `VITE_SITE_URL` during the production build.
- Allow `https://kural.abirami.app/**` and the required local origin in Supabase
  Auth redirect URLs before sending confirmation or password-reset emails.
- Keep the current Content Security Policy and analytics decisions with the
  deployment configuration; neither is silently injected by the app.

## Security note

The current npm audit reports React Router advisory `GHSA-qwww-vcr4-c8h2` for
React Server Components mode. This app is a client-only Vite SPA and does not
use React Server Components or server actions. React Router is pinned to the
latest available release and should be upgraded when an upstream patched
version is published.

## Lovable workflow

This project originated in [Lovable](https://lovable.dev). Changes pushed to the
GitHub repository can be synced back into the
[Lovable project](https://lovable.dev/projects/f47349fe-798a-4606-ac44-8cfe9b0617e9).
