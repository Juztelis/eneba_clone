<?php
declare(strict_types=1);
namespace App;

/** AES-256-GCM for digital keys at rest. Layout: base64(iv[12] | tag[16] | ciphertext). */
final class Crypto
{
    private static function key(): string
    {
        return hash('sha256', Config::get('APP_KEY'), true);
    }

    public static function encrypt(string $plain): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $ct = openssl_encrypt($plain, 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, $iv, $tag);
        return base64_encode($iv . $tag . $ct);
    }

    public static function decrypt(string $blob): string
    {
        $raw = (string) base64_decode($blob, true);
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
        if ($plain === false) throw new \RuntimeException('Key decryption failed');
        return $plain;
    }
}
