<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

ini_set('display_errors', '0');
require __DIR__ . '/contact-core.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Vary: Origin');

function contactResponse(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

try {
    // The existing deployment lives in domains/abirami.app/public_html/kuralapi.
    // The secret config lives two levels above it, outside public_html.
    $configPath = getenv('KURAL_CONTACT_CONFIG') ?: dirname(__DIR__, 2) . '/kural-contact.config.php';
    $config = is_file($configPath) ? require $configPath : [];
    if (!is_array($config)) throw new RuntimeException('Invalid configuration.');
    $origins = $config['allowed_origins'] ?? ['https://kural.abirami.app'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!is_array($origins) || $origin === '' || !in_array($origin, $origins, true)) {
        contactResponse(403, ['ok' => false, 'error' => 'This origin is not allowed.']);
    }
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'OPTIONS') { http_response_code(204); exit; }
    if ($method !== 'POST') {
        header('Allow: POST, OPTIONS');
        contactResponse(405, ['ok' => false, 'error' => 'Use the contact form to submit a message.']);
    }
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') contactResponse(415, ['ok' => false, 'error' => 'Send JSON.']);
    $raw = file_get_contents('php://input', false, null, 0, 16_385);
    if ($raw === false) throw new RuntimeException('Could not read request.');
    if (strlen($raw) > 16_384) contactResponse(413, ['ok' => false, 'error' => 'Message is too large.']);
    try {
        $input = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        contactResponse(400, ['ok' => false, 'error' => 'Invalid JSON.']);
    }
    if (!is_array($input) || array_is_list($input)) contactResponse(400, ['ok' => false, 'error' => 'Invalid form.']);
    try {
        $message = validateContact($input);
    } catch (InvalidArgumentException $error) {
        contactResponse(422, ['ok' => false, 'error' => $error->getMessage()]);
    }
    $password = $config['smtp_password'] ?? '';
    $autoload = __DIR__ . '/vendor/autoload.php';
    if (($config['enabled'] ?? false) !== true || !is_string($password) || $password === '' || !is_file($autoload)) {
        contactResponse(503, ['ok' => false, 'error' => 'Direct sending is unavailable. Please email support directly.']);
    }
    // Never trust client-supplied forwarding headers for sending limits.
    if (!consumeContactAllowance((string) ($config['rate_limit_directory'] ?? ''),
        $_SERVER['REMOTE_ADDR'] ?? '', hash('sha256', 'kural-contact-rate:' . $password))) {
        header('Retry-After: 3600');
        contactResponse(429, ['ok' => false, 'error' => 'Too many messages. Please try again later.']);
    }
    require $autoload;
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->Port = 465;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->SMTPAuth = true;
    $mail->Username = KURAL_SUPPORT_EMAIL;
    $mail->Password = $password;
    $mail->SMTPDebug = 0;
    $mail->Timeout = 10;
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->setFrom(KURAL_SUPPORT_EMAIL, 'Abirami Audio — Kural Companion');
    $mail->addAddress(KURAL_SUPPORT_EMAIL);
    $mail->addReplyTo($message['email'], $message['name']);
    $mail->isHTML(false);
    $mail->Subject = 'Kural Companion support: ' . $message['topic'];
    $mail->Body = contactBody($message);
    if (!$mail->send()) throw new RuntimeException('SMTP submission failed.');
    contactResponse(200, ['ok' => true]);
} catch (Throwable) {
    // Never return or log SMTP credentials or the visitor's private message.
    error_log('Kural contact submission failed; check private SMTP configuration and server availability.');
    contactResponse(503, ['ok' => false, 'error' => 'Submission could not be confirmed. Please email support directly.']);
}
