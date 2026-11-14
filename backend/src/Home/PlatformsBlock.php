<?php
declare(strict_types=1);
namespace App\Home;

use App\ProductRepository;

final class PlatformsBlock implements HomeBlock
{
    public function items(array $config): array
    {
        return array_map(static fn(array $p) => $p + ['link_url' => '/store?platform=' . $p['slug']],
            ProductRepository::filters()['platforms']);
    }
}
