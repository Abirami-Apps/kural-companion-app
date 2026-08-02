# Kural Companion

Kural Companion is a responsive Thirukkural web player. Enter any number from
1–1330 to open its Tamil verse, meaning, and audio. Deep links, browser history,
favourites, chapter browsing, themes, text sizing, keyboard controls, and
accessibility preferences work without an account.

## Current release scope

- Production-ready responsive web SPA
- All 1,330 bundled Kurals and HTTPS audio links
- Device-local favourites, recent items, and appearance settings
- Hourly Kural scheduling with Tamil or English time announcements, configurable
  active hours, Kural selection, and an optional spoken Tamil meaning
- Authentication, subscriptions, checkout, offline listening, and native
  iOS/Android packages are not connected in this repository yet
- Paid gating is off, so every valid Kural is accessible

The sign-in and plan screens deliberately disclose those limitations and do not
submit credentials or allow plan selection in the default build.

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
VITE_SITE_URL=
```

Set `VITE_SITE_URL` to the final HTTPS origin before deployment so canonical
metadata is absolute. Do not enable auth, checkout, or subscriptions until the
corresponding backend, payment handling, session security, and end-to-end tests
have been implemented.

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
