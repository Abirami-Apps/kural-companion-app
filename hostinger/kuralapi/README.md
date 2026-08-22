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

The API maps `TamilPiriyan_urai` to the app's `meaning` field and keeps the
additional translations/commentaries available for future UI work. The React
app now requests this API for the current Kural, Chapters, Favourites and
Hourly preview, while retaining the bundled JSON as an offline fallback.

The browser-side API origin is configured with `VITE_KURAL_API_URL` (the
default is `https://api.abirami.app`). This is a public read-only URL; never
place database credentials or the admin token in a `VITE_*` variable.
