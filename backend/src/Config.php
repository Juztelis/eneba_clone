<?php
declare(strict_types=1);
namespace App;

/** Reads .env once; real environment variables win. */
final class Config
{
    private static array $values = [];

    public static function load(string $file): void
    {
        if (!is_file($file)) return;
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            self::$values[trim($k)] = trim($v);
        }
    }

    public static function get(string $key, ?string $default = null): string
    {
        $env = getenv($key);
        return $env !== false && $env !== '' ? $env
            : (self::$values[$key] ?? $default ?? throw new \RuntimeException("Missing config value: $key"));
    }
}
