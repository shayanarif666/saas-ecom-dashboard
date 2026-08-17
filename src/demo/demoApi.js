import {
  DEMO_ADMIN,
  DEMO_CREDENTIALS,
  buildTransactionsFromOrders,
  clearDemoSession,
  demoDb,
  fail,
  getDemoSession,
  ok,
  setDemoSession,
} from './demoData';

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function parseBody(config) {
  if (!config.data) return {};
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data;
}

function pathOf(config) {
  const raw = (config.url || '').replace(/^\//, '');
  return raw.split('?')[0];
}

function methodOf(config) {
  return (config.method || 'get').toLowerCase();
}

function requireAuth() {
  const session = getDemoSession();
  if (!session) fail('Authentication required', 401);
  return session;
}

function buildAnalytics() {
  const paidish = demoDb.orders.filter((o) => o.orderStatus !== 'cancelled');
  const revenue = paidish.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const revenueByDay = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = paidish.filter((o) => (o.createdAt || '').startsWith(key));
    revenueByDay.push({
      _id: key,
      revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0) || Math.round(revenue / 10 + i * 120),
      orders: dayOrders.length || (i % 3 === 0 ? 1 : 0),
    });
  }

  const customers = new Set(
    paidish.map((o) => o.shippingAddress?.email || o.customerId?.email || o._id)
  );

  return ok({
    kpis: {
      revenue,
      revenueChangePct: 12.5,
      orders: paidish.length,
      ordersChangePct: 8,
      customers: customers.size,
      products: demoDb.products.length,
      lowStock: demoDb.products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length,
    },
    revenueByDay,
    salesByCategory: [
      { name: 'Books', sales: 9200, quantity: 12 },
      { name: 'Bags', sales: 8049, quantity: 2 },
      { name: 'Stationery', sales: 4049, quantity: 5 },
    ],
    topCustomers: [
      { userId: 'c1', name: 'Omar Sheikh', email: 'omar@example.com', totalSpent: 5050, totalOrders: 1 },
      { userId: 'c2', name: 'Ayesha Khan', email: 'ayesha@example.com', totalSpent: 2999, totalOrders: 1 },
      { userId: 'c3', name: 'Hassan Raza', email: 'hassan@example.com', totalSpent: 2700, totalOrders: 1 },
      { userId: 'c4', name: 'Bilal Hussain', email: 'bilal@example.com', totalSpent: 2589, totalOrders: 1 },
    ],
    latestOrders: [...demoDb.orders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ),
    billingBreakdown: [
      { _id: 'jazzcash', revenue: 7791, count: 3 },
      { _id: 'easypaisa', revenue: 8049, count: 2 },
      { _id: 'cod', revenue: 5048, count: 3 },
    ],
    periodDays: 30,
  });
}

function buildBillingSummary() {
  const methods = ['jazzcash', 'easypaisa', 'cod'];
  const byPaymentMethod = methods.map((paymentMethod) => {
    const rows = demoDb.orders.filter((o) => o.paymentMethod === paymentMethod);
    const paid = rows.filter((o) => o.paymentStatus === 'paid');
    const pending = rows.filter((o) => o.paymentStatus === 'pending');
    const refunded = rows.filter((o) => o.paymentStatus === 'refunded');
    return {
      paymentMethod,
      paidRevenue: paid.reduce((s, o) => s + (o.totalAmount || 0), 0),
      pendingRevenue: pending.reduce((s, o) => s + (o.totalAmount || 0), 0),
      refundedAmount: refunded.reduce(
        (s, o) => s + (o.refund?.amount ?? o.totalAmount ?? 0),
        0
      ),
      paidOrders: paid.length,
      refundedOrders: refunded.length,
      pendingOrders: pending.length,
    };
  });

  const grossRevenue = byPaymentMethod.reduce((s, r) => s + r.paidRevenue + r.pendingRevenue, 0);
  const totalRefunds = byPaymentMethod.reduce((s, r) => s + r.refundedAmount, 0);

  return ok({
    totals: {
      grossRevenue,
      netRevenue: grossRevenue - totalRefunds,
      totalRefunds,
      orderCount: demoDb.orders.length,
    },
    byPaymentMethod,
  });
}

function buildReceipt(order) {
  return {
    _id: `rcpt-${order._id}`,
    receiptNumber: `RCPT-${String(order.orderNumber || order._id).replace(/^ORD-/, '')}`,
    transactionId: `TXN-${String(order.orderNumber || order._id).replace(/^ORD-/, '')}`,
    orderId: order._id,
    orderNumber: order.orderNumber,
    customer: order.shippingAddress?.name || order.customerId?.name || '—',
    customerEmail: order.shippingAddress?.email || order.customerId?.email || '',
    customerPhone: order.shippingAddress?.phone || order.customerId?.phone || '',
    items: order.items,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingFee: order.shippingFee,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    statusHistory: order.statusHistory || [],
    shippingAddress: order.shippingAddress,
    refund: order.refund || null,
    issuedAt: order.createdAt,
    createdAt: order.createdAt,
    storeSnapshot: {
      name: demoDb.store.name,
      address: demoDb.store.address,
      contactPhone: demoDb.store.contactPhone,
      contactEmail: demoDb.store.contactEmail,
      logoUrl: demoDb.store.logoUrl,
    },
  };
}

function findOrderByAnyId(id) {
  return (
    demoDb.orders.find((o) => o._id === id) ||
    demoDb.orders.find((o) => o.orderNumber === id) ||
    demoDb.orders.find((o) => `txn-${o._id}` === id) ||
    demoDb.orders.find(
      (o) => `TXN-${String(o.orderNumber || o._id).replace(/^ORD-/, '')}` === id
    )
  );
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Handles all Dashboard API calls in demo mode (no Backend required).
 */
export async function handleDemoRequest(config) {
  await delay(180);
  const method = methodOf(config);
  const path = pathOf(config);
  const body = parseBody(config);
  const params = config.params || {};

  // --- Auth ---
  if (path === 'auth/login' && method === 'post') {
    const email = String(body.email || '').toLowerCase();
    const password = String(body.password || '');
    const okCreds =
      (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) ||
      password === 'demo' ||
      password === 'Demo@123';
    if (!okCreds) fail('Invalid email or password', 401);
    setDemoSession(DEMO_ADMIN);
    return ok(DEMO_ADMIN, 'Login successful');
  }

  if (path === 'auth/register' && method === 'post') {
    const user = {
      ...DEMO_ADMIN,
      id: uid('admin'),
      name: body.name || 'New Admin',
      email: body.email || 'new@demo.local',
      phone: body.phone || '',
    };
    if (body.storeName) demoDb.store.name = body.storeName;
    setDemoSession(user);
    return ok(user, 'Registration successful');
  }

  if (path === 'auth/logout' && method === 'post') {
    clearDemoSession();
    return ok(null, 'Logged out');
  }

  if (path === 'auth/me' && method === 'get') {
    const session = getDemoSession();
    if (!session) fail('Authentication required', 401);
    return ok(session);
  }

  if (path === 'auth/me' && method === 'patch') {
    requireAuth();
    const session = { ...getDemoSession(), ...body };
    setDemoSession(session);
    return ok(session, 'Profile updated');
  }

  if (path === 'auth/refresh' && method === 'post') {
    const session = getDemoSession();
    if (!session) fail('Refresh token missing', 401);
    return ok(session, 'Token refreshed');
  }

  if (path === 'auth/register/check-domain' && method === 'post') {
    const domain = String(body.domain || body.customDomain || '')
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .replace(/^www\./, '');
    if (!domain) fail('Domain is required', 400);
    if (demoDb.store?.customDomain === domain) fail('Domain already taken', 409);
    return ok({ domain, available: true }, 'Domain is available');
  }

  if (path === 'auth/register/start' && method === 'post') {
    if (!body.email || !body.storeName || !body.customDomain) {
      fail('Store and owner details required', 400);
    }
    demoDb._pendingReg = {
      ...body,
      otp: '123456',
      email: String(body.email).toLowerCase(),
    };
    return ok(
      {
        email: demoDb._pendingReg.email,
        customDomain: body.customDomain,
        expiresInMinutes: 10,
        message: 'OTP sent to your email',
      },
      'OTP sent (demo code: 123456)'
    );
  }

  if (path === 'auth/register/resend-otp' && method === 'post') {
    if (!demoDb._pendingReg) fail('No pending registration', 404);
    return ok({ email: demoDb._pendingReg.email, expiresInMinutes: 10 }, 'OTP resent');
  }

  if (path === 'auth/register/verify' && method === 'post') {
    const pending = demoDb._pendingReg;
    if (!pending) fail('No pending registration', 404);
    if (String(body.otp) !== String(pending.otp || '123456')) fail('Invalid OTP', 400);
    const user = {
      ...DEMO_ADMIN,
      id: uid('admin'),
      name: pending.name || 'New Admin',
      email: pending.email,
      phone: pending.phone || '',
    };
    if (pending.storeName) demoDb.store.name = pending.storeName;
    if (pending.customDomain) demoDb.store.customDomain = pending.customDomain;
    demoDb._pendingReg = null;
    setDemoSession(user);
    return ok({ user, store: demoDb.store }, 'Email verified. Store created successfully');
  }

  // --- Store ---
  if (path === 'stores/me' && method === 'get') {
    requireAuth();
    return ok({ ...demoDb.store, websiteContent: { ...demoDb.store.websiteContent } });
  }
  if (path === 'stores/me' && method === 'patch') {
    requireAuth();
    Object.assign(demoDb.store, body);
    if (body.themeColors) demoDb.store.themeColors = { ...demoDb.store.themeColors, ...body.themeColors };
    if (body.websiteContent) {
      demoDb.store.websiteContent = { ...demoDb.store.websiteContent, ...body.websiteContent };
    }
    if (body.socialLinks) {
      demoDb.store.socialLinks = { ...demoDb.store.socialLinks, ...body.socialLinks };
    }
    if (body.bannerUrls) demoDb.store.bannerUrls = body.bannerUrls;
    return ok(demoDb.store, 'Store updated');
  }

  // --- Dashboard ---
  if (path === 'dashboard/analytics' && method === 'get') {
    requireAuth();
    return buildAnalytics();
  }

  // --- Categories ---
  if (path === 'categories' && method === 'get') {
    requireAuth();
    return ok(demoDb.categories, 'OK', { total: demoDb.categories.length });
  }
  if (path === 'categories' && method === 'post') {
    requireAuth();
    const cat = {
      _id: uid('cat'),
      name: body.name,
      slug: (body.name || 'category').toLowerCase().replace(/\s+/g, '-'),
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder || demoDb.categories.length + 1,
    };
    demoDb.categories.push(cat);
    return ok(cat, 'Category created');
  }
  if (path.startsWith('categories/') && method === 'patch') {
    requireAuth();
    const id = path.split('/')[1];
    const cat = demoDb.categories.find((c) => c._id === id);
    if (!cat) fail('Category not found', 404);
    Object.assign(cat, body);
    return ok(cat, 'Category updated');
  }
  if (path.startsWith('categories/') && method === 'delete') {
    requireAuth();
    const id = path.split('/')[1];
    demoDb.categories = demoDb.categories.filter((c) => c._id !== id);
    return ok(null, 'Category deleted');
  }

  // --- Products ---
  if (path === 'products' && method === 'get') {
    requireAuth();
    let items = [...demoDb.products];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.specifications || []).some((s) => String(s.value || '').toLowerCase().includes(q))
      );
    }
    if (params.category || params.categoryId) {
      const cid = params.category || params.categoryId;
      items = items.filter((p) => p.categoryId === cid);
    }
    return ok(items, 'OK', { total: items.length, page: 1, limit: 50, totalPages: 1 });
  }
  if (path === 'products' && method === 'post') {
    requireAuth();
    const product = {
      _id: uid('prod'),
      slug: (body.title || 'product').toLowerCase().replace(/\s+/g, '-'),
      images: body.images || [],
      specifications: body.specifications || [],
      isPublished: Boolean(body.isPublished),
      lowStockThreshold: body.lowStockThreshold ?? 5,
      soldCount: 0,
      ...body,
    };
    demoDb.products.unshift(product);
    return ok(product, 'Product created');
  }
  if (path.startsWith('products/') && method === 'get') {
    requireAuth();
    const id = path.split('/')[1];
    const product = demoDb.products.find((p) => p._id === id);
    if (!product) fail('Product not found', 404);
    return ok(product);
  }
  if (path.startsWith('products/') && method === 'patch') {
    requireAuth();
    const id = path.split('/')[1];
    const product = demoDb.products.find((p) => p._id === id);
    if (!product) fail('Product not found', 404);
    Object.assign(product, body);
    return ok(product, 'Product updated');
  }
  if (path.startsWith('products/') && method === 'delete') {
    requireAuth();
    const id = path.split('/')[1];
    demoDb.products = demoDb.products.filter((p) => p._id !== id);
    return ok(null, 'Product deleted');
  }

  // --- Orders ---
  if (path === 'orders' && method === 'get') {
    requireAuth();
    let items = [...demoDb.orders];
    if (params.status || params.orderStatus) {
      const st = params.status || params.orderStatus;
      items = items.filter((o) => o.orderStatus === st);
    }
    if (params.paymentMethod) {
      items = items.filter((o) => o.paymentMethod === params.paymentMethod);
    }
    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.shippingAddress?.name || '').toLowerCase().includes(q) ||
          (o.shippingAddress?.phone || '').includes(q)
      );
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items, 'OK', { total: items.length });
  }
  if (path.match(/^orders\/[^/]+$/) && method === 'get') {
    requireAuth();
    const id = path.split('/')[1];
    const order = demoDb.orders.find((o) => o._id === id);
    if (!order) fail('Order not found', 404);
    return ok(order);
  }
  if (path.match(/^orders\/[^/]+\/status$/) && method === 'patch') {
    requireAuth();
    const id = path.split('/')[1];
    const order = demoDb.orders.find((o) => o._id === id);
    if (!order) fail('Order not found', 404);
    order.orderStatus = body.orderStatus;
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: body.orderStatus, changedAt: new Date().toISOString() },
    ];
    return ok(order, 'Status updated');
  }
  if (path.match(/^orders\/[^/]+\/refund$/) && method === 'post') {
    requireAuth();
    const id = path.split('/')[1];
    const order = demoDb.orders.find((o) => o._id === id);
    if (!order) fail('Order not found', 404);
    order.paymentStatus = 'refunded';
    order.orderStatus = 'cancelled';
    order.refund = {
      amount: body.amount ?? order.totalAmount,
      reason: body.reason || 'Refunded',
      refundedAt: new Date().toISOString(),
    };
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: 'cancelled', changedAt: new Date().toISOString(), note: 'Refund issued' },
    ];
    demoDb.refunds.unshift({ ...order });
    return ok(order, 'Order refunded');
  }

  // --- Reviews ---
  if (path === 'reviews' && method === 'get') {
    requireAuth();
    let items = [...(demoDb.reviews || [])];
    if (params.status && params.status !== 'all') {
      items = items.filter((r) => r.status === params.status);
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items, 'OK', { total: items.length });
  }
  if (path.match(/^reviews\/[^/]+\/status$/) && method === 'patch') {
    requireAuth();
    const id = path.split('/')[1];
    const review = demoDb.reviews.find((r) => r._id === id);
    if (!review) fail('Review not found', 404);
    review.status = body.status;
    return ok(review, 'Review status updated');
  }
  if (path.match(/^reviews\/[^/]+$/) && method === 'delete') {
    requireAuth();
    const id = path.split('/')[1];
    const exists = demoDb.reviews.some((r) => r._id === id);
    if (!exists) fail('Review not found', 404);
    demoDb.reviews = demoDb.reviews.filter((r) => r._id !== id);
    return ok(null, 'Review deleted');
  }

  // --- Billing ---
  if (path === 'billing/summary' && method === 'get') {
    requireAuth();
    return buildBillingSummary();
  }
  if (path === 'billing/refunds' && method === 'get') {
    requireAuth();
    const refundedOrders = demoDb.orders.filter((o) => o.paymentStatus === 'refunded' || o.refund);
    const merged = [...demoDb.refunds];
    refundedOrders.forEach((o) => {
      if (!merged.some((r) => r._id === o._id)) merged.push(o);
    });
    return ok({ refunds: merged });
  }
  if (path === 'billing/transactions' && method === 'get') {
    requireAuth();
    let items = buildTransactionsFromOrders(demoDb.orders);
    if (params.status) items = items.filter((t) => t.status === params.status);
    if (params.paymentMethod) {
      items = items.filter((t) => t.paymentMethod === params.paymentMethod);
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return ok({ transactions: items }, 'OK', { total: items.length });
  }
  if (path.match(/^billing\/transactions\/[^/]+$/) && method === 'get') {
    requireAuth();
    const id = path.split('/')[2];
    const order = findOrderByAnyId(id);
    if (!order) fail('Transaction not found', 404);
    const txn = buildTransactionsFromOrders([order])[0];
    return ok({ ...txn, receipt: buildReceipt(order) });
  }

  // --- Receipts ---
  if (path.startsWith('receipts/order/') && method === 'get') {
    requireAuth();
    const orderId = path.split('/')[2];
    const order = findOrderByAnyId(orderId);
    if (!order) fail('Receipt not found', 404);
    return ok(buildReceipt(order));
  }

  // --- Discounts ---
  if (path === 'discounts' && method === 'get') {
    requireAuth();
    return ok(demoDb.discounts, 'OK', { total: demoDb.discounts.length });
  }
  if (path === 'discounts' && method === 'post') {
    requireAuth();
    const discount = { _id: uid('disc'), usedCount: 0, isActive: true, ...body };
    demoDb.discounts.unshift(discount);
    return ok(discount, 'Discount created');
  }
  if (path.startsWith('discounts/') && method === 'patch') {
    requireAuth();
    const id = path.split('/')[1];
    const discount = demoDb.discounts.find((d) => d._id === id);
    if (!discount) fail('Discount not found', 404);
    Object.assign(discount, body);
    return ok(discount, 'Discount updated');
  }
  if (path.startsWith('discounts/') && method === 'delete') {
    requireAuth();
    const id = path.split('/')[1];
    demoDb.discounts = demoDb.discounts.filter((d) => d._id !== id);
    return ok(null, 'Discount deleted');
  }

  // --- Upload ---
  if (path === 'upload' && method === 'post') {
    requireAuth();
    return ok({
      urls: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80'],
      images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80'],
      count: 1,
    });
  }

  fail(`Demo route not implemented: ${method.toUpperCase()} /${path}`, 404);
}
