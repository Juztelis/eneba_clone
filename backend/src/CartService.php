<?php
declare(strict_types=1);
namespace App;

final class CartService
{
    private const MAX_LINES = 20;
    private const MAX_QTY = 10;

    /** Validates client input. Returns [offer_id => qty], sorted by id (stable lock order at checkout). */
    public static function normalize(mixed $items): array
    {
        if (!is_array($items) || !$items) throw new HttpException(422, 'Your cart is empty');
        if (count($items) > self::MAX_LINES) throw new HttpException(422, 'Too many items in the cart');
        $out = [];
        foreach ($items as $it) {
            $id = filter_var($it['offer_id'] ?? null, FILTER_VALIDATE_INT);
            $qty = filter_var($it['qty'] ?? 1, FILTER_VALIDATE_INT);
            if (!$id || $id < 1 || !$qty || $qty < 1) throw new HttpException(422, 'Invalid cart item');
            $out[$id] = min(self::MAX_QTY, ($out[$id] ?? 0) + $qty);
        }
        ksort($out);
        return $out;
    }

    /** Current prices and stock for the cart. The client never supplies prices. */
    public static function quote(array $items): array
    {
        $ph = [];
        $params = [];
        foreach (array_keys($items) as $i => $id) { $ph[] = ":o$i"; $params["o$i"] = $id; }
        $rows = Db::all(
            'SELECT vo.id AS offer_id, vo.price_cents, vo.stock, p.slug, p.name, p.cover_from, p.cover_to, p.image_url,
                    pl.name AS platform_name, r.code AS region, s.name AS seller
             FROM v_offers vo JOIN products p ON p.id = vo.product_id JOIN platforms pl ON pl.id = p.platform_id
             JOIN regions r ON r.id = vo.region_id JOIN sellers s ON s.id = vo.seller_id
             WHERE vo.id IN (' . implode(',', $ph) . ')', $params);

        $lines = [];
        $total = 0;
        foreach ($rows as $r) {
            $qty = min($items[$r['offer_id']], $r['stock']);
            if ($qty < 1) continue;
            $lines[] = [
                'offer_id' => $r['offer_id'], 'qty' => $qty, 'requested_qty' => $items[$r['offer_id']], 'stock' => $r['stock'],
                'unit_price_cents' => $r['price_cents'], 'seller' => $r['seller'], 'region' => $r['region'],
                'product' => ['slug' => $r['slug'], 'name' => $r['name'], 'platform' => $r['platform_name'],
                              'cover' => ['from' => $r['cover_from'], 'to' => $r['cover_to'], 'image_url' => $r['image_url']]],
            ];
            $total += $qty * $r['price_cents'];
        }
        $found = array_column($lines, 'offer_id');
        return ['lines' => $lines, 'total_cents' => $total, 'currency' => 'EUR',
                'unavailable' => array_values(array_diff(array_keys($items), $found))];
    }
}
