# Kural Companion

Kural Companion is a responsive Tirukkural player. Enter a number from 1–1330
to open its Tamil verse, meaning and audio. Deep links, browser history,
favourites, chapter browsing, themes, text sizing, keyboard controls and
accessibility preferences work without an account.

## Current release scope

- Responsive web app and installable Progressive Web App
- All 1,330 bundled Kurals and HTTPS audio links
- Offline app shell and Kural text after the first successful online load
- Device-local guest data plus account-isolated Supabase synchronization
- Email sign-in, confirmation and password recovery
- Hourly Kural scheduling with Tamil or English time announcements
- One-Kural repeat and sequential playback
- Server-owned premium entitlements that browser clients may only read
- Razorpay web billing foundation with server-created orders/subscriptions,
  server-side payment verification, signed webhooks and idempotency
- Capacitor iOS and Android foundations using the same player interface

Paid gating and checkout are disabled in the default build. Keep them disabled
until the test-mode checklist below passes completely. Native store billing,
offline audio downloads and reliable background hourly scheduling are later
release phases.

## Security model

The provider-neutral `premium` entitlement contains only browser-safe status,
plan, source, dates and cancellation state. Authenticated users can select only
their own row. Row-level security and grants prevent browser clients from
creating, activating, changing or deleting access.

The app also calls the server-side `has_active_entitlement` predicate. Only
`trialing`, `active` and `grace_period` records inside their validity window
grant premium access. Missing rows, unknown states, expired dates and network
failures all fail closed. Authentication metadata and local storage never grant
paid access.

Payment credentials, provider IDs, payment IDs and webhook delivery data remain
in Edge Function secrets or the private `kural_private` schema. They are never
stored in a `VITE_` variable or exposed through the browser Data API.

## Razorpay web billing

Monthly and yearly purchases use Razorpay Subscriptions. Lifetime access uses a
Razorpay Order. Prices and provider plan IDs are selected by the server; the
browser sends only `monthly`, `yearly` or `lifetime`.

The secure flow is:

1. `razorpay-checkout` authenticates the Supabase session, rate-limits recent
   attempts, creates a private checkout record, then creates the matching
   Razorpay order or subscription.
2. The browser opens Razorpay Standard Checkout using only the public key ID and
   the server-created provider ID.
3. `razorpay-verify` validates Razorpay's HMAC signature and fetches the payment
   plus order/subscription from Razorpay before granting access.
4. `razorpay-webhook` validates the signature over the exact raw body, uses
   `X-Razorpay-Event-Id` for idempotency, and matches only provider IDs previously
   created by the server.
5. The database reconciles all valid sessions for the account. A stale,
   duplicate, cancellation or refund event for one purchase cannot revoke a
   different valid purchase.
6. `razorpay-cancel` schedules the end of a recurring plan at the current cycle
   boundary. Lifetime access has no renewal to cancel.

The webhook handles order payment, full refund, and subscription lifecycle
events. Partial refunds do not automatically revoke the complete entitlement;
support must decide and process them deliberately.

## Account data sync

Signed-in accounts synchronize favourites, theme, text size, contrast, reduced
motion and Hourly Kural configuration. Guest data remains available without an
account. On first sign-in, guest choices are imported only when they do not
overwrite established cloud preferences, then shared guest keys are cleared.

Each account also has an isolated local cache. Offline writes are marked pending
and retried after connectivity returns. Recent-player history remains
device-only.

## Hourly Kural

Open `/hourly` to configure time announcements and playback. The scheduled verse
uses the same main player, URL, favourites and sharing state. Web browsers can
play on schedule only while browser and operating-system restrictions allow it;
reliable closed-app background scheduling belongs in a later native release.

## Native iOS and Android foundation

Capacitor projects live in `ios/` and `android/`. The application identifier is
`com.abiramiaudio.kuralcompanion`; confirm it before permanently creating App
Store Connect and Google Play records.

```sh
npm run native:sync
npm run native:open:ios
npm run native:open:android
npm run native:build:android
```

Native builds force web checkout and subscription gating off. Apple and Google
in-app purchase implementations will map their verified purchases into the same
provider-neutral premium entitlement in a later phase.

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

## Browser configuration

Safe defaults:

```dotenv
VITE_SUBSCRIPTIONS_ENABLED=false
VITE_AUTH_ENABLED=false
VITE_CHECKOUT_ENABLED=false
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_URL=
```

Set `VITE_SITE_URL` to the final HTTPS origin. To enable accounts, set
`VITE_AUTH_ENABLED=true` and provide only the Supabase project URL and
publishable key. Never place Razorpay secrets or a Supabase service-role key in
a `VITE_` variable.

## Razorpay test-mode preparation

1. In Razorpay Test Mode, create one monthly subscription Plan for INR 99 and
   one yearly Plan for INR 999. Lifetime uses a server-created INR 3,499 order
   and does not need a Plan.
2. Generate a Test Mode API key.
3. Create a strong, independent webhook secret.
4. Copy `supabase/.env.billing.example` to the ignored
   `supabase/.env.billing` and fill:

```dotenv
APP_ALLOWED_ORIGINS=https://kural.abirami.app,http://localhost:8080,http://127.0.0.1:8080
RAZORPAY_ENVIRONMENT=TEST
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_MONTHLY_PLAN_ID=plan_...
RAZORPAY_YEARLY_PLAN_ID=plan_...
```

5. Link the intended Supabase project, deploy the migration and upload secrets:

```sh
npx supabase db push
npx supabase secrets set --env-file supabase/.env.billing
npx supabase functions deploy razorpay-checkout --no-verify-jwt
npx supabase functions deploy razorpay-verify --no-verify-jwt
npx supabase functions deploy razorpay-webhook --no-verify-jwt
npx supabase functions deploy razorpay-cancel --no-verify-jwt
```

The `--no-verify-jwt` setting delegates JWT verification to the functions so
they work with Supabase publishable-key sessions. Checkout, verification and
cancellation still authenticate the bearer token explicitly. The webhook uses
its raw-body HMAC instead of a user JWT.

6. Configure the Razorpay webhook URL:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook
```

Select order paid, payment refunded, and all subscription lifecycle events.
Use exactly the same webhook secret stored in Supabase.

7. Build a private test release with authentication, subscriptions and checkout
   enabled. Test monthly, yearly, lifetime, failed/dismissed payment, renewal,
   scheduled cancellation, expiry, duplicate webhook delivery, full refund,
   account switching and signed-out access.
8. Only after all tests pass, submit `https://kural.abirami.app` for Razorpay
   website verification with a dedicated reviewer account. The homepage links
   to Terms, Privacy, Refund & Cancellation, Digital Delivery and Contact pages.

## Live cutover

Do not reuse test keys, test plan IDs or the test webhook secret. After Razorpay
approves the website:

1. Create matching live monthly and yearly Plans.
2. Generate live API keys and a new live webhook secret.
3. Fill `supabase/.env.billing.live` from the live example.
4. Upload live secrets and verify the live webhook.
5. Deactivate all test entitlements before enabling the public live checkout.
6. Make one controlled real purchase and test cancellation/refund reconciliation.
7. Enable `VITE_SUBSCRIPTIONS_ENABLED=true` and
   `VITE_CHECKOUT_ENABLED=true` only in the verified web release.

## Legal and support pages

Public routes required for website review:

- `/terms` — Terms and Conditions
- `/privacy` — Privacy Policy
- `/refunds` — Refund & Cancellation Policy
- `/delivery` — Digital Delivery Policy
- `/contact` — support@abiramiaudio.com

No physical products are sold or shipped.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`npm run check` runs the complete web sequence. Playwright covers player
routing, persistence, feature disclosures, runtime errors, axe violations,
touch targets, overflow and responsive screenshots.

### Database development

Docker must be running for local pgTAP verification:

```sh
npm run db:start
npm run db:reset
npm run db:lint
npm run test:db
npm run db:stop
```

Deploy schema changes only through versioned migrations. Do not reproduce them
manually in the hosted SQL editor.

## Deployment requirements

- Serve `dist/` over HTTPS.
- Use `npm run build:sites` for OpenAI Sites hosting.
- Set `VITE_SITE_URL=https://kural.abirami.app` during the release build.
- Keep checkout disabled in public builds until Razorpay approves the website
  and the complete test-mode checklist passes.
- Keep the hosted app public for payment-provider review; users must not need a
  ChatGPT account to reach the product or legal pages.
- Allow the production and local origins in Supabase Auth redirect URLs.

## Data integrity

`src/data/kurals.json` remains an untouched legacy source export. The adapter
repairs two known chapter-heading offsets and canonical section boundaries at
runtime without changing verse text, meanings or audio URLs. Unit validation
checks numbering, chapter/section counts, verse lines and HTTPS audio.
