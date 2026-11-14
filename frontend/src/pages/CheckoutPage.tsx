import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Order } from '../api/types';
import { ErrorBox, Spinner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { money } from '../lib/format';
import { useQuote } from '../lib/useQuote';

const groupCard = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExp = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

export function CheckoutPage() {
  const { items, clear } = useCart();
  const nav = useNavigate();
  const qc = useQueryClient();
  const quote = useQuote(items);
  const placed = useRef(false);
  const [form, setForm] = useState({ number: '', exp: '', cvc: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pay = useMutation({
    mutationFn: () => {
      const [mm = '', yy = ''] = form.exp.split('/');
      return api<{ order: Order }>('/api/checkout', {
        method: 'POST',
        body: { items, payment: { number: form.number, exp_month: Number(mm), exp_year: 2000 + Number(yy), cvc: form.cvc } },
      });
    },
    onMutate: () => setFieldErrors({}),
    onSuccess: ({ order }) => {
      placed.current = true;   // stops the "cart is empty" redirect below from racing the navigation
      clear();
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['product'] });
      nav(`/orders/${order.id}`, { replace: true, state: { purchased: true } });
    },
    onError: (e) => { if (e instanceof ApiError) setFieldErrors(e.fields); },
  });

  if (!items.length && !placed.current) return <Navigate to="/cart" replace />;
  if (quote.isLoading) return <Spinner />;

  const set = (k: keyof typeof form, fmt: (v: string) => string = (v) => v) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: fmt(e.target.value) }));
  const submit = (e: FormEvent) => { e.preventDefault(); pay.mutate(); };
  const q = quote.data;
  const stockProblem = q && (q.unavailable.length > 0 || q.lines.some((l) => l.qty < l.requested_qty));
  const bannerError = pay.error instanceof ApiError && !Object.keys(pay.error.fields).length ? pay.error.message : null;

  return (
    <div className="container checkout">
      <h1>Checkout</h1>
      <div className="cart-layout">
        <form className="pay" onSubmit={submit} noValidate>
          <h2>Payment</h2>
          <div className="notice">
            <strong>Test mode.</strong> No real money is charged. Use <code>4242 4242 4242 4242</code>, any future date and any CVC.
            <code>4000 0000 0000 0002</code> simulates a declined card.
          </div>
          {stockProblem && <div className="notice notice-error" role="alert">Some items are no longer available in your cart. <Link to="/cart">Review your cart</Link></div>}
          {bannerError && <div className="notice notice-error" role="alert">{bannerError}{pay.error instanceof ApiError && pay.error.status === 409 && <> <Link to="/cart">Review your cart</Link></>}</div>}
          {pay.error && !(pay.error instanceof ApiError) && <ErrorBox error={pay.error} />}

          <Field id="cc-number" label="Card number" error={fieldErrors.card_number}>
            <input id="cc-number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={form.number} onChange={set('number', groupCard)} aria-invalid={!!fieldErrors.card_number} />
          </Field>
          <div className="row2">
            <Field id="cc-exp" label="Expiry (MM/YY)" error={fieldErrors.expiry}>
              <input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={form.exp} onChange={set('exp', formatExp)} aria-invalid={!!fieldErrors.expiry} />
            </Field>
            <Field id="cc-cvc" label="CVC" error={fieldErrors.cvc}>
              <input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} value={form.cvc} onChange={set('cvc', (v) => v.replace(/\D/g, ''))} aria-invalid={!!fieldErrors.cvc} />
            </Field>
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={pay.isPending || !q || !!stockProblem}>
            {pay.isPending ? 'Processing payment…' : `Pay ${money(q?.total_cents ?? 0)}`}
          </button>
        </form>

        <aside className="summary" aria-label="Order summary">
          <h2>Your order</h2>
          <ul className="mini-lines">
            {q?.lines.map((l) => (
              <li key={l.offer_id}><span>{l.qty} × {l.product.name}<small className="muted"> {l.region}</small></span><span className="price">{money(l.unit_price_cents * l.qty)}</span></li>
            ))}
          </ul>
          <div className="summary-row"><span>Total</span><span className="price price-lg">{money(q?.total_cents ?? 0)}</span></div>
        </aside>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
