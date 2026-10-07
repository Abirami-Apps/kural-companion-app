<?php
declare(strict_types=1);

const KURAL_SUPPORT_EMAIL = 'support@abiramiaudio.com';
const KURAL_CONTACT_TOPICS = [
    'General question', 'Purchase or subscription', 'Account access',
    'Technical problem', 'Privacy or account data',
];

function validateContact(array $input): array
{
    foreach (['name', 'email', 'topic', 'message', 'website'] as $key) {
        if (!isset($input[$key]) || !is_string($input[$key])) {
            throw new InvalidArgumentException('Complete the contact form.');
        }
    }
    if ($input['website'] !== '') throw new InvalidArgumentException('Invalid submission.');
    $name = trim($input['name']);
    $email = trim($input['email']);
    $message = trim($input['message']);
    if (preg_match('/[\x00-\x1f\x7f]/', $input['name'] . $input['email'])
        || mb_strlen($name, 'UTF-8') > 80
        || strlen($email) > 254
        || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Enter a valid name and reply email.');
    }
    if (!in_array($input['topic'], KURAL_CONTACT_TOPICS, true)
        || mb_strlen($message, 'UTF-8') < 10
        || mb_strlen($message, 'UTF-8') > 3000
        || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $message)) {
        throw new InvalidArgumentException('Choose a topic and enter a message of 10–3000 characters.');
    }
    // No client-controlled sender, recipient, headers or attachments.
    return ['name' => $name, 'email' => $email, 'topic' => $input['topic'], 'message' => $message];
}

function contactBody(array $input): string
{
    return "Kural Companion contact form\nReply email is visitor-supplied and is not verified.\n\nName: " . ($input['name'] ?: 'Not provided')
        . "\nReply email: " . $input['email'] . "\nTopic: " . $input['topic']
        . "\n\nMessage:\n" . $input['message'];
}

// A single locked file makes per-IP and global limits atomic across PHP workers.
// Store only salted IP hashes and timestamps, never emails or message contents.
function consumeContactAllowance(string $directory, string $ip, string $secret, ?int $now = null): bool
{
    if (!filter_var($ip, FILTER_VALIDATE_IP) || $secret === '' || $directory === '') {
        throw new RuntimeException('Sending limits are not configured.');
    }
    $now ??= time();
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Sending limits are unavailable.');
    }
    $path = $directory . '/limits.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false) throw new RuntimeException('Sending limits are unavailable.');
    try {
        if (!@chmod($path, 0600) || !flock($handle, LOCK_EX)) {
            throw new RuntimeException('Sending limits are unavailable.');
        }
        $raw = stream_get_contents($handle, 100_001);
        if ($raw === false || strlen($raw) > 100_000) throw new RuntimeException('Invalid limit state.');
        $state = $raw === '' ? ['global' => [], 'ips' => []] : json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($state) || !isset($state['global'], $state['ips'])
            || !is_array($state['global']) || !is_array($state['ips'])) {
            throw new RuntimeException('Invalid limit state.');
        }
        $recent = static function (array $times, int $since) use ($now): array {
            foreach ($times as $value) {
                if (!is_int($value) || $value > $now) throw new RuntimeException('Invalid limit state.');
            }
            return array_values(array_filter($times, static fn (int $value): bool => $value > $since));
        };
        $state['global'] = $recent($state['global'], $now - 86400);
        foreach ($state['ips'] as $hash => $times) {
            if (!is_array($times)) throw new RuntimeException('Invalid limit state.');
            $state['ips'][$hash] = $recent($times, $now - 3600);
            if ($state['ips'][$hash] === []) unset($state['ips'][$hash]);
        }
        $hash = hash_hmac('sha256', $ip, $secret);
        $hour = $recent($state['global'], $now - 3600);
        if (count($state['ips'][$hash] ?? []) >= 3 || count($hour) >= 30 || count($state['global']) >= 100) {
            return false;
        }
        $state['global'][] = $now;
        $state['ips'][$hash][] = $now;
        $json = json_encode($state, JSON_THROW_ON_ERROR);
        if (!rewind($handle) || !ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) {
            throw new RuntimeException('Sending limits are unavailable.');
        }
        return true;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
