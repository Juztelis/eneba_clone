interface Props { page: number; pages: number; onChange: (page: number) => void }

export function Pagination({ page, pages, onChange }: Props) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      {nums.map((n, i) => (
        <span key={n} className="pagination-item">
          {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden="true">…</span>}
          <button className={`page-btn${n === page ? ' on' : ''}`} aria-current={n === page ? 'page' : undefined}
            aria-label={`Page ${n}`} onClick={() => onChange(n)}>{n}</button>
        </span>
      ))}
      <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
