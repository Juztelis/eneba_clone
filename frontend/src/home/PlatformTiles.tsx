import { Link } from 'react-router-dom';
import type { PlatformTile } from '../api/types';
import { ErrorBox } from '../components/ui';
import { useBlockItems, type BlockProps } from './useBlockItems';

export function PlatformTiles({ block }: BlockProps) {
  const { data, isLoading, error, refetch } = useBlockItems<PlatformTile>(block);
  return (
    <section className="block">
      {block.title && <div className="block-head"><h2>{block.title}</h2></div>}
      {isLoading && <div className="tiles" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="tile skeleton" />)}</div>}
      {error && <ErrorBox error={error} onRetry={() => refetch()} />}
      {data && (
        <div className="tiles">
          {data.map((p) => (
            <Link key={p.slug} to={p.link_url} className="tile">
              <strong>{p.name}</strong>
              <span className="muted">{p.count} {p.count === 1 ? 'game' : 'games'}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
