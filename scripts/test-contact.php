<?php
declare(strict_types=1);
require dirname(__DIR__) . '/hostinger/kuralapi/contact-core.php';

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}
function rejects(callable $operation): void
{
    try { $operation(); } catch (InvalidArgumentException | RuntimeException | JsonException) { return; }
    throw new LogicException('Expected rejection.');
}

$input = ['name' => 'Kani', 'email' => 'kani@example.com', 'topic' => 'Technical problem',
    'message' => 'தமிழில் உதவி தேவை. Audio does not start.', 'website' => ''];
check(validateContact($input)['message'] === $input['message'], 'Tamil message must be preserved.');
check(str_contains(contactBody(validateContact($input)), $input['message']), 'Plain text body.');
foreach ([['email' => "kani@example.com\r\nBcc: victim@example.com"], ['name' => "Kani\nHeader"],
    ['email' => 'not-email'], ['website' => 'bot'], ['topic' => 'Injected topic'],
    ['message' => 'short'], ['message' => str_repeat('அ', 3001)], ['name' => []]] as $bad) {
    rejects(static fn () => validateContact(array_replace($input, $bad)));
}
$directory = sys_get_temp_dir() . '/kural-contact-test-' . bin2hex(random_bytes(8));
try {
    for ($i = 0; $i < 3; $i++) check(consumeContactAllowance($directory, '192.0.2.1', 'test-secret', 10000), 'Allow three.');
    check(!consumeContactAllowance($directory, '192.0.2.1', 'test-secret', 10000), 'Block fourth.');
    check(consumeContactAllowance($directory, '192.0.2.1', 'test-secret', 13601), 'Allow after hour.');
    for ($i = 2; $i <= 30; $i++) check(consumeContactAllowance($directory, "192.0.2.$i", 'test-secret', 13601), 'Global allowance.');
    check(!consumeContactAllowance($directory, '192.0.2.31', 'test-secret', 13601), 'Global hourly cap.');
    $stored = file_get_contents($directory . '/limits.json');
    check(!str_contains($stored, '192.0.2.'), 'Do not persist raw IP addresses.');
    file_put_contents($directory . '/limits.json', json_encode(['global' => array_fill(0, 100, 20000), 'ips' => []]));
    check(!consumeContactAllowance($directory, '192.0.2.1', 'test-secret', 30000), 'Global daily cap.');
    check(consumeContactAllowance($directory, '192.0.2.1', 'test-secret', 110000), 'Expired daily cap.');
    file_put_contents($directory . '/limits.json', 'corrupt test state');
    rejects(static fn () => consumeContactAllowance($directory, '192.0.2.1', 'test-secret', 13601));
    rejects(static fn () => consumeContactAllowance($directory, 'invalid-ip', 'test-secret', 13601));
    echo "Contact validation and rate-limit checks passed. No SMTP connections made.\n";
} finally {
    if (is_file($directory . '/limits.json')) unlink($directory . '/limits.json');
    if (is_dir($directory)) rmdir($directory);
}
