<?php
declare(strict_types=1);
namespace App;

final class OrderRepository
{
    private const ISO = "to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')";

    public static function forUser(int $userId): array
    {
        return Db::all(
            'SELECT o.id, o.total_cents, o.currency, ' . self::ISO . ' AS created_at,
                    COUNT(oi.id) AS items_count, string_agg(DISTINCT p.name, \', \') AS product_names
             FROM orders o JOIN order_items oi ON oi.order_id = o.id
             JOIN offers ofr ON ofr.id = oi.offer_id JOIN products p ON p.id = ofr.product_id
             WHERE o.user_id = :u GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC', ['u' => $userId]);
    }

    /** Order with its decrypted keys. Scoped to the owner: another user's id returns null. */
    public static function find(int $orderId, int $userId): ?array
    {
        $order = Db::one(
            'SELECT o.id, o.total_cents, o.currency, o.card_last4, ' . self::ISO . ' AS created_at
             FROM orders o WHERE o.id = :id AND o.user_id = :u', ['id' => $orderId, 'u' => $userId]);
        if (!$order) return null;

        $rows = Db::all(
            'SELECT oi.id, oi.unit_price_cents, k.key_enc, p.slug, p.name, p.cover_from, p.cover_to, p.image_url,
                    pl.name AS platform_name, r.code AS region, s.name AS seller
             FROM order_items oi JOIN game_keys k ON k.id = oi.key_id
             JOIN offers ofr ON ofr.id = oi.offer_id JOIN products p ON p.id = ofr.product_id
             JOIN platforms pl ON pl.id = p.platform_id JOIN regions r ON r.id = ofr.region_id JOIN sellers s ON s.id = ofr.seller_id
             WHERE oi.order_id = :id ORDER BY oi.id', ['id' => $orderId]);

        $order['items'] = array_map(static fn(array $r) => [
            'id' => $r['id'], 'unit_price_cents' => $r['unit_price_cents'], 'seller' => $r['seller'], 'region' => $r['region'],
            'key' => Crypto::decrypt($r['key_enc']),
            'product' => ['slug' => $r['slug'], 'name' => $r['name'], 'platform' => $r['platform_name'],
                          'cover' => ['from' => $r['cover_from'], 'to' => $r['cover_to'], 'image_url' => $r['image_url']]],
        ], $rows);
        return $order;
    }
}
