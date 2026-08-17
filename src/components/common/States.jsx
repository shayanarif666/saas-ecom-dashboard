import { cn } from '../../utils/helpers';

export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className, title, description, action, padded = true }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface shadow-card', className)}>
      {(title || action || description) && (
        <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-bold text-primary">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padded ? 'p-5' : '')}>{children}</div>
    </section>
  );
}

export function StatCard({ title, value, change, icon: Icon, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-lavender text-brand',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('rounded-xl p-2.5', tones[tone] || tones.neutral)}>
          {Icon ? <Icon className="h-5 w-5" strokeWidth={1.75} /> : null}
        </div>
        {change != null && change !== '' ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              String(change).toLowerCase().includes('static')
                ? 'bg-slate-100 text-slate-500'
                : 'bg-emerald-50 text-emerald-600'
            )}
          >
            {change}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-xs font-medium text-text-secondary">{title}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-primary">{value}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-lavender-soft px-6 py-14 text-center">
      <p className="text-base font-bold text-primary">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-rose-50 p-6 text-center">
      <p className="text-sm font-medium text-danger">{message || 'Something went wrong'}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-brand hover:underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-xl bg-lavender', className)} />;
}
