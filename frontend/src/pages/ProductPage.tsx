import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Offer, ProductDetail } from '../api/types';
import { Cover } from '../components/Cover';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { date, money } from '../lib/format';

type OfferSort = 'price' | 'rating';

export function ProductPage() {
  const { slug = '' } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const [region, setRegion] = useState('ALL');
  const [sort, setSort] = useState<OfferSort>('price');
  const [announce, setAnnounce] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: ({ signal }) => api<ProductDetail>(`/api/products/${slug}`, { signal }),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });

  const offers = useMemo<Offer[]>(() => {
    const all = (data?.offers ?? []).filter((o) => region === 'ALL' || o.region.code === region);
    return [...all].sort((a, b) => (sort === 'price' ? a.price_cents - b.price_cents : b.seller.rating - a.seller.rating || a.price_cents - b.price_cents));
  }, [data, region, sort]);

  if (isLoading) return <Spinner />;
  if (error instanceof ApiError && error.status === 404) return <div className="container"><Empty title="Game not found"><Link to="/store">Back to the store</Link></Empty></div>;
  if (error || !data) return <div className="container"><ErrorBox error={error} onRetry={() => refetch()} /></div>;

  const { product: p } = data;
  const best = data.offers[0];
  const regions = [...new Map(data.offers.map((o) => [o.region.code, o.region.name])).entries()];

  const addToCart = (o: Offer) => { cart.add(o.id); setAnnounce(`${p.name} from ${o.seller.name} added to cart`); };
  const buyNow = (o: Offer) => { if (!cart.has(o.id)) cart.add(o.id); nav('/checkout'); };

  return (
    <div className="container product">
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/store">Store</Link> / <Link to={`/store?platform=${p.platform.slug}`}>{p.platform.name}</Link> / <span>{p.name}</span></nav>

      <div className="product-head">
        <div className="product-cover"><Cover cover={p.cover} name={p.name} /></div>
        <div className="product-info">
          <h1>{p.name}</h1>
          <dl className="facts">
            <div><dt>Platform</dt><dd>{p.platform.name}</dd></div>
            {p.genre && <div><dt>Genre</dt><dd>{p.genre}</dd></div>}
            {p.publisher && <div><dt>Publisher</dt><dd>{p.publisher}</dd></div>}
            {p.release_date && <div><dt>Release</dt><dd>{date(p.release_date)}</dd></div>}
          </dl>
          {best ? (
            <div className="buybox">
              <div className="buybox-price">
                <span className="muted">Best price</span>
                <span className="price price-lg">{money(best.price_cents)}</span>
                {p.discount_pct > 0 && <><s className="rrp">{money(p.rrp_cents)}</s><span className="badge-off">-{p.discount_pct}%</span></>}
              </div>
              <div className="buybox-actions">
                <button className="btn btn-primary btn-lg" onClick={() => buyNow(best)}>Buy now</button>
                <button className="btn btn-ghost btn-lg" onClick={() => addToCart(best)}>Add to cart</button>
              </div>
              <p className="muted">Sold by {best.seller.name}. Digital key delivered instantly after payment.</p>
            </div>
          ) : <div className="notice">This game is out of stock right now.</div>}
          {p.description && <p className="description">{p.description}</p>}
        </div>
      </div>

      <section className="offers" aria-labelledby="offers-h">
        <div className="offers-head">
          <h2 id="offers-h">{data.offers.length} {data.offers.length === 1 ? 'offer' : 'offers'} from sellers</h2>
          <div className="offers-tools">
            <div className="chips" role="group" aria-label="Filter offers by region">
              {[['ALL', 'All regions'], ...regions].map(([code, name]) => (
                <button key={code} className={`chip${region === code ? ' on' : ''}`} aria-pressed={region === code} onClick={() => setRegion(code)}>{name}</button>
              ))}
            </div>
            <label className="sort"><span className="muted">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as OfferSort)}>
                <option value="price">Lowest price</option><option value="rating">Seller rating</option>
              </select>
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table className="offers-table">
            <thead><tr><th>Seller</th><th>Region</th><th>Availability</th><th className="num">Price</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className={o.id === best?.id ? 'best' : ''}>
                  <td>
                    <strong>{o.seller.name}</strong>
                    <div className="muted small">★ {o.seller.rating.toFixed(1)} · {o.seller.sales.toLocaleString('en-GB')} sales</div>
                  </td>
                  <td>{o.region.name}</td>
                  <td>{o.stock <= 3 ? <span className="low">Only {o.stock} left</span> : `${o.stock} in stock`}</td>
                  <td className="num"><span className="price">{money(o.price_cents)}</span>{o.id === best?.id && <span className="badge-best">Best price</span>}</td>
                  <td className="actions">
                    <button className="btn btn-primary btn-sm" onClick={() => buyNow(o)}>Buy</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => addToCart(o)}>{cart.has(o.id) ? 'Add another' : 'Add to cart'}</button>
                  </td>
                </tr>
              ))}
              {!offers.length && <tr><td colSpan={5} className="muted">No offers for this region.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <output className="sr-only" aria-live="polite">{announce}</output>
    </div>
  );
}
