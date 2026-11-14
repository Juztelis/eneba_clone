import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../lib/hooks';

/** Horizontal product row with back/forward buttons. The buttons reflect the real scroll position. */
export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ canPrev: false, canNext: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const canPrev = el.scrollLeft > 4;
    const canNext = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge((e) => (e.canPrev === canPrev && e.canNext === canNext ? e : { canPrev, canNext }));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [update]);
  useEffect(update);   // content may change between renders; setEdge bails out when nothing changed

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const scrollable = edge.canPrev || edge.canNext;
  return (
    <div className="carousel">
      {scrollable && <button className="carousel-btn prev" aria-label={`Previous ${label}`} disabled={!edge.canPrev} onClick={() => scroll(-1)}>‹</button>}
      <div className="carousel-track" ref={track} role="list" aria-label={label}>{children}</div>
      {scrollable && <button className="carousel-btn next" aria-label={`Next ${label}`} disabled={!edge.canNext} onClick={() => scroll(1)}>›</button>}
    </div>
  );
}
