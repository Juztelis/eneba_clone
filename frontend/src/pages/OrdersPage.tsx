import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { OrderSummary } from '../api/types';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { date, money } from '../lib/format';

export function OrdersPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: ({ signal }) => api<{ orders: OrderSummary[] }>('/api/orders', { signal }),
  });
  if (isLoading) return <Spinner />;
  if (error) return <div className="container"><ErrorBox error={error} onRetry={() => refetch()} /></div>;

  return (
    <div className="container narrow">
      <h1>Order history</h1>
      {!data?.orders.length ? (
        <Empty title="No orders yet"><Link to="/store" className="btn btn-primary">Find your first game</Link></Empty>
      ) : (
        <ul className="order-list">
          {data.orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="order-row">
                <div>
                  <strong>Order #{o.id}</strong>
                  <div className="muted small">{date(o.created_at)} · {o.items_count} {o.items_count === 1 ? 'key' : 'keys'}</div>
                  <div className="order-names">{o.product_names}</div>
                </div>
                <span className="price">{money(o.total_cents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
