import { Link } from 'react-router-dom';
import type { ProductCardData } from '../api/types';
import { money } from '../lib/format';
import { Cover } from './Cover';

export function ProductCard({ product: p }: { product: ProductCardData }) {
  return (
    <Link to={`/product/${p.slug}`} className="card">
      <Cover cover={p.cover} name={p.name} />
      <div className="card-body">
        <div className="card-platform">{p.platform.name}</div>
        <h3 className="card-title">{p.name}</h3>
        <div className="card-price">
          {p.price_cents !== null && (
            <>
              <span className="muted">From</span> <span className="price">{money(p.price_cents)}</span>
              {p.discount_pct > 0 && <s className="rrp">{money(p.rrp_cents)}</s>}
            </>
          )}
        </div>
        {p.discount_pct > 0 && <span className="badge-off">-{p.discount_pct}%</span>}
        <div className="card-meta">{p.offers_count} {p.offers_count === 1 ? 'offer' : 'offers'}</div>
      </div>
    </Link>
  );
}
