# Hostinger web deployment

The web app builds to static files with `npm run build`. It does not need an
OpenAI subscription, an OpenAI API key, or a Node.js server at runtime.
Do not use `build:sites` for Hostinger: that command packages an OpenAI Sites
Worker instead of the standalone web build.

## Current hosting target

- Domain: `https://kural.abirami.app`
- Existing Cloud Startup document root:
  `/home/u280745247/domains/abirami.app/public_html/kuralapp`
- Content API: `https://api.abirami.app` (keep its separate `kuralapi` root)
- Audio: `https://cdn.abiramiaudio.com`
- Accounts, account sync and entitlements: keep the existing Supabase project
- Billing: keep the existing Razorpay integration and Supabase Edge Functions

The existing `admin`, `api`, and `data` directories are legacy files. Preserve
them during uploads. `public/.htaccess` selects `index.html`, preserves the older
`api/v1/all` endpoint, serves real files/directories normally, and falls back to
the React app for routes such as `/contact`, `/login`, and `/subscribe`.

## Build configuration

Use the existing public Supabase URL and publishable key, plus:

```dotenv
VITE_AUTH_ENABLED=true
VITE_SUBSCRIPTIONS_ENABLED=true
VITE_CHECKOUT_ENABLED=true
VITE_SITE_URL=https://kural.abirami.app
VITE_KURAL_API_URL=https://api.abirami.app
VITE_NATIVE_BUILD=false
```

Razorpay secrets, Supabase service-role keys, database credentials and admin
tokens stay in their existing server-side configuration. Do not upload source
environment files with the static build.

## Existing-directory upload

1. Build with the production configuration above.
2. Keep a backup of the existing `.htaccess` before replacing it.
3. Upload only the contents of `dist/`, including the new `.htaccess`, into
   `kuralapp`. Leave the legacy directories intact.
4. Before changing DNS, verify Hostinger serves the production host with the
   Hostinger origin IP (for example with curl's `--resolve` option).
5. Replace only the `kural` OpenAI Sites CNAME with the Hostinger address supplied
   by the hosting dashboard. Keep the same public domain and Supabase project;
   existing accounts, premium records and webhook URLs remain in place.
6. Verify HTTPS, direct route loads, static assets, and API connections. No new
   purchase or refund is needed just to migrate the frontend.

## Future automatic deployment

The Cloud Startup plan currently blocks creation of new Web Apps because its
disk usage is above 98%. The existing-directory upload avoids creating another
website. When capacity is available, use Hostinger's GitHub-connected Web App
deployment with Node.js 22, build command `npm run build`, output directory
`dist`, and the same public build configuration.
