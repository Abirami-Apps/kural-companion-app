# Kural API for Hostinger

This folder is the PHP 8/PDO API for `api.abirami.app`.

1. Upload the contents of this folder to the subdomain document root.
2. Copy `config.example.php` to `config.php` on the server only.
3. Fill in the Hostinger MySQL database name, username and password in `config.php`.
4. Set a long random `admin_token`; do not commit or share it.
5. Back up the existing database before importing the final SQL file.
6. Generate the project-ready file locally with:
   `npm run db:build:hostinger -- /Users/sathishguptha/Downloads/kural_website_clean_final.sql /private/tmp/kural-companion-hostinger.sql`
7. Import `/private/tmp/kural-companion-hostinger.sql` in phpMyAdmin. It
   resets `kural_website`, imports all 1,330 records and creates
   `kural_revisions` for correction history.

Test these URLs after upload:

```text
https://api.abirami.app/health
https://api.abirami.app/kurals/1
```

## Admin editor, export and import

Open `https://api.abirami.app/admin.html`, paste the configured admin token,
and connect. The page can search and edit individual records, export every
database column as JSON or CSV, and import either format. The token is kept in
`sessionStorage` only; it is never part of the application bundle.

The protected endpoints are:

```text
GET  /admin/kurals?q=...&limit=50&offset=0   browse/search rows
PUT  /admin/kurals/{number}                  edit one row
GET  /admin/export?format=json              full JSON export
GET  /admin/export?format=csv               full CSV export
POST /admin/import?mode=upsert              safe partial/full import
POST /admin/import?mode=replace             deliberate 1-1330 replacement
```

Send the token as `X-Admin-Token`. Imports are transactional: if one row
fails validation, no rows are committed. Every update creates a snapshot in
`kural_revisions`. Keep `replace` mode for a complete export that contains
exactly one row for every number from 1 through 1330; use the default `upsert`
mode for corrections or partial files.

The API maps `TamilPiriyan_urai` to the app's `meaning` field and keeps the
additional translations/commentaries available for future UI work. The React
app now requests this API for the current Kural, Chapters, Favourites and
Hourly preview, while retaining the bundled JSON as an offline fallback.

The browser-side API origin is configured with `VITE_KURAL_API_URL` (the
default is `https://api.abirami.app`). This is a public read-only URL; never
place database credentials or the admin token in a `VITE_*` variable.
