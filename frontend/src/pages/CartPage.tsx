import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { MAX_QTY, useCart } from '../context/CartContext';
import { money } from '../lib/format';
import { useQuote } from '../lib/useQuote';

export function CartPage() {
  const { items, setQty, remove } = useCart();
  const quote = useQuote(items);
  const [changed, setChanged] = useState(false);

  // keep the cart honest: drop sold-out offers and clamp quantities to what the server says is in stock
  useEffect(() => {
    const q = quote.data;
    if (!q || quote.isPlaceholderData) return;
    let touched = false;
    q.unavailable.forEach((id) => { remove(id); touched = true; });
    q.lines.forEach((l) => {
      const cur = items.find((i) => i.offer_id === l.offer_id);
      if (cur && cur.qty > l.qty) { setQty(l.offer_id, l.qty); touched = true; }
    });
    if (touched) setChanged(true);
  }, [quote.data, quote.isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items.length) {
    return <div className="container"><Empty title="Your cart is empty"><Link to="/store" className="btn btn-primary">Browse games</Link></Empty></div>;
  }
  if (quote.isLoading) return <Spinner />;
  if (quote.error && !quote.data) return <div className="container"><ErrorBox error={quote.error} onRetry={() => quote.refetch()} /></div>;

  const q = quote.data;
  return (
    <div className="container cart">
      <h1>Cart</h1>
      {changed && <div className="notice" role="status">Some items were sold out or had fewer keys left, so we updated your cart.</div>}
      <div className="cart-layout">
        <ul className="cart-lines">
          {q?.lines.map((l) => (
            <li key={l.offer_id} className="cart-line">
              <div className="cart-cover"><Cover cover={l.product.cover} name={l.product.name} /></div>
              <div className="cart-info">
                <Link to={`/product/${l.product.slug}`}><strong>{l.product.name}</strong></Link>
                <div className="muted small">{l.product.platform} · {l.region} · sold by {l.seller}</div>
                <button className="link-btn small" onClick={() => remove(l.offer_id)}>Remove</button>
              </div>
              <div className="qty" role="group" aria-label={`Quantity for ${l.product.name}`}>
                <button aria-label="Decrease quantity" disabled={l.qty <= 1} onClick={() => setQty(l.offer_id, l.qty - 1)}>−</button>
                <output>{l.qty}</output>
                <button aria-label="Increase quantity" disabled={l.qty >= Math.min(l.stock, MAX_QTY)} onClick={() => setQty(l.offer_id, l.qty + 1)}>+</button>
              </div>
              <div className="price line-total">{money(l.unit_price_cents * l.qty)}</div>
            </li>
          ))}
        </ul>
        <aside className="summary" aria-label="Order summary">
          <h2>Summary</h2>
          <div className="summary-row"><span>Total</span><span className="price price-lg">{money(q?.total_cents ?? 0)}</span></div>
          <Link to="/checkout" className="btn btn-primary btn-lg btn-block">Go to checkout</Link>
          <p className="muted small">You will be asked to sign in before paying. Keys appear in your order history right after payment.</p>
        </aside>
      </div>
    </div>
  );
}
