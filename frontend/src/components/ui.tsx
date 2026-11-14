import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="spinner" role="status" aria-label={label} />;
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <span>{error instanceof Error ? error.message : 'Something went wrong'}</span>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export function CardSkeletons({ n = 6 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div className="card card-skeleton" key={i} aria-hidden="true">
          <div className="cover skeleton" />
          <div className="card-body"><div className="skeleton line" /><div className="skeleton line short" /></div>
        </div>
      ))}
    </>
  );
}
