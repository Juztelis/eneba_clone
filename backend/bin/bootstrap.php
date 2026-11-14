<?php
declare(strict_types=1);
/**
 * Runs on every container start (hosts like Render's free plan give you no shell, so setup must be automatic):
 *   1. wait for the database  2. create the schema if it is missing  3. load demo data if AUTO_SEED=true and the catalogue is empty
 * Safe to run repeatedly; it never touches existing data.
 */
spl_autoload_register(static function (string $c): void {
    if (str_starts_with($c, 'App\\')) require __DIR__ . '/../src/' . str_replace('\\', '/', substr($c, 4)) . '.php';
});

use App\{Config, Crypto, Db};

Config::load(__DIR__ . '/../.env');

$pdo = null;
for ($try = 1; $try <= 20 && $pdo === null; $try++) {
    try {
        $pdo = Db::pdo();
    } catch (PDOException $e) {
        fwrite(STDERR, "Waiting for the database ($try/20): {$e->getMessage()}\n");
        sleep(3);
    }
}
if ($pdo === null) { fwrite(STDERR, "Database is unreachable, giving up.\n"); exit(1); }

if (Db::scalar("SELECT to_regclass('public.users')") === null) {
    echo "Creating database schema...\n";
    $pdo->exec((string) file_get_contents(__DIR__ . '/../../database/schema.sql'));
}

// Fail the deploy (instead of charging customers for keys nobody can decrypt) if APP_KEY differs from the one used to encrypt the stored keys.
$sample = Db::scalar('SELECT key_enc FROM game_keys LIMIT 1');
if ($sample !== null) {
    try { Crypto::decrypt((string) $sample); }
    catch (Throwable) { fwrite(STDERR, "APP_KEY does not match the key that encrypted the keys already in the database. Restore the original APP_KEY.\n"); exit(1); }
}

if (filter_var(Config::get('AUTO_SEED', 'false'), FILTER_VALIDATE_BOOL) && (int) Db::scalar('SELECT COUNT(*) FROM products') === 0) {
    echo "Loading demo data...\n";
    require __DIR__ . '/seed.php';
}
echo "Bootstrap complete.\n";
