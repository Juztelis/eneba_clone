<?php
declare(strict_types=1);

use App\Controllers\{AuthController, CatalogController, HomeController, OrderController};
use App\Payment\SimulatedGateway;

/** @var App\Router $router */
$gateway = new SimulatedGateway();   // swap for a real provider's test-mode gateway here

$router->get('/api/health', fn() => ['status' => 'ok']);

$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->get('/api/auth/me', [AuthController::class, 'me'], auth: true);

$router->get('/api/home/layout', [HomeController::class, 'layout']);
$router->get('/api/home/blocks/{id}', [HomeController::class, 'block']);

$router->get('/api/filters', [CatalogController::class, 'filters']);
$router->get('/api/products', [CatalogController::class, 'index']);
$router->get('/api/products/{slug}', [CatalogController::class, 'show']);
$router->get('/api/search/suggest', [CatalogController::class, 'suggest']);

$router->post('/api/cart/quote', [OrderController::class, 'quote']);
$router->post('/api/checkout', fn($req) => OrderController::checkout($req, $gateway), auth: true);
$router->get('/api/orders', [OrderController::class, 'index'], auth: true);
$router->get('/api/orders/{id}', [OrderController::class, 'show'], auth: true);
