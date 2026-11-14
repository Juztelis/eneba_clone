<?php
declare(strict_types=1);
namespace App;

/** Minimal HS256 JWT (no external dependency). */
final class Jwt
{
    public static function encode(array $claims, int $ttl = 604800): string
    {
        $head = self::b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = self::b64(json_encode($claims + ['iat' => time(), 'exp' => time() + $ttl]));
        return "$head.$body." . self::sign("$head.$body");
    }

    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3 || !hash_equals(self::sign("$parts[0].$parts[1]"), $parts[2])) return null;
        $claims = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        return is_array($claims) && ($claims['exp'] ?? 0) >= time() ? $claims : null;
    }

    private static function sign(string $data): string
    {
        return self::b64(hash_hmac('sha256', $data, Config::get('JWT_SECRET'), true));
    }

    private static function b64(string $d): string
    {
        return rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
    }
}
