<?php
declare(strict_types=1);
namespace App\Home;

use App\ProductRepository;

final class DealsBlock implements HomeBlock
{
    public function items(array $config): array
    {
        return ProductRepository::search([
            'sort' => 'discount', 'per_page' => $config['limit'] ?? 10, 'min_discount' => $config['min_discount'] ?? 10,
        ])['items'];
    }
}
