import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Banner } from '../api/types';
import { ErrorBox } from '../components/ui';
import { prefersReducedMotion } from '../lib/hooks';
import { useBlockItems, type BlockProps } from './useBlockItems';

export function HeroBanner({ block }: BlockProps) {
  const { data, isLoading, error, refetch } = useBlockItems<Banner>(block);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = data?.length ?? 0;

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (isLoading) return <div className="hero skeleton" aria-hidden="true" />;
  if (error) return <ErrorBox error={error} onRetry={() => refetch()} />;
  if (!data?.length) return null;

  const b = data[index % count];
  return (
    <section
      className="hero" aria-roledescription="carousel" aria-label="Featured offers"
      style={{ background: `linear-gradient(110deg, ${b.cover.from ?? '#4b2799'}, ${b.cover.to ?? '#1a0b3d'})` }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      <div className="hero-copy" aria-live={paused ? 'polite' : 'off'}>
        <h1>{b.title}</h1>
        {b.subtitle && <p>{b.subtitle}</p>}
        <Link to={b.cta_url} className="btn btn-primary btn-lg">{b.cta_label}</Link>
      </div>
      {count > 1 && (
        <div className="hero-dots">
          {data.map((x, i) => (
            <button key={x.id} className={i === index % count ? 'on' : ''} aria-label={`Show banner ${i + 1}: ${x.title}`}
              aria-current={i === index % count} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </section>
  );
}
