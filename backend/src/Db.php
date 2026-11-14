<?php
declare(strict_types=1);
namespace App;

use PDO;

final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                Config::get('DB_HOST', '127.0.0.1'), Config::get('DB_PORT', '5432'), Config::get('DB_NAME', 'keystore'),
                Config::get('DB_SSLMODE', 'prefer'));
            self::$pdo = new PDO($dsn, Config::get('DB_USER', 'keystore'), Config::get('DB_PASS', 'keystore'), [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            // fuzzy-search thresholds used by the % and <% trigram operators (see ProductRepository)
            self::$pdo->exec("SET pg_trgm.similarity_threshold = 0.3; SET pg_trgm.word_similarity_threshold = 0.3");
        }
        return self::$pdo;
    }

    public static function all(string $sql, array $params = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function one(string $sql, array $params = []): ?array
    {
        return self::all($sql, $params)[0] ?? null;
    }

    public static function scalar(string $sql, array $params = []): mixed
    {
        $row = self::one($sql, $params);
        return $row ? reset($row) : null;
    }

    public static function exec(string $sql, array $params = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->rowCount();
    }
}
