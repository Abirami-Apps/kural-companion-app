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
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
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

function download(string $filename, string $content, string $contentType): never
{
    header('Content-Type: ' . $contentType);
    header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
    header('Content-Length: ' . strlen($content));
    echo $content;
    exit;
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

function parseCsv(string $content): array
{
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content) ?? $content;
    $handle = fopen('php://temp', 'r+');
    if ($handle === false) {
        fail('Could not read the CSV import.', 400);
    }
    fwrite($handle, $content);
    rewind($handle);
    $headers = fgetcsv($handle);
    if (!is_array($headers) || $headers === []) {
        fclose($handle);
        fail('CSV import must contain a header row.', 422);
    }
    $headers = array_map(static fn ($header) => trim((string) $header), $headers);
    $rows = [];
    while (($values = fgetcsv($handle)) !== false) {
        if ($values === [null] || count(array_filter($values, static fn ($value) => $value !== null && $value !== '')) === 0) {
            continue;
        }
        $row = [];
        foreach ($headers as $index => $header) {
            if ($header !== '') {
                $row[$header] = $values[$index] ?? null;
            }
        }
        $rows[] = $row;
    }
    fclose($handle);
    return $rows;
}

function importPayload(): array
{
    $body = (string) file_get_contents('php://input');
    if (trim($body) === '') {
        fail('Import body is empty.', 422);
    }
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    $mode = 'upsert';
    if (str_contains($contentType, 'csv') || str_starts_with(ltrim($body), 'kuralno,')) {
        return ['rows' => parseCsv($body), 'mode' => $mode];
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        fail('Import must be a JSON array, {"data": [...]}, or CSV.', 400);
    }
    if (array_key_exists('mode', $decoded)) $mode = (string) $decoded['mode'];
    if (array_key_exists('data', $decoded)) {
        $decoded = $decoded['data'];
    }
    if (!is_array($decoded) || $decoded === []) {
        fail('Import data must contain at least one row.', 422);
    }
    return ['rows' => array_is_list($decoded) ? $decoded : [$decoded], 'mode' => $mode];
}

function importValue(mixed $value, string $column): mixed
{
    if ($value === '' || $value === null) {
        return in_array($column, ['kuralno', 'kural'], true) ? $value : null;
    }
    if (in_array($column, ['kuralno', 'adikaramno'], true)) {
        if (!is_numeric($value) || (int) $value < 0) {
            fail("{$column} must be a non-negative integer.", 422);
        }
        return (int) $value;
    }
    return is_scalar($value) ? (string) $value : null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$segments = requestSegments();

if ($method === 'GET' && ($segments[0] ?? '') === 'health') {
    respond(['ok' => true, 'service' => 'kural-api']);
}

$pdo = db($config);
$fullColumns = [
    'kuralno', 'kuralsort', 'adikaramno', 'adikaramsort', 'kural_range', 'pirivu', 'paal',
    'iyal', 'adikaram', 'kural', 'TamilPiriyan_urai', 'general_urai', 'English_couplet',
    'transliteration', 'chapter', 'section', 'athigaram', 'Kalaingar_Urai',
    'Parimezhalagar_Urai', 'M_Varadharajanar', 'Solomon_Pappaiya', 'line1', 'line2',
    'audio_url', 'legacy_audio_url',
];
$quotedFullSelect = implode(', ', array_map(static fn ($column) => "`{$column}`", $fullColumns));
$singleSelect = 'kuralno, kural, TamilPiriyan_urai, general_urai, English_couplet, transliteration, adikaramno, adikaram, chapter, section, pirivu, paal, iyal, athigaram, line1, line2, audio_url, legacy_audio_url';
$listSelect = $singleSelect;
$editableColumns = [
    'number' => 'kuralno',
    'tamil' => 'kural',
    'meaning' => 'TamilPiriyan_urai',
    'generalMeaning' => 'general_urai',
    'englishCouplet' => 'English_couplet',
    'transliteration' => 'transliteration',
    'chapter' => 'athigaram',
    'chapterNumber' => 'adikaramno',
    'section' => 'pirivu',
    'paal' => 'paal',
    'iyal' => 'iyal',
    'chapterTitle' => 'adikaram',
    'chapterLabel' => 'section',
    'line1' => 'line1',
    'line2' => 'line2',
    'audioUrl' => 'audio_url',
    'legacyAudioUrl' => 'legacy_audio_url',
    // These names make full JSON/CSV exports round-trip without losing any
    // of the source commentaries or sort metadata.
    'kuralno' => 'kuralno',
    'kuralsort' => 'kuralsort',
    'adikaramsort' => 'adikaramsort',
    'kural_range' => 'kural_range',
    'Kalaingar_Urai' => 'Kalaingar_Urai',
    'Parimezhalagar_Urai' => 'Parimezhalagar_Urai',
    'M_Varadharajanar' => 'M_Varadharajanar',
    'Solomon_Pappaiya' => 'Solomon_Pappaiya',
];

// Protected admin listing for a spreadsheet-like editor. Public clients must
// continue using GET /kurals, which never accepts the admin token.
if ($method === 'GET' && ($segments[0] ?? '') === 'admin' && ($segments[1] ?? '') === 'kurals') {
    requireAdmin($config);
    $query = trim((string) ($_GET['q'] ?? ''));
    $section = trim((string) ($_GET['section'] ?? ''));
    $chapterNumber = trim((string) ($_GET['chapterNumber'] ?? ''));
    $limit = min(max((int) ($_GET['limit'] ?? 50), 1), 250);
    $offset = max((int) ($_GET['offset'] ?? 0), 0);
    $where = [];
    $params = [];
    if ($query !== '') {
        $where[] = '(kuralno = :number OR CONCAT_WS(\' \' , kural, TamilPiriyan_urai, general_urai, athigaram) LIKE :query)';
        $params['number'] = ctype_digit($query) ? (int) $query : -1;
        $params['query'] = '%' . $query . '%';
    }
    if ($section !== '') {
        $where[] = 'pirivu = :section';
        $params['section'] = $section;
    }
    if ($chapterNumber !== '') {
        if (!ctype_digit($chapterNumber)) fail('chapterNumber must be an integer.', 422);
        $where[] = 'adikaramno = :chapterNumber';
        $params['chapterNumber'] = (int) $chapterNumber;
    }
    $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
    $count = $pdo->prepare("SELECT COUNT(*) FROM kural_website{$whereSql}");
    $count->execute($params);
    $total = (int) $count->fetchColumn();
    $list = $pdo->prepare("SELECT {$quotedFullSelect} FROM kural_website{$whereSql} ORDER BY kuralno LIMIT :limit OFFSET :offset");
    foreach ($params as $name => $value) {
        $list->bindValue(':' . $name, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $list->bindValue(':limit', $limit, PDO::PARAM_INT);
    $list->bindValue(':offset', $offset, PDO::PARAM_INT);
    $list->execute();
    respond([
        'data' => $list->fetchAll(),
        'pagination' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
    ]);
}

// Download the canonical database rows. JSON preserves every MySQL column;
// CSV is convenient for editing in Excel/Google Sheets and can be imported
// back through POST /admin/import.
if ($method === 'GET' && ($segments[0] ?? '') === 'admin' && ($segments[1] ?? '') === 'export') {
    requireAdmin($config);
    $format = strtolower(trim((string) ($_GET['format'] ?? 'json')));
    $statement = $pdo->query("SELECT {$quotedFullSelect} FROM kural_website ORDER BY kuralno");
    $rows = $statement->fetchAll();
    $stamp = gmdate('Ymd-His');
    if ($format === 'csv') {
        $handle = fopen('php://temp', 'r+');
        if ($handle === false) fail('Could not create CSV export.', 500);
        fputcsv($handle, $fullColumns);
        foreach ($rows as $row) {
            fputcsv($handle, array_map(static fn ($column) => $row[$column] ?? null, $fullColumns));
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        download("kurals-{$stamp}.csv", $csv === false ? '' : $csv, 'text/csv; charset=utf-8');
    }
    if ($format !== 'json') fail('format must be json or csv.', 422);
    $json = json_encode(['version' => 1, 'exportedAt' => gmdate(DATE_ATOM), 'data' => $rows], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    download("kurals-{$stamp}.json", $json === false ? '{"data":[]}' : $json, 'application/json; charset=utf-8');
}

// Import JSON exported by this API, or a CSV edited in a spreadsheet. The
// default is an upsert so a partial correction cannot delete unrelated rows.
// Use {"mode":"replace","data":[...]} only for a deliberate full import.
if ($method === 'POST' && ($segments[0] ?? '') === 'admin' && ($segments[1] ?? '') === 'import') {
    requireAdmin($config);
    $payload = importPayload();
    $rows = $payload['rows'];
    $mode = trim((string) ($_GET['mode'] ?? $payload['mode']));
    if (!in_array($mode, ['upsert', 'replace'], true)) fail('mode must be upsert or replace.', 422);

    $normalized = [];
    $seen = [];
    foreach ($rows as $index => $row) {
        if (!is_array($row)) fail('Import row ' . ($index + 1) . ' must be an object.', 422);
        $mapped = [];
        $isFullDatabaseRow = array_key_exists('kuralno', $row) || array_key_exists('kural', $row);
        foreach ($fullColumns as $column) {
            if (array_key_exists($column, $row)) $mapped[$column] = importValue($row[$column], $column);
        }
        foreach ($editableColumns as $apiField => $column) {
            // Full database exports contain columns named `chapter` and
            // `section`; do not reinterpret those raw columns as the API's
            // aliases and overwrite `athigaram`/`pirivu`.
            if ($isFullDatabaseRow && in_array($apiField, $fullColumns, true)) continue;
            if (array_key_exists($apiField, $row)) $mapped[$column] = importValue($row[$apiField], $column);
        }
        if (!isset($mapped['kuralno']) || !is_int($mapped['kuralno']) || $mapped['kuralno'] < 1 || $mapped['kuralno'] > 1330) {
            fail('Import row ' . ($index + 1) . ' has an invalid kuralno/number.', 422);
        }
        if (isset($seen[$mapped['kuralno']])) fail('Duplicate Kural number ' . $mapped['kuralno'] . ' in import.', 422);
        $seen[$mapped['kuralno']] = true;
        if (array_key_exists('kural', $mapped) && trim((string) $mapped['kural']) === '') {
            fail('Kural ' . $mapped['kuralno'] . ' cannot have empty tamil text.', 422);
        }
        if (!isset($mapped['kuralsort'])) $mapped['kuralsort'] = str_pad((string) $mapped['kuralno'], 4, '0', STR_PAD_LEFT);
        if (!array_key_exists('kural', $mapped) || trim((string) $mapped['kural']) === '') {
            fail('Import row ' . ($index + 1) . ' must include kural/tamil text.', 422);
        }
        $normalized[] = $mapped;
    }
    if ($mode === 'replace' && (count($normalized) !== 1330 || count($seen) !== 1330 || min(array_keys($seen)) !== 1 || max(array_keys($seen)) !== 1330)) {
        fail('replace mode requires exactly one row for every Kural number from 1 to 1330.', 422);
    }

    $updated = 0;
    $inserted = 0;
    $deleted = 0;
    $pdo->beginTransaction();
    try {
        if ($mode === 'replace') {
            $placeholders = implode(',', array_fill(0, count($seen), '?'));
            $delete = $pdo->prepare("DELETE FROM kural_website WHERE kuralno NOT IN ({$placeholders})");
            $delete->execute(array_keys($seen));
            $deleted = $delete->rowCount();
        }
        foreach ($normalized as $mapped) {
            $number = $mapped['kuralno'];
            $existing = $pdo->prepare("SELECT {$quotedFullSelect} FROM kural_website WHERE kuralno = ? LIMIT 1");
            $existing->execute([$number]);
            $snapshot = $existing->fetch();
            if ($snapshot) {
                $revision = $pdo->prepare('INSERT INTO kural_revisions (kural_number, snapshot, changed_by) VALUES (?, ?, ?)');
                $revision->execute([$number, json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'import']);
                $fields = array_values(array_filter(array_keys($mapped), static fn ($column) => $column !== 'kuralno'));
                if ($fields !== []) {
                    $set = implode(', ', array_map(static fn ($column) => "`{$column}` = ?", $fields));
                    $values = array_map(static fn ($column) => $mapped[$column], $fields);
                    $values[] = $number;
                    $update = $pdo->prepare("UPDATE kural_website SET {$set} WHERE kuralno = ?");
                    $update->execute($values);
                    $updated++;
                }
                continue;
            }
            $fields = array_keys($mapped);
            $columns = implode(', ', array_map(static fn ($column) => "`{$column}`", $fields));
            $values = array_map(static fn ($column) => $mapped[$column], $fields);
            $insert = $pdo->prepare("INSERT INTO kural_website ({$columns}) VALUES (" . implode(', ', array_fill(0, count($fields), '?')) . ')');
            $insert->execute($values);
            $inserted++;
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail('Import failed; no changes were committed. ' . $error->getMessage(), 422);
    }
    respond(['ok' => true, 'mode' => $mode, 'updated' => $updated, 'inserted' => $inserted, 'deleted' => $deleted]);
}

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

    $updates = [];
    foreach ($editableColumns as $apiField => $column) {
        // A row's primary key is immutable through the edit endpoint. Import
        // mode may identify a row with number/kuralno, but PUT must never move
        // it to a different primary key.
        if ($apiField === 'number' || $apiField === 'kuralno') continue;
        if (array_key_exists($apiField, $body)) {
            $updates[$column] = $body[$apiField];
        }
    }
    if ($updates === []) {
        fail('No editable fields supplied.', 422);
    }

    $existing = $pdo->prepare("SELECT {$quotedFullSelect} FROM kural_website WHERE kuralno = ? LIMIT 1");
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

    $fresh = $pdo->prepare("SELECT {$quotedFullSelect} FROM kural_website WHERE kuralno = ? LIMIT 1");
    $fresh->execute([$number]);
    respond(['data' => kuralPayload($fresh->fetch())]);
}

fail('Route not found.', 404);
