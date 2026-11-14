import { Link } from 'react-router-dom';
import type { ProductCardData } from '../api/types';
import { Carousel } from '../components/Carousel';
import { ProductCard } from '../components/ProductCard';
import { CardSkeletons, ErrorBox } from '../components/ui';
import { useBlockItems, type BlockProps } from './useBlockItems';

export function ProductCarousel({ block }: BlockProps) {
  const { data, isLoading, error, refetch } = useBlockItems<ProductCardData>(block);
  return (
    <section className="block">
      <div className="block-head">
        <h2>{block.title}</h2>
        {block.link_url && <Link to={block.link_url} className="see-all">See all</Link>}
      </div>
      {isLoading && <div className="carousel-track"><CardSkeletons n={6} /></div>}
      {error && <ErrorBox error={error} onRetry={() => refetch()} />}
      {data && data.length > 0 && (
        <Carousel label={block.title ?? 'Products'}>
          {data.map((p) => <div className="carousel-item" role="listitem" key={p.id}><ProductCard product={p} /></div>)}
        </Carousel>
      )}
    </section>
  );
}
