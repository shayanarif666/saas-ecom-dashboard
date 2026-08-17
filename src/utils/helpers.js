import clsx from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatCurrency(amount, currency = 'PKR') {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function formatNumber(n) {
  return new Intl.NumberFormat('en-PK').format(Number(n) || 0);
}

/** Unwrap Backend envelope `{ success, message, data }` (or axios-shaped bodies). */
export function unwrap(res) {
  if (res == null) return {};
  if (res.data !== undefined && (res.success !== undefined || res.message !== undefined)) {
    return res.data ?? {};
  }
  if (res.data !== undefined && typeof res.data === 'object' && !Array.isArray(res.data)) {
    // Prefer nested `data` when it looks like an API envelope
    if (res.data.success !== undefined || res.data.message !== undefined) {
      return res.data.data ?? {};
    }
    return res.data;
  }
  if (res.data !== undefined) return res.data;
  return res;
}

/** Normalize list payloads whether API returns an array or nested collection keys */
export function asList(
  res,
  keys = [
    'items',
    'products',
    'orders',
    'discounts',
    'categories',
    'reviews',
    'refunds',
    'transactions',
  ]
) {
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

/**
 * Read pagination meta from API envelope `{ success, data, meta }`.
 * `apiClient` responses are already unwrapped to that body via `.then(r => r.data)`.
 */
export function getListMeta(res, fallback = {}) {
  const meta = res?.meta || {};
  const page = Number(meta.page) || fallback.page || 1;
  const limit = Number(meta.limit) || fallback.limit || 10;
  const total = Number(meta.total ?? fallback.total ?? 0);
  const totalPages =
    Number(meta.totalPages) ||
    (limit > 0 ? Math.ceil(total / limit) : 0) ||
    fallback.totalPages ||
    0;

  return { page, limit, total, totalPages };
}

/** Human-readable API / network error for toasts */
export function getApiError(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  if (!err.response) return err.message || fallback;
  const body = err.response.data;
  if (body?.errors?.length) {
    const first = body.errors[0];
    return first.message || first.field || body.message || fallback;
  }
  return body?.message || err.message || fallback;
}

export function initials(name = '') {
  return (
    String(name)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function getNextStatuses(current) {
  const map = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery', 'delivered', 'cancelled'],
    out_for_delivery: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };
  return map[current] || [];
}
