import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CartItem { offer_id: number; qty: number }
const KEY = 'keyhub.cart';
export const MAX_QTY = 10;

interface CartState {
  items: CartItem[];
  count: number;
  has: (offerId: number) => boolean;
  add: (offerId: number) => void;
  setQty: (offerId: number, qty: number) => void;
  remove: (offerId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);

function load(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((i) => Number.isInteger(i?.offer_id) && Number.isInteger(i?.qty) && i.qty > 0) : [];
  } catch { return []; }
}

/** The cart only remembers offer ids and quantities. Prices always come from the server (POST /api/cart/quote). */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } }, [items]);

  const add = useCallback((id: number) => setItems((cur) =>
    cur.some((i) => i.offer_id === id)
      ? cur.map((i) => (i.offer_id === id ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i))
      : [...cur, { offer_id: id, qty: 1 }]), []);
  const setQty = useCallback((id: number, qty: number) => setItems((cur) =>
    qty < 1 ? cur.filter((i) => i.offer_id !== id) : cur.map((i) => (i.offer_id === id ? { ...i, qty: Math.min(MAX_QTY, qty) } : i))), []);
  const remove = useCallback((id: number) => setItems((cur) => cur.filter((i) => i.offer_id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => ({
    items, add, setQty, remove, clear,
    count: items.reduce((n, i) => n + i.qty, 0),
    has: (id) => items.some((i) => i.offer_id === id),
  }), [items, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
