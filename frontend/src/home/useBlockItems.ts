import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { HomeBlockMeta } from '../api/types';

export interface BlockProps { block: HomeBlockMeta }

/** Each block loads its own data from the URL the backend gave it, so one slow or failing block never blocks the rest. */
export function useBlockItems<T>(block: HomeBlockMeta) {
  return useQuery({
    queryKey: ['home-block', block.data_url],
    queryFn: ({ signal }) => api<{ items: T[] }>(block.data_url, { signal }).then((r) => r.items),
    staleTime: 60_000,
  });
}
