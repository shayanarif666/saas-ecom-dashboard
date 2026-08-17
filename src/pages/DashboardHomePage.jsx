import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  MoreHorizontal,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { dashboardApi, productsApi } from '../services/api';
import { PageHeader, StatCard, Card, ErrorState, Skeleton } from '../components/common/States';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import { RevenueChart } from '../components/charts/Charts';
import { CHART_RANGES } from '../utils/constants';
import { asList, formatCurrency, formatNumber, initials, unwrap } from '../utils/helpers';

const AVATAR_TONES = ['bg-violet-100 text-brand', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700'];

export default function DashboardHomePage() {
  const [days, setDays] = useState(30);
  const [orderSearch, setOrderSearch] = useState('');

  const query = useQuery({
    queryKey: ['dashboard', 'analytics', days],
    queryFn: () => dashboardApi.analytics({ days }),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'top'],
    queryFn: () => productsApi.list({ limit: 5, sort: 'bestselling' }),
  });

  const data = unwrap(query.data);
  const kpis = data.kpis || data;
  const revenueByDay = (data.revenueByDay || []).map((r, i, arr) => ({
    name: String(r._id || r.date || '').slice(5) || `D${i + 1}`,
    revenue: r.revenue,
    highlight: i === arr.length - 2,
  }));
  const latestOrders = asList({ data: data.latestOrders || [] });
  const topProducts = asList(productsQuery.data).slice(0, 4);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return latestOrders.slice(0, 6);
    return latestOrders.filter((o) => {
      const name = o.shippingAddress?.name || o.customerId?.name || '';
      return (
        String(o.orderNumber || '').toLowerCase().includes(q) || name.toLowerCase().includes(q)
      );
    });
  }, [latestOrders, orderSearch]);

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.response?.data?.message || 'Failed to load analytics'}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="System Dashboard"
        description="Real-time performance overview for BookVerse Marketplace."
        actions={
          <div className="w-48">
            <Select
              leadingIcon={Calendar}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              options={CHART_RANGES.map((r) => ({ value: r.value, label: r.label }))}
              placeholder="Select range"
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          : [
              {
                title: 'Total Orders',
                value: formatNumber(kpis.orders ?? 12842),
                change: kpis.ordersChangePct != null ? `+${kpis.ordersChangePct}%` : '+12.5%',
                icon: ShoppingCart,
                tone: 'sky',
              },
              {
                title: 'Total Revenue',
                value: formatCurrency(kpis.revenue ?? 428590),
                change: kpis.revenueChangePct != null ? `+${kpis.revenueChangePct}%` : '+8.2%',
                icon: Wallet,
                tone: 'green',
              },
              {
                title: 'Total Customers',
                value: formatNumber(kpis.customers ?? 8920),
                change: '+4.1%',
                icon: Users,
                tone: 'amber',
              },
              {
                title: 'Total Products',
                value: formatNumber(kpis.products ?? 1452),
                change: 'Static',
                icon: BookOpen,
                tone: 'neutral',
              },
            ].map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Revenue Analytics" className="xl:col-span-2">
          {query.isLoading ? <Skeleton className="h-72" /> : <RevenueChart data={revenueByDay} />}
        </Card>

        <Card
          title="Top Selling"
          action={
            <Link to="/inventory" className="text-xs font-bold text-brand hover:underline">
              View All
            </Link>
          }
        >
          {productsQuery.isLoading ? (
            <Skeleton className="h-64" />
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-text-secondary">No products yet.</p>
          ) : (
            <ul className="space-y-4">
              {topProducts.map((p) => (
                <li key={p._id} className="flex items-center gap-3">
                  <div className="h-12 w-10 overflow-hidden rounded-lg bg-lavender">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-brand">
                        <BookOpen className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-primary">{p.title}</p>
                    <p className="truncate text-xs text-text-secondary">
                      {p.specifications?.find((s) => s.key?.toLowerCase() === 'author')?.value ||
                        p.author ||
                        'Unknown author'}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-primary">
                    {formatNumber(p.soldCount || p.stockQuantity || 0)}
                    <span className="ml-1 text-[10px] font-semibold text-text-secondary">Sold</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-primary">Recent Orders</h2>
          <div className="relative w-full sm:max-w-xs">
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search orders..."
              className="h-10 w-full rounded-xl border border-border bg-lavender-soft px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-lavender-soft/70 text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-5 py-3">
                        <Skeleton className="h-10" />
                      </td>
                    </tr>
                  ))
                : filteredOrders.map((o, idx) => {
                    const name = o.shippingAddress?.name || o.customerId?.name || 'Customer';
                    return (
                      <tr key={o._id} className="border-t border-border/80 hover:bg-lavender-soft/40">
                        <td className="px-5 py-4">
                          <Link to={`/orders/${o._id}`} className="font-bold text-brand hover:underline">
                            #{o.orderNumber || o._id}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${AVATAR_TONES[idx % AVATAR_TONES.length]}`}
                            >
                              {initials(name)}
                            </span>
                            <span className="font-medium text-primary">{name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-text-secondary">
                          {o.createdAt ? format(new Date(o.createdAt), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="px-5 py-4 font-bold text-primary">{formatCurrency(o.totalAmount)}</td>
                        <td className="px-5 py-4">
                          <Badge status={o.orderStatus === 'delivered' ? 'completed' : o.orderStatus} />
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            to={`/orders/${o._id}`}
                            className="inline-flex rounded-lg p-1.5 text-text-secondary hover:bg-lavender hover:text-primary"
                            aria-label="Open order"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
