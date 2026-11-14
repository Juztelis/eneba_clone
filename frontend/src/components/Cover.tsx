import type { Cover as CoverData } from '../api/types';

/** Generated cover (gradient + title) unless the product has real artwork. */
export function Cover({ cover, name }: { cover: CoverData; name: string }) {
  return (
    <div className="cover" style={{ background: `linear-gradient(155deg, ${cover.from ?? '#4b2799'}, ${cover.to ?? '#1a0b3d'})` }}>
      {cover.image_url ? <img src={cover.image_url} alt="" loading="lazy" /> : <span className="cover-title">{name}</span>}
    </div>
  );
}
