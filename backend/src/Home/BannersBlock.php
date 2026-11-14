<?php
declare(strict_types=1);
namespace App\Home;

use App\Db;

final class BannersBlock implements HomeBlock
{
    public function items(array $config): array
    {
        return array_map(static fn(array $b) => [
            'id' => $b['id'], 'title' => $b['title'], 'subtitle' => $b['subtitle'],
            'cta_label' => $b['cta_label'], 'cta_url' => $b['cta_url'],
            'cover' => ['from' => $b['cover_from'], 'to' => $b['cover_to'], 'image_url' => $b['image_url']],
        ], Db::all('SELECT * FROM banners WHERE active ORDER BY position'));
    }
}
