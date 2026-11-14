<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    if (str_starts_with($class, 'App\\')) {
        $file = __DIR__ . '/../src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
        if (is_file($file)) require $file;
    }
});

use App\{Config, HttpException, Request, Router};

Config::load(__DIR__ . '/../.env');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, array_map('trim', explode(',', Config::get('CORS_ORIGINS', 'http://localhost:5173'))), true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

try {
    $router = new Router();
    require __DIR__ . '/../src/routes.php';
    $result = $router->dispatch(Request::capture());
    echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (HttpException $e) {
    http_response_code($e->status);
    echo json_encode(['error' => ['message' => $e->getMessage(), 'fields' => (object) $e->fields]]);
} catch (Throwable $e) {
    error_log((string) $e);
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Something went wrong on our side. Please try again.', 'fields' => (object) []]]);
}
