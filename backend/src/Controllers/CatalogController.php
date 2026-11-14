<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{HttpException, ProductRepository, Request};

final class CatalogController
{
    public static function index(Request $req): array
    {
        return ProductRepository::search(self::filtersFrom($req->query));
    }

    public static function show(Request $req, array $p): array
    {
        return ProductRepository::find($p['slug']) ?? throw new HttpException(404, 'Product not found');
    }

    /** Header search-box dropdown: a few best matches, typo-tolerant. */
    public static function suggest(Request $req): array
    {
        $q = trim((string) ($req->query['q'] ?? ''));
        if (mb_strlen($q) < 2) return ['items' => []];
        return ['items' => ProductRepository::search(['q' => $q, 'per_page' => 6])['items']];
    }

    public static function filters(): array
    {
        return ProductRepository::filters();
    }

    private static function filtersFrom(array $q): array
    {
        $f = [];
        foreach (['q', 'platform', 'region', 'genre', 'sort'] as $k) {
            if (isset($q[$k]) && is_string($q[$k]) && $q[$k] !== '') $f[$k] = mb_substr($q[$k], 0, 100);
        }
        foreach (['min_price', 'max_price', 'page', 'per_page'] as $k) {
            if (isset($q[$k]) && ctype_digit((string) $q[$k])) $f[$k] = (int) $q[$k];
        }
        return $f;
    }
}
