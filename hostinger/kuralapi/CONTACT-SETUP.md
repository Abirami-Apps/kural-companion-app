# Direct contact-form delivery

Prepared for the existing Hostinger PHP API, independently of the Vite web
hosting and the Razorpay/Supabase payment functions. The receiving mailbox
`support@abiramiaudio.com` is hosted by Hostinger and was confirmed accessible
by its owner. No mailbox password is stored in this repository.

## Delivery settings

The endpoint uses authenticated `smtp.hostinger.com`, port `465`, with implicit
TLS and certificate verification enabled. The SMTP username, From address and
only recipient are `support@abiramiaudio.com`. The visitor's validated email
is Reply-To, not From. Messages are plain text; there are no attachments or
automatic replies to visitors.

See [Hostinger's official SMTP settings](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/)
and [PHPMailer installation guidance](https://github.com/PHPMailer/PHPMailer).

## Deployment status — 7 October 2026

The owner approved deployment to both existing sites on account `u280745247`.
The PHP contact endpoint, locked mail library and routing protections are now
deployed at `api.abirami.app`. The original routing file is retained at
`.contact-backup-20261007/.htaccess`; existing API and database configuration
files were not replaced. PHP 8.2.33, mbstring and OpenSSL are available.
The existing API health check still succeeds. Contact preflight returns 204,
unsupported GET returns 405, and private helper/configuration files, the
library directory, backup and deployment archive return 403 over HTTP.

SMTP configuration and inbox delivery are **not** verified or activated.
The public contact endpoint build variable remains unset, preserving the
existing email-app draft flow and all existing payment settings.

## Activation checklist

1. Obtain explicit approval to update `api.abirami.app` and
   `kural.abirami.app` on Hostinger account `u280745247`. Back up the current
   files before updating. Do not replace the database or its existing config.
2. Install the locked PHP dependencies with Composer (`install --no-dev
   --no-scripts --no-plugins`). Deploy `contact.php`, `contact-core.php`, the
   generated `vendor` directory and the updated `.htaccess` into
   `/home/u280745247/domains/abirami.app/public_html/kuralapi`.
   PHP 8.1+, mbstring and OpenSSL are required. Do not publish the examples,
   tests or this setup document unnecessarily.
3. Privately create
   `/home/u280745247/domains/abirami.app/kural-contact.config.php`
   from `contact.config.example.php`, outside **every** public document root.
   Set file permissions to `600`. The owner enters the existing mailbox
   password directly in the server configuration, not in chat. Do not reset
   the mailbox password, which could interrupt other mail clients.
4. Keep `enabled=false` while preparing. Verify that the default private
   rate-limit directory is writable by PHP and that the server's
   `REMOTE_ADDR` identifies visitors correctly. Never trust arbitrary
   X-Forwarded-For headers. Reverse-proxy deployments need a separately
   verified trusted-proxy policy before adjusting IP handling.
5. Set `enabled=true` only when ready. With owner authorization, submit one
   clearly marked contact test, confirm it arrives in the support inbox and
   check Reply-To. Also verify blocked origins, validation and failure cases.
   SMTP acceptance alone does not prove inbox delivery.
6. Only after successful delivery, set the **public** build variable
   `VITE_CONTACT_ENDPOINT=https://api.abirami.app/contact.php` and rebuild
   the Hostinger web app. Never set `VITE_SMTP_PASSWORD` or put any mailbox
   credential in the Vite app. All existing payment settings remain unchanged.

Leave `VITE_CONTACT_ENDPOINT` empty to retain the current email-app draft
flow. To turn off direct submissions, set `enabled=false` privately and
remove the public endpoint variable/rebuild when convenient. Users retain
the direct email link even if the backend is unavailable.

## Abuse controls and limitations

- Only POST JSON from an explicitly allowed browser origin is accepted;
  CORS is not bot authentication.
- Server validation enforces topic choices, lengths, email syntax and safe
  header fields. Payload size is capped at 16 KiB. A honeypot rejects basic bots.
- Atomic private file storage allows 3 submissions per IP/hour, at most 30
  globally/hour and 100 globally/day. Attempts consume allowance before SMTP,
  including SMTP failures. Limits fail closed when storage is unavailable.
- Stored limit state contains salted IP hashes and timestamps only, with
  at most a day of activity retained when the next request prunes it.
- Distributed spam can exhaust the global cap. These limits and the honeypot
  are a baseline, not a CAPTCHA or a WAF. Monitor mailbox volume and add a
  verified bot challenge/WAF if needed; do not silently relax the limits.
- No SMTP diagnostics or visitor messages are exposed in errors or logs.
  A network timeout is an unconfirmed submission, not a definite failure.
  The browser keeps drafts and does not automatically retry, avoiding duplicates.

## Local checks

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and
`php scripts/test-contact.php` validate client behavior and server validation/
limits. These checks do not send real mail. Live SMTP authentication and inbox
delivery still need the private credential and activation checklist above.

Local preparation verification: 109 unit tests passed, PHP validation/rate-limit
checks passed, and eight HTTP checks confirmed CORS, method/content-type/payload
restrictions and a truthful 503 response when SMTP is disabled. PHPMailer
7.1.1 is locked in `composer.lock` and its SMTP classes load successfully.
