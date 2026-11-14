<?php
declare(strict_types=1);
namespace App;

/**
 * All catalogue reads. A product is listed only while at least one of its offers has keys in stock;
 * the listed price is the cheapest matching offer.
 */
final class ProductRepository
{
    private const DISCOUNT = 'CASE WHEN p.rrp_cents > o.min_price THEN ROUND(100.0 * (p.rrp_cents - o.min_price) / p.rrp_cents)::int ELSE 0 END';

    private const SORTS = [
        'relevance'  => 'score DESC, p.sales_count DESC, p.id',
        'popularity' => 'p.sales_count DESC, p.id',
        'price_asc'  => 'o.min_price ASC, p.id',
        'price_desc' => 'o.min_price DESC, p.id',
        'discount'   => 'discount_pct DESC, p.sales_count DESC, p.id',
        'newest'     => 'p.release_date DESC NULLS LAST, p.id',
    ];

    /**
     * @param array{q?:string,platform?:string,region?:string,genre?:string,min_price?:int,max_price?:int,
     *              min_discount?:int,sort?:string,page?:int,per_page?:int} $f  comma-separated lists for platform/region/genre
     */
    public static function search(array $f): array
    {
        $params = [];
        $where = ['1=1'];
        $offerWhere = '';

        $in = static function (string $col, string $csv, string $prefix) use (&$params): ?string {
            $ph = [];
            foreach (array_values(array_filter(array_map('trim', explode(',', $csv)))) as $i => $v) {
                $ph[] = ":$prefix$i";
                $params["$prefix$i"] = $v;
            }
            return $ph ? "$col IN (" . implode(',', $ph) . ')' : null;
        };

        if (!empty($f['platform']) && ($c = $in('pl.slug', (string) $f['platform'], 'pf'))) $where[] = $c;
        if (!empty($f['genre']) && ($c = $in('g.slug', (string) $f['genre'], 'ge'))) $where[] = $c;
        if (!empty($f['region']) && ($c = $in('rg.code', strtoupper((string) $f['region']), 'rg'))) {
            $offerWhere = "AND vo.region_id IN (SELECT rg.id FROM regions rg WHERE $c)";
        }
        if (isset($f['min_price'])) { $where[] = 'o.min_price >= :minp'; $params['minp'] = (int) $f['min_price']; }
        if (isset($f['max_price'])) { $where[] = 'o.min_price <= :maxp'; $params['maxp'] = (int) $f['max_price']; }
        if (!empty($f['min_discount'])) { $where[] = self::DISCOUNT . ' >= :mind'; $params['mind'] = (int) $f['min_discount']; }

        // Search: substring match OR trigram similarity, so "witcher", "wit" and "wicther 3" all find The Witcher 3.
        $q = trim((string) ($f['q'] ?? ''));
        $scoreSql = '0';
        $scoreParams = [];
        if ($q !== '') {
            $params['like'] = '%' . addcslashes($q, '\\%_') . '%';
            $params['qw'] = $params['qs'] = $q;
            $where[] = '(p.name ILIKE :like OR :qw <% p.name OR p.name % :qs)';
            $scoreSql = 'GREATEST(word_similarity(:qw2, p.name), similarity(p.name, :qs2)) + CASE WHEN p.name ILIKE :like2 THEN 1 ELSE 0 END';
            $scoreParams = ['qw2' => $q, 'qs2' => $q, 'like2' => $params['like']];
        }

        $sort = $f['sort'] ?? ($q !== '' ? 'relevance' : 'popularity');
        if (!isset(self::SORTS[$sort]) || ($sort === 'relevance' && $q === '')) $sort = $q !== '' ? 'relevance' : 'popularity';

        $perPage = max(1, min(60, (int) ($f['per_page'] ?? 24)));
        $page = max(1, (int) ($f['page'] ?? 1));

        $from = "FROM products p
            JOIN platforms pl ON pl.id = p.platform_id
            LEFT JOIN genres g ON g.id = p.genre_id
            JOIN LATERAL (
                SELECT MIN(vo.price_cents) AS min_price, COUNT(*) AS offers_count
                FROM v_offers vo WHERE vo.product_id = p.id AND vo.stock > 0 $offerWhere
            ) o ON o.offers_count > 0
            WHERE " . implode(' AND ', $where);

        $total = (int) Db::scalar("SELECT COUNT(*) $from", $params);
        $rows = Db::all(
            "SELECT p.id, p.slug, p.name, p.publisher, p.release_date, p.rrp_cents, p.cover_from, p.cover_to, p.image_url,
                    pl.slug AS platform_slug, pl.name AS platform_name, g.name AS genre,
                    o.min_price AS price_cents, o.offers_count, " . self::DISCOUNT . " AS discount_pct, $scoreSql AS score
             $from ORDER BY " . self::SORTS[$sort] . " LIMIT :lim OFFSET :off",
            $params + $scoreParams + ['lim' => $perPage, 'off' => ($page - 1) * $perPage]
        );

        return [
            'items' => array_map([self::class, 'shape'], $rows),
            'total' => $total, 'page' => $page, 'per_page' => $perPage,
            'pages' => max(1, (int) ceil($total / $perPage)), 'sort' => $sort,
        ];
    }

    /** Product with every in-stock offer, cheapest first. */
    public static function find(string $slug): ?array
    {
        $row = Db::one(
            'SELECT p.*, pl.slug AS platform_slug, pl.name AS platform_name, g.name AS genre
             FROM products p JOIN platforms pl ON pl.id = p.platform_id LEFT JOIN genres g ON g.id = p.genre_id
             WHERE p.slug = :s', ['s' => $slug]);
        if (!$row) return null;

        $offers = Db::all(
            'SELECT vo.id, vo.price_cents, vo.stock, r.code AS region_code, r.name AS region_name,
                    s.id AS seller_id, s.name AS seller_name, s.rating, s.sales_count AS seller_sales
             FROM v_offers vo JOIN sellers s ON s.id = vo.seller_id JOIN regions r ON r.id = vo.region_id
             WHERE vo.product_id = :p AND vo.stock > 0 ORDER BY vo.price_cents, s.rating DESC', ['p' => $row['id']]);

        $min = $offers[0]['price_cents'] ?? null;
        $row['price_cents'] = $min;
        $row['offers_count'] = count($offers);
        $row['discount_pct'] = $min && $row['rrp_cents'] > $min ? (int) round(100 * ($row['rrp_cents'] - $min) / $row['rrp_cents']) : 0;

        return [
            'product' => self::shape($row) + ['description' => $row['description']],
            'offers' => array_map(static fn(array $o) => [
                'id' => $o['id'], 'price_cents' => $o['price_cents'], 'stock' => $o['stock'],
                'region' => ['code' => $o['region_code'], 'name' => $o['region_name']],
                'seller' => ['id' => $o['seller_id'], 'name' => $o['seller_name'], 'rating' => (float) $o['rating'], 'sales' => $o['seller_sales']],
            ], $offers),
        ];
    }

    /** Sidebar options for the store page. */
    public static function filters(): array
    {
        $stocked = 'EXISTS (SELECT 1 FROM v_offers vo WHERE vo.product_id = p.id AND vo.stock > 0)';
        return [
            'platforms' => Db::all("SELECT pl.slug, pl.name, COUNT(p.id) FILTER (WHERE $stocked) AS count FROM platforms pl LEFT JOIN products p ON p.platform_id = pl.id GROUP BY pl.id ORDER BY pl.name"),
            'genres'    => Db::all("SELECT g.slug, g.name, COUNT(p.id) FILTER (WHERE $stocked) AS count FROM genres g LEFT JOIN products p ON p.genre_id = g.id GROUP BY g.id ORDER BY g.name"),
            'regions'   => Db::all('SELECT code, name FROM regions ORDER BY id'),
            'price'     => Db::one('SELECT COALESCE(MIN(price_cents),0) AS min, COALESCE(MAX(price_cents),0) AS max FROM v_offers WHERE stock > 0'),
        ];
    }

    private static function shape(array $r): array
    {
        return [
            'id' => $r['id'], 'slug' => $r['slug'], 'name' => $r['name'], 'publisher' => $r['publisher'],
            'release_date' => $r['release_date'], 'genre' => $r['genre'],
            'platform' => ['slug' => $r['platform_slug'], 'name' => $r['platform_name']],
            'price_cents' => $r['price_cents'], 'rrp_cents' => $r['rrp_cents'],
            'discount_pct' => $r['discount_pct'], 'offers_count' => $r['offers_count'],
            'cover' => ['from' => $r['cover_from'], 'to' => $r['cover_to'], 'image_url' => $r['image_url']],
        ];
    }
}
