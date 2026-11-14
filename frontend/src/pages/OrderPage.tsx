import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Order, OrderItem } from '../api/types';
import { Cover } from '../components/Cover';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { date, money } from '../lib/format';

export function OrderPage() {
  const { id = '' } = useParams();
  const purchased = Boolean((useLocation().state as { purchased?: boolean } | null)?.purchased);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', id],
    queryFn: ({ signal }) => api<{ order: Order }>(`/api/orders/${id}`, { signal }),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });

  if (isLoading) return <Spinner />;
  if (error instanceof ApiError && error.status === 404) return <div className="container"><Empty title="Order not found"><Link to="/orders">Back to your orders</Link></Empty></div>;
  if (error || !data) return <div className="container"><ErrorBox error={error} onRetry={() => refetch()} /></div>;

  const o = data.order;
  return (
    <div className="container narrow">
      {purchased && <div className="notice notice-ok" role="status"><strong>Payment successful.</strong> Your keys are below. They are also saved in your order history.</div>}
      <h1>Order #{o.id}</h1>
      <p className="muted">{date(o.created_at)} · Total {money(o.total_cents)}{o.card_last4 && ` · Card ending ${o.card_last4}`}</p>
      <ul className="key-list">
        {o.items.map((it) => <KeyRow key={it.id} item={it} initiallyShown={purchased} />)}
      </ul>
    </div>
  );
}

function KeyRow({ item, initiallyShown }: { item: OrderItem; initiallyShown: boolean }) {
  const [shown, setShown] = useState(initiallyShown);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(item.key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setShown(true); }
  };
  return (
    <li className="key-row">
      <div className="cart-cover"><Cover cover={item.product.cover} name={item.product.name} /></div>
      <div className="key-info">
        <Link to={`/product/${item.product.slug}`}><strong>{item.product.name}</strong></Link>
        <div className="muted small">{item.product.platform} · {item.region} · sold by {item.seller} · {money(item.unit_price_cents)}</div>
        <code className="key" aria-label={shown ? `Key ${item.key}` : 'Hidden key'}>{shown ? item.key : '•••••-•••••-•••••'}</code>
      </div>
      <div className="key-actions">
        <button className="btn btn-ghost btn-sm" aria-pressed={shown} onClick={() => setShown((s) => !s)}>{shown ? 'Hide' : 'Reveal'}</button>
        <button className="btn btn-primary btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </li>
  );
}
