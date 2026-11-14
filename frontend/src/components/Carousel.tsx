import { useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from '../lib/hooks';

export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  return (
    <div className="carousel">
      <button className="carousel-btn prev" aria-label={`Scroll ${label} left`} onClick={() => scroll(-1)}>‹</button>
      <div className="carousel-track" ref={track} role="list" aria-label={label}>{children}</div>
      <button className="carousel-btn next" aria-label={`Scroll ${label} right`} onClick={() => scroll(1)}>›</button>
    </div>
  );
}
