<?php
declare(strict_types=1);

// Copy to /home/ACCOUNT/domains/abirami.app/kural-contact.config.php, NOT public_html.
// Enter the existing mailbox password privately on the server. Never commit it.
return [
    'enabled' => false,
    'smtp_password' => '',
    'allowed_origins' => ['https://kural.abirami.app'],
    // Persistent, private storage for sending limits; not a website directory.
    'rate_limit_directory' => __DIR__ . '/.kural-contact-rate-limits',
];
