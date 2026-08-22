<?php

declare(strict_types=1);

/*
 * Copy this file to config.php on Hostinger and replace the placeholders.
 * Never commit config.php and never put these values in VITE_* variables.
 */

return [
    'db' => [
        'host' => 'localhost',
        'name' => 'REPLACE_DATABASE_NAME',
        'user' => 'REPLACE_DATABASE_USER',
        'password' => 'REPLACE_DATABASE_PASSWORD',
        'charset' => 'utf8mb4',
    ],
    'admin_token' => 'REPLACE_WITH_A_LONG_RANDOM_ADMIN_TOKEN',
    'cors_origins' => [
        'https://kural.abirami.app',
        'https://api.abirami.app',
        'https://localhost',
        'capacitor://localhost',
        'http://localhost:5173',
    ],
];
