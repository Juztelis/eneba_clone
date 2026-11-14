<?php
declare(strict_types=1);
namespace App\Home;

use App\ProductRepository;

final class NewReleasesBlock implements HomeBlock
{
    public function items(array $config): array
    {
        return ProductRepository::search(['sort' => 'newest', 'per_page' => $config['limit'] ?? 10])['items'];
    }
}
