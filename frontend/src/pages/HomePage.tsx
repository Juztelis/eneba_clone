import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { HomeBlockMeta } from '../api/types';
import { ErrorBox, Spinner } from '../components/ui';
import { blockRegistry } from '../home/registry';

/** The page is assembled from whatever layout the backend returns. Nothing about its content lives here. */
export function HomePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home-layout'],
    queryFn: ({ signal }) => api<{ blocks: HomeBlockMeta[] }>('/api/home/layout', { signal }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="container"><ErrorBox error={error} onRetry={() => refetch()} /></div>;

  return (
    <div className="container home">
      {data?.blocks.map((b) => {
        const Block = blockRegistry[b.type];
        return Block ? <Block key={b.id} block={b} /> : null;
      })}
    </div>
  );
}
