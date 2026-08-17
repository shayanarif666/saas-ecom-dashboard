import { cn } from '../../utils/helpers';

const statusMap = {
  pending: 'bg-orange-50 text-orange-600',
  processing: 'bg-sky-50 text-sky-600',
  shipped: 'bg-violet-50 text-brand',
  out_for_delivery: 'bg-indigo-50 text-indigo-600',
  delivered: 'bg-emerald-50 text-emerald-600',
  completed: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-rose-50 text-rose-600',
  refunded: 'bg-rose-50 text-rose-600',
  paid: 'bg-emerald-50 text-emerald-600',
  success: 'bg-emerald-50 text-emerald-600',
  failed: 'bg-rose-50 text-rose-600',
  active: 'bg-emerald-50 text-emerald-600',
  trial: 'bg-violet-50 text-brand',
  low: 'bg-amber-50 text-amber-600',
  percentage: 'bg-violet-50 text-brand',
  fixed: 'bg-sky-50 text-sky-600',
  // Payment methods
  jazzcash: 'bg-red-50 text-red-600',
  easypaisa: 'bg-emerald-50 text-emerald-700',
  cod: 'bg-blue-50 text-blue-600',
};

const LABEL_OVERRIDES = {
  delivered: 'Completed',
  paid: 'Completed',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  cod: 'Cash on Delivery',
};

export default function Badge({ children, status, className, withDot }) {
  const raw = children || status;
  const label = LABEL_OVERRIDES[raw] || raw;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        statusMap[status] || statusMap[raw] || 'bg-lavender text-text-secondary',
        className
      )}
    >
      {withDot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {label}
    </span>
  );
}
