/**
 * Resolve API base URL. Must be an absolute Backend URL (http/https).
 * A bare domain like "duabookpalace.com" is a store domain, not the API —
 * using it as VITE_API_URL makes requests hit Vite (404) instead of Express.
 */
function resolveApiUrl(raw) {
  const fallback = 'http://localhost:5000/api/v1';
  const value = String(raw || '').trim().replace(/\/$/, '');
  if (!value) return fallback;
  if (!/^https?:\/\//i.test(value)) {
    console.warn(
      `[Dashboard] VITE_API_URL must be an absolute API URL (got "${value}"). Falling back to ${fallback}.`
    );
    return fallback;
  }
  return value;
}

export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);

/** When true, Dashboard runs offline with mock data. Default: live Backend. */
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE || 'false').toLowerCase() === 'true';

export const BRAND = {
  name: 'BookVerse',
  tagline: 'Management Console',
};

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMINISTRATOR: 'administrator',
  CUSTOMER: 'customer',
};

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ORDER_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on delivery' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
];

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export const CHART_RANGES = [
  { value: 7, label: 'Last 7 Days' },
  { value: 30, label: 'Last 30 Days' },
  { value: 90, label: 'Last 90 Days' },
];

/** Nav order matches BookVerse design reference */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
  { to: '/orders', label: 'Orders', icon: 'ShoppingBag' },
  { to: '/inventory', label: 'Inventory', icon: 'Package' },
  { to: '/categories', label: 'Categories', icon: 'Layers' },
  { to: '/billing', label: 'Billing', icon: 'Receipt' },
  { to: '/reviews', label: 'Reviews', icon: 'Star' },
  { to: '/discounts', label: 'Coupons', icon: 'Percent' },
  { to: '/settings', label: 'Settings', icon: 'Settings' },
];
