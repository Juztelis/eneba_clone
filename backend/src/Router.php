<?php
declare(strict_types=1);
namespace App;

final class Router
{
    /** @var array<int,array{0:string,1:string,2:callable,3:bool}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, bool $auth = false): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [$method, $regex, $handler, $auth];
    }

    public function get(string $p, callable $h, bool $auth = false): void  { $this->add('GET', $p, $h, $auth); }
    public function post(string $p, callable $h, bool $auth = false): void { $this->add('POST', $p, $h, $auth); }

    public function dispatch(Request $req): array
    {
        $pathMatched = false;
        foreach ($this->routes as [$method, $regex, $handler, $auth]) {
            if (!preg_match($regex, $req->path, $m)) continue;
            $pathMatched = true;
            if ($method !== $req->method) continue;
            if ($auth) Auth::authenticate($req);
            return $handler($req, array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY));
        }
        throw new HttpException($pathMatched ? 405 : 404, $pathMatched ? 'Method not allowed' : 'Not found');
    }
}
