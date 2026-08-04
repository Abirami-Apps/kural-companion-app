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
- Server-owned premium entitlement records and read-only account verification
- RevenueCat/Paddle sandbox checkout with signed, idempotent Supabase billing
  synchronization; live billing remains disabled until production onboarding
- Offline audio downloads and native iOS/Android packages are not connected yet
- Paid gating is off, so every valid Kural is accessible

The plan screen deliberately discloses those limitations and does not allow plan
selection in the default build. Sign-in becomes active only when the public
Supabase configuration and authentication feature flag are present. Paid gating
stays off until a trusted billing integration is maintaining entitlements.

## Subscription entitlement foundation

Phase 3A adds a provider-neutral `premium` entitlement for every account. The
record contains browser-safe status, plan, source, validity dates, and
cancellation state. Authenticated users may read only their own record; row-level
security and database grants prevent browser clients from creating, activating,
editing, or deleting entitlements.

The app obtains the display record and calls the server-side
`has_active_entitlement` predicate. Only `trialing`, `active`, and `grace_period`
records within their validity window grant access. Missing rows, expired dates,
unknown states, network failures, and delayed responses after an account switch
all fail closed. Authentication metadata and local storage never grant paid
access.

The entitlement source is deliberately independent of a payment provider so
future Stripe, App Store, Play Store, RevenueCat, promotional, or support-issued
access can resolve to the same rule. Provider customer identifiers, receipts,
webhook bodies, signing secrets, and service-role keys must remain in trusted
server infrastructure, never this browser-readable table or a `VITE_` variable.

Phase 3B preserves fail-closed defaults while adding the RevenueCat/Paddle
provider boundary. The safe release order is:

1. Deploy and verify the entitlement migration.
2. Configure and deploy the RevenueCat sync and webhook Edge Functions.
3. Verify purchase, renewal, cancellation, expiration, refund, and restore flows.
4. Enable `VITE_SUBSCRIPTIONS_ENABLED`, then enable checkout only on supported
   surfaces.

## RevenueCat and Paddle billing

Web customers choose a plan in the app and continue to a RevenueCat-hosted
purchase link backed by Paddle. The link is always bound to the signed-in
Supabase UUID and preselects the matching monthly, annual, or lifetime package.
External return paths, non-RevenueCat hosts, malformed user identifiers and
partially configured builds are rejected before checkout opens.

RevenueCat remains the cross-platform entitlement resolver. Paddle is the web
merchant of record; future iOS and Android releases will use their required
native stores while mapping purchases to the same `premium` entitlement.

The browser never writes access state. `revenuecat-sync` authenticates the
current Supabase session, looks up only that UUID in RevenueCat, and applies the
canonical result through a service-role-only database function.
`revenuecat-webhook` requires both the configured Authorization header and
RevenueCat's HMAC-SHA256 signature over the exact raw request body. It rejects
replays outside the timestamp tolerance, resolves aliases to an existing
Supabase account, fetches canonical Customer Info, and records only a SHA-256
digest plus minimal event metadata in a private idempotency ledger.

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

Pending favourites are stored as explicit add/remove operations, and preference
updates contain only the fields the user changed. Reconnecting therefore merges
unrelated edits from multiple devices instead of replacing an entire stale
record or favourite list. If two devices change the same scalar setting, the
last successful write wins. The app refreshes clean account data on focus and
rejects late responses after an account switch.

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
VITE_REVENUECAT_PURCHASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_URL=
```

Set `VITE_SITE_URL` to the final HTTPS origin before deployment so canonical
metadata is absolute. To enable email accounts, set `VITE_AUTH_ENABLED=true`
and provide the Supabase project URL and publishable key. Never use a Supabase
secret or service-role key in a `VITE_` variable.

`VITE_REVENUECAT_PURCHASE_URL` is the public Web Purchase Link base URL, such as
`https://pay.rev.cat/generatedToken`. Do not include a user ID, query string or
additional path. Checkout remains disabled unless the link passes that strict
validation in addition to all three feature flags.

Edge Function billing values are server secrets and must never use a `VITE_`
prefix. Copy `supabase/.env.billing.example` to the ignored
`supabase/.env.billing`, fill the provider values locally, and upload them:

```sh
npx supabase secrets set --env-file supabase/.env.billing
npx supabase functions deploy revenuecat-sync
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```

Use `SANDBOX` while testing and change the allowed environment and product IDs
when moving to Paddle production. Keep checkout and paid gating disabled until
the deployed functions, authorization header, HMAC secret, and complete
lifecycle have been verified.

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
