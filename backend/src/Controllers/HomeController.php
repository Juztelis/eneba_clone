<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Db, HttpException, Request};
use App\Home\{BannersBlock, BestSellersBlock, DealsBlock, HomeBlock, NewReleasesBlock, PlatformsBlock};

final class HomeController
{
    /** home_blocks.source => service class. Add a class here + a row in home_blocks to ship a new block. */
    private const SOURCES = [
        'banners' => BannersBlock::class, 'best_sellers' => BestSellersBlock::class, 'deals' => DealsBlock::class,
        'new_releases' => NewReleasesBlock::class, 'platforms' => PlatformsBlock::class,
    ];

    /** Which blocks to draw, in which order, and where each one loads its data from. No content here. */
    public static function layout(): array
    {
        $rows = Db::all('SELECT id, type, title, link_url FROM home_blocks WHERE active ORDER BY position');
        return ['blocks' => array_map(static fn(array $b) => $b + ['data_url' => "/api/home/blocks/{$b['id']}"], $rows)];
    }

    public static function block(Request $req, array $p): array
    {
        $row = Db::one('SELECT source, config FROM home_blocks WHERE id = :id AND active', ['id' => (int) $p['id']]);
        $class = $row ? (self::SOURCES[$row['source']] ?? null) : null;
        if (!$class) throw new HttpException(404, 'Block not found');
        /** @var HomeBlock $block */
        $block = new $class();
        return ['items' => $block->items(json_decode($row['config'], true) ?: [])];
    }
}
