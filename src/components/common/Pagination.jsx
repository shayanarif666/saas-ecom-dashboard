import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatNumber } from '../../utils/helpers';

/**
 * Reusable server-side pagination footer for Dashboard tables.
 *
 * @param {number} page — current 1-based page
 * @param {number} totalPages
 * @param {number} [total] — total item count
 * @param {number} [limit] — page size
 * @param {(page: number) => void} onPageChange
 * @param {string} [itemLabel] — e.g. "products"
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  total,
  limit,
  onPageChange,
  itemLabel = 'items',
  className,
}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeTotalPages = Math.max(0, Number(totalPages) || 0);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const safeTotal = total != null ? Number(total) : null;

  if (safeTotal === 0) return null;
  if (safeTotal == null && safeTotalPages <= 1) return null;

  const from = safeTotal === 0 ? 0 : (safePage - 1) * safeLimit + 1;
  const to =
    safeTotal == null
      ? safePage * safeLimit
      : Math.min(safePage * safeLimit, safeTotal);

  const showControls = safeTotalPages > 1;
  const pages = showControls ? buildPageWindow(safePage, safeTotalPages) : [];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-xs text-text-secondary">
        {safeTotal != null ? (
          <>
            Showing <span className="font-semibold text-text-primary">{from}</span>
            {' '}to{' '}
            <span className="font-semibold text-text-primary">{to}</span>
            {' '}of{' '}
            <span className="font-semibold text-text-primary">
              {formatNumber(safeTotal)}
            </span>{' '}
            {itemLabel}
          </>
        ) : (
          <>
            Page{' '}
            <span className="font-semibold text-text-primary">{safePage}</span>
            {' '}of{' '}
            <span className="font-semibold text-text-primary">{safeTotalPages}</span>
          </>
        )}
      </p>

      {showControls ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange?.(safePage - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-lavender-soft disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          {pages.map((p, idx) =>
            p === '…' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-xs text-text-secondary"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange?.(p)}
                aria-current={p === safePage ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2.5 text-xs font-semibold transition',
                  p === safePage
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-surface text-primary hover:bg-lavender-soft'
                )}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            disabled={safePage >= safeTotalPages}
            onClick={() => onPageChange?.(safePage + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-lavender-soft disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildPageWindow(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1, page - 2, page + 2]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

export const DEFAULT_PAGE_SIZE = 10;
