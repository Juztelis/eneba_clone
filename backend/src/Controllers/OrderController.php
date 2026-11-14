<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{CartService, Db, HttpException, OrderRepository, Request};
use App\Payment\PaymentGateway;

final class OrderController
{
    public static function quote(Request $req): array
    {
        return CartService::quote(CartService::normalize($req->input('items')));
    }

    /**
     * Atomic checkout: lock keys -> charge -> record order -> mark keys sold. Any failure rolls everything back,
     * so a buyer is never charged without receiving keys and two buyers can never get the same key.
     */
    public static function checkout(Request $req, PaymentGateway $gateway): array
    {
        $items = CartService::normalize($req->input('items'));
        $card = (array) $req->input('payment', []);
        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            $picked = [];   // [offer_id, key_id, price]
            foreach ($items as $offerId => $qty) {   // ascending ids => consistent lock order
                $offer = Db::one(
                    'SELECT o.id, o.price_cents, p.name FROM offers o JOIN products p ON p.id = o.product_id WHERE o.id = :id AND o.active',
                    ['id' => $offerId]);
                if (!$offer) throw new HttpException(409, 'An item in your cart is no longer available');
                $keys = Db::all(
                    "SELECT id FROM game_keys WHERE offer_id = :o AND status = 'available' ORDER BY id LIMIT :n FOR UPDATE SKIP LOCKED",
                    ['o' => $offerId, 'n' => $qty]);
                if (count($keys) < $qty) throw new HttpException(409, "Not enough keys left for {$offer['name']}. Update your cart and try again.");
                foreach ($keys as $k) $picked[] = [$offerId, $k['id'], $offer['price_cents']];
            }
            $total = array_sum(array_column($picked, 2));

            $charge = $gateway->charge($total, 'EUR', $card);
            if (!$charge->approved) throw new HttpException(402, $charge->message);

            $orderId = (int) Db::scalar(
                'INSERT INTO orders (user_id, total_cents, payment_ref, card_last4) VALUES (:u, :t, :ref, :l4) RETURNING id',
                ['u' => $req->user['id'], 't' => $total, 'ref' => $charge->reference, 'l4' => $charge->last4]);
            foreach ($picked as [$offerId, $keyId, $price]) {
                Db::exec('INSERT INTO order_items (order_id, offer_id, key_id, unit_price_cents) VALUES (:o, :of, :k, :p)',
                    ['o' => $orderId, 'of' => $offerId, 'k' => $keyId, 'p' => $price]);
                Db::exec("UPDATE game_keys SET status = 'sold' WHERE id = :k", ['k' => $keyId]);
            }
            foreach ($items as $offerId => $qty) {
                Db::exec('UPDATE products SET sales_count = sales_count + :q WHERE id = (SELECT product_id FROM offers WHERE id = :o)', ['q' => $qty, 'o' => $offerId]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
        http_response_code(201);
        return ['order' => OrderRepository::find($orderId, (int) $req->user['id'])];
    }

    public static function index(Request $req): array
    {
        return ['orders' => OrderRepository::forUser((int) $req->user['id'])];
    }

    public static function show(Request $req, array $p): array
    {
        return ['order' => OrderRepository::find((int) $p['id'], (int) $req->user['id']) ?? throw new HttpException(404, 'Order not found')];
    }
}
