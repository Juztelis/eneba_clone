<?php
declare(strict_types=1);
namespace App;

final class Request
{
    public ?array $user = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        private readonly array $body,
    ) {}

    public static function capture(): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $raw = file_get_contents('php://input');
        $body = [];
        if ($raw !== '' && $raw !== false) {
            $body = json_decode($raw, true);
            if (!is_array($body)) throw new HttpException(400, 'Request body must be valid JSON');
        }
        return new self($_SERVER['REQUEST_METHOD'] ?? 'GET', rtrim($path, '/') ?: '/', $_GET, $body);
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function bearer(): ?string
    {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        return preg_match('/^Bearer\s+(\S+)$/i', $h, $m) ? $m[1] : null;
    }
}
