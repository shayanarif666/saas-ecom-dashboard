import apiClient from './apiClient';

/**
 * All Dashboard ↔ Backend calls go through here.
 * Backend envelope: { success, message, data, meta? }
 * Pages should use unwrap() / asList() from helpers on the returned body.
 */

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload).then((r) => r.data),
  registerStart: (payload) =>
    apiClient.post('/auth/register/start', payload).then((r) => r.data),
  registerVerify: (payload) =>
    apiClient.post('/auth/register/verify', payload).then((r) => r.data),
  registerResendOtp: (payload) =>
    apiClient.post('/auth/register/resend-otp', payload).then((r) => r.data),
  checkDomain: (payload) =>
    apiClient.post('/auth/register/check-domain', payload).then((r) => r.data),
  login: (payload) => apiClient.post('/auth/login', payload).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  me: () => apiClient.get('/auth/me').then((r) => r.data),
  updateProfile: (payload) => apiClient.patch('/auth/me', payload).then((r) => r.data),
  refresh: () => apiClient.post('/auth/refresh').then((r) => r.data),
};

export const dashboardApi = {
  analytics: (params) =>
    apiClient.get('/dashboard/analytics', { params }).then((r) => r.data),
};

export const productsApi = {
  list: (params) => apiClient.get('/products', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/products/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/products', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/products/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/products/${id}`).then((r) => r.data),
  upload: (formData) =>
    apiClient
      .post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
};

export const categoriesApi = {
  list: (params) => apiClient.get('/categories', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/categories/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/categories', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/categories/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/categories/${id}`).then((r) => r.data),
};

export const ordersApi = {
  list: (params) => apiClient.get('/orders', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/orders/${id}`).then((r) => r.data),
  /** @param {string} id @param {string|{ orderStatus: string, note?: string, trackingNumber?: string, carrier?: string, trackingUrl?: string, location?: string }} orderStatusOrPayload */
  updateStatus: (id, orderStatusOrPayload) => {
    const body =
      typeof orderStatusOrPayload === 'string'
        ? { orderStatus: orderStatusOrPayload }
        : orderStatusOrPayload;
    return apiClient.patch(`/orders/${id}/status`, body).then((r) => r.data);
  },
  updatePaymentStatus: (id, paymentStatus) =>
    apiClient
      .patch(`/orders/${id}/payment-status`, { paymentStatus })
      .then((r) => r.data),
  refund: (id, payload) =>
    apiClient.post(`/orders/${id}/refund`, payload).then((r) => r.data),
};

export const billingApi = {
  summary: (params) => apiClient.get('/billing/summary', { params }).then((r) => r.data),
  refunds: (params) => apiClient.get('/billing/refunds', { params }).then((r) => r.data),
  transactions: (params) =>
    apiClient.get('/billing/transactions', { params }).then((r) => r.data),
  getTransaction: (id) =>
    apiClient.get(`/billing/transactions/${id}`).then((r) => r.data),
  receipt: (orderId) =>
    apiClient.get(`/receipts/order/${orderId}`).then((r) => r.data),
};

export const reviewsApi = {
  list: (params) => apiClient.get('/reviews', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/reviews/${id}`).then((r) => r.data),
  updateStatus: (id, status) =>
    apiClient.patch(`/reviews/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => apiClient.delete(`/reviews/${id}`).then((r) => r.data),
};

export const discountsApi = {
  list: (params) => apiClient.get('/discounts', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/discounts/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/discounts', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/discounts/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/discounts/${id}`).then((r) => r.data),
  validate: (payload) =>
    apiClient.post('/discounts/validate', payload).then((r) => r.data),
};

export const storeApi = {
  getMine: () => apiClient.get('/stores/me').then((r) => r.data),
  updateMine: (payload) => apiClient.patch('/stores/me', payload).then((r) => r.data),
};
