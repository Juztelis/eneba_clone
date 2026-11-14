import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ProductList } from '../api/types';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';
import { CardSkeletons, Empty, ErrorBox } from '../components/ui';
import { useFilters } from '../lib/hooks';

const SORTS: [string, string][] = [
  ['popularity', 'Best selling'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'],
  ['discount', 'Biggest discount'], ['newest', 'Newest'],
];
const FILTER_KEYS = ['q', 'platform', 'region', 'genre', 'min', 'max'];
const list = (p: URLSearchParams, k: string) => (p.get(k) ?? '').split(',').filter(Boolean);

/** Everything the visitor chooses lives in the URL, so catalogue views can be shared, bookmarked and go back/forward. */
export function StorePage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useFilters();

  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? (q ? 'relevance' : 'popularity');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const hasFilters = FILTER_KEYS.some((k) => params.has(k));

  // the API speaks cents, the URL speaks euros
  const apiQuery = new URLSearchParams(params);
  apiQuery.delete('min'); apiQuery.delete('max');
  if (params.get('min')) apiQuery.set('min_price', String(Math.round(Number(params.get('min')) * 100)));
  if (params.get('max')) apiQuery.set('max_price', String(Math.round(Number(params.get('max')) * 100)));

  const products = useQuery({
    queryKey: ['products', apiQuery.toString()],
    queryFn: ({ signal }) => api<ProductList>(`/api/products?${apiQuery}`, { signal }),
    placeholderData: keepPreviousData,
  });

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k);
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const toggle = (key: string, value: string) => {
    const cur = list(params, key);
    update({ [key]: (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]).join(',') || null });
  };
  const clearAll = () => setParams(new URLSearchParams());

  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  const data = products.data;
  return (
    <div className="container store">
      <aside className={`filters${filtersOpen ? ' open' : ''}`} aria-label="Filters">
        <div className="filters-head">
          <h2>Filters</h2>
          {hasFilters && <button className="link-btn" onClick={clearAll}>Clear all</button>}
        </div>
        {filters.data && (
          <>
            <Facet title="Platform" options={filters.data.platforms} selected={list(params, 'platform')} onToggle={(v) => toggle('platform', v)} />
            <Facet title="Region" options={filters.data.regions.map((r) => ({ slug: r.code, name: r.name }))} selected={list(params, 'region')} onToggle={(v) => toggle('region', v)} />
            <Facet title="Genre" options={filters.data.genres} selected={list(params, 'genre')} onToggle={(v) => toggle('genre', v)} />
          </>
        )}
        <PriceFilter min={params.get('min') ?? ''} max={params.get('max') ?? ''} onApply={(min, max) => update({ min: min || null, max: max || null })} />
      </aside>

      <section className="results" aria-live="polite">
        <div className="results-head">
          <div>
            <h1>{q ? <>Results for “{q}”</> : 'All games'}</h1>
            <p className="muted">{data ? `${data.total} ${data.total === 1 ? 'game' : 'games'}` : 'Loading…'}</p>
          </div>
          <div className="results-tools">
            <button className="btn btn-ghost btn-sm filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>Filters</button>
            <label className="sort">
              <span className="muted">Sort by</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
                {q && <option value="relevance">Best match</option>}
                {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {products.error && <ErrorBox error={products.error} onRetry={() => products.refetch()} />}
        <div className={`grid${products.isPlaceholderData ? ' stale' : ''}`}>
          {products.isLoading && <CardSkeletons n={8} />}
          {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {data && !data.items.length && (
          <Empty title={q ? `No games found for “${q}”` : 'No games match these filters'}>
            Check the spelling or remove some filters. <button className="link-btn" onClick={clearAll}>Clear all filters</button>
          </Empty>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={(n) => update({ page: n > 1 ? String(n) : null })} />}
      </section>
    </div>
  );
}

function Facet({ title, options, selected, onToggle }: {
  title: string; options: { slug: string; name: string; count?: number }[]; selected: string[]; onToggle: (slug: string) => void;
}) {
  return (
    <fieldset className="facet">
      <legend>{title}</legend>
      {options.map((o) => (
        <label key={o.slug} className="check">
          <input type="checkbox" checked={selected.includes(o.slug)} onChange={() => onToggle(o.slug)} />
          <span>{o.name}</span>
          {o.count !== undefined && <small className="muted">{o.count}</small>}
        </label>
      ))}
    </fieldset>
  );
}

function PriceFilter({ min, max, onApply }: { min: string; max: string; onApply: (min: string, max: string) => void }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  useEffect(() => { setLo(min); setHi(max); }, [min, max]);
  const submit = (e: FormEvent) => { e.preventDefault(); onApply(lo, hi); };
  return (
    <form className="facet" onSubmit={submit}>
      <legend>Price (€)</legend>
      <div className="price-inputs">
        <input type="number" min="0" step="1" inputMode="decimal" placeholder="Min" aria-label="Minimum price in euros" value={lo} onChange={(e) => setLo(e.target.value)} />
        <span aria-hidden="true">–</span>
        <input type="number" min="0" step="1" inputMode="decimal" placeholder="Max" aria-label="Maximum price in euros" value={hi} onChange={(e) => setHi(e.target.value)} />
      </div>
      <button className="btn btn-ghost btn-sm" type="submit">Apply</button>
    </form>
  );
}
