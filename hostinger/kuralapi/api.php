<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'API is not configured.']);
    exit;
}

$config = require $configPath;
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = $config['cors_origins'] ?? [];

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status): never
{
    respond(['error' => $message], $status);
}

function db(array $config): PDO
{
    $database = $config['db'] ?? [];
    $host = (string) ($database['host'] ?? 'localhost');
    $name = (string) ($database['name'] ?? '');
    $charset = (string) ($database['charset'] ?? 'utf8mb4');
    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

    try {
        return new PDO($dsn, (string) ($database['user'] ?? ''), (string) ($database['password'] ?? ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable) {
        fail('Database unavailable.', 503);
    }
}

function kuralPayload(array $row): array
{
    return [
        'number' => (int) $row['kuralno'],
        'tamil' => $row['kural'],
        'meaning' => $row['TamilPiriyan_urai'] ?: ($row['general_urai'] ?? null),
        'generalMeaning' => $row['general_urai'] ?? null,
        'englishCouplet' => $row['English_couplet'] ?? null,
        'transliteration' => $row['transliteration'] ?? null,
        'chapter' => $row['athigaram'] ?: ($row['adikaram'] ?: ($row['chapter'] ?? null)),
        'chapterNumber' => (int) $row['adikaramno'],
        'section' => $row['pirivu'] ?: ($row['paal'] ?: ($row['chapter'] ?? null)),
        'paal' => $row['paal'] ?? null,
        'iyal' => $row['iyal'] ?? null,
        'chapterTitle' => $row['athigaram'] ?: ($row['adikaram'] ?? null),
        'chapterLabel' => $row['section'] ?? null,
        'line1' => $row['line1'] ?? null,
        'line2' => $row['line2'] ?? null,
        'audioUrl' => $row['audio_url'] ?: ($row['legacy_audio_url'] ?? null),
        'legacyAudioUrl' => $row['legacy_audio_url'] ?? null,
        'updatedAt' => null,
    ];
}

function requestSegments(): array
{
    $path = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
    $segments = array_values(array_filter(explode('/', $path), static fn ($part) => $part !== ''));
    if (($segments[0] ?? '') === 'api.php') {
        array_shift($segments);
    }
    return $segments;
}

function requireAdmin(array $config): void
{
    $expected = (string) ($config['admin_token'] ?? '');
    $provided = (string) ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
    if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
        fail('Unauthorized.', 401);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$segments = requestSegments();

if ($method === 'GET' && ($segments[0] ?? '') === 'health') {
    respond(['ok' => true, 'service' => 'kural-api']);
}

$pdo = db($config);
$singleSelect = 'kuralno, kural, TamilPiriyan_urai, general_urai, English_couplet, transliteration, adikaramno, adikaram, chapter, section, pirivu, paal, iyal, athigaram, line1, line2, audio_url, legacy_audio_url';
$listSelect = 'kuralno, kural, TamilPiriyan_urai, general_urai, English_couplet, transliteration, adikaramno, adikaram, chapter, section, pirivu, paal, iyal, athigaram, line1, line2, audio_url, legacy_audio_url';

if ($method === 'GET' && ($segments[0] ?? '') === 'kurals') {
    if (isset($segments[1])) {
        $number = filter_var($segments[1], FILTER_VALIDATE_INT);
        if ($number === false || $number < 1 || $number > 1330) {
            fail('Kural number must be between 1 and 1330.', 422);
        }

        $statement = $pdo->prepare("SELECT {$singleSelect} FROM kural_website WHERE kuralno = ? LIMIT 1");
        $statement->execute([$number]);
        $row = $statement->fetch();
        if (!$row) {
            fail('Kural not found.', 404);
        }
        respond(['data' => kuralPayload($row)]);
    }

    $section = trim((string) ($_GET['section'] ?? ''));
    $limit = min(max((int) ($_GET['limit'] ?? 1330), 1), 1330);
    $offset = max((int) ($_GET['offset'] ?? 0), 0);

    if ($section !== '') {
        $statement = $pdo->prepare("SELECT {$listSelect} FROM kural_website WHERE pirivu = ? ORDER BY kuralno LIMIT ? OFFSET ?");
        $statement->bindValue(1, $section, PDO::PARAM_STR);
        $statement->bindValue(2, $limit, PDO::PARAM_INT);
        $statement->bindValue(3, $offset, PDO::PARAM_INT);
        $statement->execute();
    } else {
        $statement = $pdo->prepare("SELECT {$listSelect} FROM kural_website ORDER BY kuralno LIMIT ? OFFSET ?");
        $statement->bindValue(1, $limit, PDO::PARAM_INT);
        $statement->bindValue(2, $offset, PDO::PARAM_INT);
        $statement->execute();
    }

    respond(['data' => array_map('kuralPayload', $statement->fetchAll())]);
}

if ($method === 'PUT' && ($segments[0] ?? '') === 'admin' && ($segments[1] ?? '') === 'kurals') {
    requireAdmin($config);
    $number = filter_var($segments[2] ?? null, FILTER_VALIDATE_INT);
    if ($number === false || $number < 1 || $number > 1330) {
        fail('Kural number must be between 1 and 1330.', 422);
    }

    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body)) {
        fail('Request body must be JSON.', 400);
    }

    $editableColumns = [
        'tamil' => 'kural',
        'meaning' => 'TamilPiriyan_urai',
        'generalMeaning' => 'general_urai',
        'englishCouplet' => 'English_couplet',
        'transliteration' => 'transliteration',
        'chapter' => 'chapter',
        'chapterNumber' => 'adikaramno',
        'section' => 'section',
        'paal' => 'paal',
        'iyal' => 'iyal',
        'chapterTitle' => 'adikaram',
        'line1' => 'line1',
        'line2' => 'line2',
        'audioUrl' => 'audio_url',
        'legacyAudioUrl' => 'legacy_audio_url',
    ];
    $updates = [];
    foreach ($editableColumns as $apiField => $column) {
        if (array_key_exists($apiField, $body)) {
            $updates[$column] = $body[$apiField];
        }
    }
    if ($updates === []) {
        fail('No editable fields supplied.', 422);
    }

    $existing = $pdo->prepare("SELECT {$singleSelect} FROM kural_website WHERE kuralno = ? LIMIT 1");
    $existing->execute([$number]);
    $snapshot = $existing->fetch();
    if (!$snapshot) {
        fail('Kural not found.', 404);
    }

    $pdo->beginTransaction();
    try {
        $revision = $pdo->prepare('INSERT INTO kural_revisions (kural_number, snapshot, changed_by) VALUES (?, ?, ?)');
        $revision->execute([$number, json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'admin']);

        $set = [];
        $values = [];
        foreach ($updates as $column => $value) {
            $set[] = "{$column} = ?";
            $values[] = $value;
        }
        $values[] = $number;
        $update = $pdo->prepare('UPDATE kural_website SET ' . implode(', ', $set) . ' WHERE kuralno = ?');
        $update->execute($values);
        $pdo->commit();
    } catch (Throwable) {
        $pdo->rollBack();
        fail('Could not save the correction.', 500);
    }

    $fresh = $pdo->prepare("SELECT {$singleSelect} FROM kural_website WHERE kuralno = ? LIMIT 1");
    $fresh->execute([$number]);
    respond(['data' => kuralPayload($fresh->fetch())]);
}

fail('Route not found.', 404);
