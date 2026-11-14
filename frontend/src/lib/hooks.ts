import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Filters } from '../api/types';

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Platforms, genres, regions and price bounds. Shared by the header nav and the store sidebar. */
export function useFilters() {
  return useQuery({ queryKey: ['filters'], queryFn: ({ signal }) => api<Filters>('/api/filters', { signal }), staleTime: 5 * 60_000 });
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
