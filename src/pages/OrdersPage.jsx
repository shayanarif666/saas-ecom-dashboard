import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, Search } from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ordersApi } from '../services/api';
import { PageHeader, Card, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import Pagination, { DEFAULT_PAGE_SIZE } from '../components/common/Pagination';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../utils/constants';
import { formatCurrency, getNextStatuses, getApiError, unwrap, getListMeta } from '../utils/helpers';

export default function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['orders', { search, orderStatus, paymentMethod, page }],
    queryFn: () =>
      ordersApi.list({
        search: search || undefined,
        orderStatus: orderStatus || undefined,
        paymentMethod: paymentMethod || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
        sort: 'newest',
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }) => ordersApi.updateStatus(id, next),
    onSuccess: () => {
      toast.success('Order status updated');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update status')),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, paymentStatus }) =>
      ordersApi.updatePaymentStatus(id, paymentStatus),
    onSuccess: () => {
      toast.success('Payment status updated');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) =>
      toast.error(getApiError(err, 'Failed to update payment status')),
  });

  const orders = useMemo(() => {
    const data = unwrap(query.data);
    return data.orders || data.items || [];
  }, [query.data]);

  const meta = useMemo(
    () => getListMeta(query.data, { page, limit: DEFAULT_PAGE_SIZE }),
    [query.data, page]
  );

  const exportCsv = () => {
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: o.shippingAddress?.name || o.customerId?.name || '',
      email: o.shippingAddress?.email || '',
      phone: o.shippingAddress?.phone || '',
      total: o.totalAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt ? format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm') : '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.response?.data?.message || 'Failed to load orders'}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Orders Management"
        description="Track, filter, and fulfill every bookstore order."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!orders.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              className="pl-9"
              placeholder="Search order #, name, phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            placeholder="All statuses"
            value={orderStatus}
            onChange={(e) => {
              setOrderStatus(e.target.value);
              setPage(1);
            }}
            options={ORDER_STATUSES}
          />
          <Select
            placeholder="All payment methods"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            options={PAYMENT_METHODS}
          />
        </div>
      </Card>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" description="Orders will appear here as customers check out." />
      ) : (
        <Card className="overflow-visible" padded={false}>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-background/80 text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Payment status</th>
                  <th className="px-5 py-3 font-semibold">Update payment</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Update status</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => {
                  const next = getNextStatuses(o.orderStatus);
                  const paymentOptions = PAYMENT_STATUSES.filter(
                    (s) => s.value !== o.paymentStatus
                  );
                  return (
                    <tr key={o._id} className="hover:bg-background/50">
                      <td className="px-5 py-3">
                        <Link
                          to={`/orders/${o._id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                        <p className="text-xs text-text-secondary">
                          {o.createdAt
                            ? format(new Date(o.createdAt), 'dd MMM yyyy, HH:mm')
                            : '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-text-primary">
                          {o.shippingAddress?.name || o.customerId?.name || '—'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {o.shippingAddress?.phone || o.shippingAddress?.email || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="px-5 py-3">
                        {o.paymentMethod ? (
                          <Badge status={o.paymentMethod}>{o.paymentMethod}</Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge status={o.paymentStatus}>{o.paymentStatus}</Badge>
                      </td>
                      <td className="px-5 py-3 min-w-[11rem]">
                        {o.paymentStatus === 'refunded' || !paymentOptions.length ? (
                          <span className="text-xs text-text-secondary">—</span>
                        ) : (
                          <Select
                            size="sm"
                            placeholder="Change…"
                            value=""
                            disabled={paymentMutation.isPending}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) return;
                              paymentMutation.mutate({
                                id: o._id,
                                paymentStatus: value,
                              });
                            }}
                            options={paymentOptions}
                          />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge status={o.orderStatus}>
                          {String(o.orderStatus).replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 min-w-[11rem]">
                        {next.length ? (
                          <Select
                            size="sm"
                            placeholder="Change…"
                            value=""
                            disabled={statusMutation.isPending}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) return;
                              statusMutation.mutate({ id: o._id, next: value });
                            }}
                            options={next.map((s) => ({
                              value: s,
                              label: s.replaceAll('_', ' '),
                            }))}
                          />
                        ) : (
                          <span className="text-xs text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link to={`/orders/${o._id}`}>
                          <Button size="sm" variant="outline" className="whitespace-nowrap">
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={setPage}
            itemLabel="orders"
          />
        </Card>
      )}
    </div>
  );
}
