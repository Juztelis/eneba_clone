<?php
declare(strict_types=1);
/**
 * Demo data: platforms, regions, sellers, ~24 products with several seller offers each, encrypted keys,
 * homepage banners and the homepage layout.   Usage:  php bin/seed.php   (run after database/schema.sql)
 * Names are real game titles used purely as demo catalogue entries; the keys are random strings.
 */
spl_autoload_register(static function (string $c): void {
    if (str_starts_with($c, 'App\\')) require __DIR__ . '/../src/' . str_replace('\\', '/', substr($c, 4)) . '.php';
});

use App\{Config, Crypto, Db};

Config::load(__DIR__ . '/../.env');
mt_srand(42);   // deterministic demo data
$pdo = Db::pdo();
$pdo->beginTransaction();
$pdo->exec('TRUNCATE order_items, orders, game_keys, offers, products, sellers, genres, regions, platforms, banners, home_blocks RESTART IDENTITY CASCADE');

$ins = static function (string $table, array $rows) {
    $ids = [];
    foreach ($rows as $row) {
        $cols = array_keys($row);
        $ids[] = Db::scalar("INSERT INTO $table (" . implode(',', $cols) . ') VALUES (:' . implode(',:', $cols) . ') RETURNING id', $row);
    }
    return $ids;
};

$platforms = ['steam' => 'Steam', 'xbox' => 'Xbox', 'playstation' => 'PlayStation', 'nintendo' => 'Nintendo', 'epic' => 'Epic Games', 'ea' => 'EA App'];
$platformId = [];
foreach ($platforms as $slug => $name) $platformId[$slug] = $ins('platforms', [['slug' => $slug, 'name' => $name]])[0];

$regionId = [];
foreach (['GLOBAL' => 'Global', 'EU' => 'Europe', 'US' => 'United States', 'UK' => 'United Kingdom'] as $code => $name) {
    $regionId[$code] = $ins('regions', [['code' => $code, 'name' => $name]])[0];
}

$genreId = [];
foreach (['Action', 'Adventure', 'RPG', 'Shooter', 'Racing', 'Sports', 'Strategy', 'Simulation', 'Horror'] as $g) {
    $genreId[$g] = $ins('genres', [['slug' => strtolower($g), 'name' => $g]])[0];
}

$sellerIds = [];
foreach ([['KeyKingdom', 4.9], ['PixelVault', 4.8], ['GameDepot', 4.7], ['LootLine', 4.6], ['ByteBazaar', 4.5], ['StarKeys', 4.2]] as [$n, $r]) {
    $sellerIds[] = $ins('sellers', [['name' => $n, 'rating' => $r, 'sales_count' => mt_rand(2000, 90000)]])[0];
}

// name, platform, genre, publisher, RRP in cents, release date
$catalog = [
    ['Cyberpunk 2077', 'steam', 'RPG', 'CD PROJEKT RED', 5999, '2020-12-10'],
    ['The Witcher 3: Wild Hunt', 'steam', 'RPG', 'CD PROJEKT RED', 3999, '2015-05-19'],
    ['Elden Ring', 'steam', 'RPG', 'FromSoftware', 5999, '2022-02-25'],
    ["Baldur's Gate 3", 'steam', 'RPG', 'Larian Studios', 5999, '2023-08-03'],
    ['Red Dead Redemption 2', 'steam', 'Action', 'Rockstar Games', 5999, '2019-12-05'],
    ['Grand Theft Auto V', 'steam', 'Action', 'Rockstar Games', 2999, '2015-04-14'],
    ['Hogwarts Legacy', 'steam', 'RPG', 'Warner Bros. Games', 5999, '2023-02-10'],
    ['Resident Evil 4', 'steam', 'Horror', 'Capcom', 3999, '2023-03-24'],
    ["Sid Meier's Civilization VI", 'steam', 'Strategy', '2K', 5999, '2016-10-21'],
    ['Stardew Valley', 'steam', 'Simulation', 'ConcernedApe', 1499, '2016-02-26'],
    ['Forza Horizon 5', 'xbox', 'Racing', 'Xbox Game Studios', 5999, '2021-11-09'],
    ['Halo Infinite', 'xbox', 'Shooter', 'Xbox Game Studios', 5999, '2021-12-08'],
    ['Starfield', 'xbox', 'RPG', 'Bethesda', 6999, '2023-09-06'],
    ['God of War Ragnarök', 'playstation', 'Action', 'Sony Interactive Entertainment', 6999, '2022-11-09'],
    ["Marvel's Spider-Man 2", 'playstation', 'Action', 'Sony Interactive Entertainment', 6999, '2023-10-20'],
    ['Gran Turismo 7', 'playstation', 'Racing', 'Sony Interactive Entertainment', 6999, '2022-03-04'],
    ['The Legend of Zelda: Tears of the Kingdom', 'nintendo', 'Adventure', 'Nintendo', 6999, '2023-05-12'],
    ['Super Mario Odyssey', 'nintendo', 'Adventure', 'Nintendo', 5999, '2017-10-27'],
    ['Mario Kart 8 Deluxe', 'nintendo', 'Racing', 'Nintendo', 5999, '2017-04-28'],
    ['Animal Crossing: New Horizons', 'nintendo', 'Simulation', 'Nintendo', 5999, '2020-03-20'],
    ['Alan Wake 2', 'epic', 'Horror', 'Epic Games Publishing', 4999, '2023-10-27'],
    ['Control', 'epic', 'Action', '505 Games', 3999, '2019-08-27'],
    ['Battlefield 2042', 'ea', 'Shooter', 'Electronic Arts', 5999, '2021-11-19'],
    ['It Takes Two', 'ea', 'Adventure', 'Electronic Arts', 3999, '2021-03-26'],
];

$productIds = [];
foreach ($catalog as [$name, $pf, $genre, $publisher, $rrp, $date]) {
    $hue = crc32($name) % 360;
    $productIds[$name] = $ins('products', [[
        'slug' => trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $name))), '-'),
        'name' => $name, 'platform_id' => $platformId[$pf], 'genre_id' => $genreId[$genre], 'publisher' => $publisher,
        'description' => "$name ($genre) by $publisher. You receive a digital activation key for {$platforms[$pf]} right after payment; "
            . 'redeem it in the platform launcher or store. Pick the seller and region that suit you and compare prices on this page.',
        'release_date' => $date, 'rrp_cents' => $rrp, 'sales_count' => mt_rand(40, 6000),
        'cover_from' => "hsl($hue 70% 48%)", 'cover_to' => 'hsl(' . (($hue + 50) % 360) . ' 65% 18%)',
    ]])[0];

    // 3–5 sellers per product, each with their own region and price, 3–14 keys in stock
    $chosen = array_slice($sellerIds, 0, 6);
    shuffle($chosen);
    foreach (array_slice($chosen, 0, mt_rand(3, 5)) as $sellerId) {
        $region = ['GLOBAL', 'GLOBAL', 'EU', 'US', 'UK'][mt_rand(0, 4)];
        $price = (int) (round($rrp * mt_rand(48, 94) / 100 / 5) * 5 - 1);   // e.g. 2495 -> 24.94 style prices
        $offerId = $ins('offers', [['product_id' => $productIds[$name], 'seller_id' => $sellerId, 'region_id' => $regionId[$region], 'price_cents' => max(99, $price)]])[0];
        for ($i = mt_rand(3, 14); $i > 0; $i--) {
            $key = implode('-', str_split(strtoupper(substr(bin2hex(random_bytes(8)), 0, 15)), 5));
            Db::exec('INSERT INTO game_keys (offer_id, key_enc) VALUES (:o, :k)', ['o' => $offerId, 'k' => Crypto::encrypt($key)]);
        }
    }
}

$ins('banners', [
    ['title' => 'Mega sale on PC games', 'subtitle' => 'Steam keys at seller-set prices, delivered instantly.', 'cta_label' => 'See the deals', 'cta_url' => '/store?sort=discount', 'cover_from' => 'hsl(265 80% 52%)', 'cover_to' => 'hsl(300 70% 30%)', 'position' => 1],
    ['title' => 'Console favourites', 'subtitle' => 'Xbox, PlayStation and Nintendo keys from trusted sellers.', 'cta_label' => 'Browse consoles', 'cta_url' => '/store?platform=xbox,playstation,nintendo', 'cover_from' => 'hsl(215 85% 45%)', 'cover_to' => 'hsl(255 70% 22%)', 'position' => 2],
    ['title' => 'Compare sellers, pay less', 'subtitle' => 'Every game has several offers. Pick the best price and region.', 'cta_label' => 'Start shopping', 'cta_url' => '/store', 'cover_from' => 'hsl(20 90% 52%)', 'cover_to' => 'hsl(340 70% 28%)', 'position' => 3],
]);

$ins('home_blocks', [
    ['type' => 'hero_banner', 'source' => 'banners', 'title' => null, 'link_url' => null, 'config' => '{}', 'position' => 1],
    ['type' => 'platform_tiles', 'source' => 'platforms', 'title' => 'Shop by platform', 'link_url' => '/store', 'config' => '{}', 'position' => 2],
    ['type' => 'product_carousel', 'source' => 'best_sellers', 'title' => 'Best sellers', 'link_url' => '/store?sort=popularity', 'config' => '{"limit":10}', 'position' => 3],
    ['type' => 'product_carousel', 'source' => 'deals', 'title' => 'Hot deals', 'link_url' => '/store?sort=discount', 'config' => '{"limit":10,"min_discount":15}', 'position' => 4],
    ['type' => 'product_carousel', 'source' => 'new_releases', 'title' => 'New releases', 'link_url' => '/store?sort=newest', 'config' => '{"limit":10}', 'position' => 5],
]);

$pdo->commit();
echo 'Seeded ' . count($catalog) . ' products, ' . Db::scalar('SELECT COUNT(*) FROM offers') . ' offers, ' . Db::scalar('SELECT COUNT(*) FROM game_keys') . " keys.\n";
