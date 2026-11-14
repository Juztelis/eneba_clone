import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ProductCardData } from '../api/types';
import { money } from '../lib/format';
import { useDebounced } from '../lib/hooks';

/** Header search: live, typo-tolerant suggestions (served by the backend); Enter opens the full result list in the store. */
export function SearchBox() {
  const nav = useNavigate();
  const loc = useLocation();
  const listId = useId();
  const urlQ = loc.pathname === '/store' ? new URLSearchParams(loc.search).get('q') ?? '' : '';
  const [value, setValue] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = useDebounced(value.trim(), 200);

  useEffect(() => { setValue(urlQ); }, [urlQ]);   // keep the box in sync with the URL
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.search]);

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', term],
    queryFn: ({ signal }) => api<{ items: ProductCardData[] }>(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal }),
    enabled: term.length >= 2, staleTime: 30_000,
  });
  const items = term.length >= 2 ? data?.items ?? [] : [];

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const q = value.trim();
    setOpen(false);
    nav(q ? `/store?q=${encodeURIComponent(q)}` : '/store');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter' && open && active >= 0 && items[active]) { e.preventDefault(); setOpen(false); nav(`/product/${items[active].slug}`); }
  };

  return (
    <form className="search" role="search" onSubmit={submit}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <input
        type="search" placeholder="Search games, e.g. Witcher, Zelda, FC…" aria-label="Search products"
        value={value} autoComplete="off"
        role="combobox" aria-expanded={open && term.length >= 2} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)} onKeyDown={onKey}
      />
      <button type="submit" className="search-btn" aria-label="Search">⌕</button>
      {open && term.length >= 2 && (
        <ul className="suggest" id={listId} role="listbox">
          {items.map((p, i) => (
            <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a href={`/product/${p.slug}`} className={i === active ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); setOpen(false); nav(`/product/${p.slug}`); }}>
                <span className="suggest-name">{p.name}<small>{p.platform.name}</small></span>
                {p.price_cents !== null && <span className="price">{money(p.price_cents)}</span>}
              </a>
            </li>
          ))}
          {!items.length && <li className="suggest-empty" role="presentation">{isFetching ? 'Searching…' : `No games found for “${term}”`}</li>}
          {!!items.length && <li role="presentation"><button type="submit" className="suggest-all">See all results for “{term}”</button></li>}
        </ul>
      )}
    </form>
  );
}
