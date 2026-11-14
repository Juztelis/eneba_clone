import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Quote } from '../api/types';
import type { CartItem } from '../context/CartContext';

/** Server-side price check for the cart: current prices, stock and unavailable offers. */
export function useQuote(items: CartItem[]) {
  return useQuery({
    queryKey: ['quote', JSON.stringify(items)],
    queryFn: ({ signal }) => api<Quote>('/api/cart/quote', { method: 'POST', body: { items }, signal }),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  });
}
