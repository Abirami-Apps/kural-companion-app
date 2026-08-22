# Kural API for Hostinger

This folder is the PHP 8/PDO API for `api.abirami.app`.

1. Upload the contents of this folder to the subdomain document root.
2. Copy `config.example.php` to `config.php` on the server only.
3. Fill in the Hostinger MySQL database name, username and password in `config.php`.
4. Set a long random `admin_token`; do not commit or share it.
5. Back up the existing database before importing the supplied
   `kural_website_clean_final.sql` file.
6. Import that SQL file in phpMyAdmin. It creates the `kural_website` table
   with all 1,330 records and the additional commentary fields.
7. Import `revisions.sql` to enable the protected correction endpoint's audit
   history.

Test these URLs after upload:

```text
https://api.abirami.app/health
https://api.abirami.app/kurals/1
```

The API maps `TamilPiriyan_urai` to the app's `meaning` field and keeps the
additional translations/commentaries available for future UI work. The React
app should continue using its bundled JSON as an offline fallback until the API
has been tested on web, iOS and Android.
