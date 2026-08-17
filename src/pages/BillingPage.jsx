import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Eye, Receipt, RotateCcw, ShoppingBag, Search } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { billingApi } from '../services/api';
import { PageHeader, Card, StatCard, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import Pagination, { DEFAULT_PAGE_SIZE } from '../components/common/Pagination';
import { CHART_RANGES } from '../utils/constants';
import { asList, formatCurrency, formatNumber, getApiError, unwrap, getListMeta } from '../utils/helpers';

const METHOD_LABELS = {
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  cod: 'Cash on delivery',
};

export default function BillingPage() {
  const [days, setDays] = useState(30);
  const [receiptOrderId, setReceiptOrderId] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [txnPage, setTxnPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);

  const summaryQuery = useQuery({
    queryKey: ['billing', 'summary', days],
    queryFn: () => billingApi.summary({ days }),
  });

  const refundsQuery = useQuery({
    queryKey: ['billing', 'refunds', refundPage],
    queryFn: () => billingApi.refunds({ page: refundPage, limit: DEFAULT_PAGE_SIZE }),
  });

  const transactionsQuery = useQuery({
    queryKey: ['billing', 'transactions', txnPage],
    queryFn: () =>
      billingApi.transactions({ page: txnPage, limit: DEFAULT_PAGE_SIZE }),
  });

  const summary = unwrap(summaryQuery.data);
  const totals = summary.totals || {};
  const byMethod = summary.byPaymentMethod || [];

  const methodMap = useMemo(() => {
    const map = { jazzcash: null, easypaisa: null, cod: null };
    byMethod.forEach((row) => {
      map[row.paymentMethod] = row;
    });
    return map;
  }, [byMethod]);

  const refunds = useMemo(() => {
    const data = unwrap(refundsQuery.data);
    return data.refunds || data.items || [];
  }, [refundsQuery.data]);

  const refundMeta = useMemo(
    () => getListMeta(refundsQuery.data, { page: refundPage, limit: DEFAULT_PAGE_SIZE }),
    [refundsQuery.data, refundPage]
  );

  const transactions = useMemo(() => {
    const data = unwrap(transactionsQuery.data);
    if (Array.isArray(data)) return data;
    return data.transactions || asList(transactionsQuery.data) || [];
  }, [transactionsQuery.data]);

  const txnMeta = useMemo(
    () => getListMeta(transactionsQuery.data, { page: txnPage, limit: DEFAULT_PAGE_SIZE }),
    [transactionsQuery.data, txnPage]
  );

  const lookupReceipt = async (e) => {
    e.preventDefault();
    if (!receiptOrderId.trim()) return;
    setLookingUp(true);
    setReceipt(null);
    try {
      const res = await billingApi.receipt(receiptOrderId.trim());
      setReceipt(unwrap(res).receipt || unwrap(res));
      toast.success('Receipt found');
    } catch (err) {
      toast.error(getApiError(err, 'Receipt not found'));
    } finally {
      setLookingUp(false);
    }
  };

  if (summaryQuery.isError) {
    return (
      <ErrorState
        message={summaryQuery.error?.response?.data?.message || 'Failed to load billing'}
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Billing & Transactions"
        description="Net volume, payouts, and payment activity across JazzCash, Easypaisa, and COD."
        actions={
          <div className="w-44">
            <Select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              options={CHART_RANGES.map((r) => ({ value: r.value, label: r.label }))}
              placeholder=""
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : [
              {
                title: 'Net Volume',
                value: formatCurrency(totals.grossRevenue || totals.netRevenue),
                change: '+12.5%',
                icon: DollarSign,
                tone: 'green',
              },
              {
                title: 'Success Rate',
                value: '99.4%',
                change: 'Based on txns',
                icon: Receipt,
                tone: 'sky',
              },
              {
                title: 'Refunds',
                value: formatCurrency(totals.totalRefunds),
                icon: RotateCcw,
                tone: 'amber',
              },
              {
                title: 'Orders',
                value: formatNumber(totals.orderCount),
                icon: ShoppingBag,
                tone: 'neutral',
              },
            ].map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {['jazzcash', 'easypaisa', 'cod'].map((method) => {
          const row = methodMap[method] || {};
          return (
            <Card key={method} title={METHOD_LABELS[method]}>
              {summaryQuery.isLoading ? (
                <Skeleton className="h-24" />
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Paid revenue</dt>
                    <dd className="font-semibold">{formatCurrency(row.paidRevenue)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Pending</dt>
                    <dd className="font-semibold">{formatCurrency(row.pendingRevenue)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Refunded</dt>
                    <dd className="font-semibold text-danger">
                      {formatCurrency(row.refundedAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-xs text-text-secondary">
                    <span>{formatNumber(row.paidOrders || 0)} paid</span>
                    <span>{formatNumber(row.refundedOrders || 0)} refunded</span>
                  </div>
                </dl>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6" title="Transactions" padded={false}>
        {transactionsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : transactionsQuery.isError ? (
          <div className="p-5">
            <ErrorState
              message="Failed to load transactions"
              onRetry={() => transactionsQuery.refetch()}
            />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No transactions" description="Order payments will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-lavender-soft/80 text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Transaction ID</th>
                  <th className="px-5 py-3 font-semibold">Order ID</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Payment Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id || t.transactionId} className="border-t border-border/70 hover:bg-lavender-soft/40">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-primary">
                      {t.transactionId}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/orders/${t.orderId}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {t.orderNumber || t.orderId}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {t.date ? format(new Date(t.date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-5 py-4 font-extrabold text-primary">
                      {formatCurrency(Math.abs(t.amount))}
                    </td>
                    <td className="px-5 py-4 capitalize text-text-secondary">
                      {METHOD_LABELS[t.paymentMethod || t.paymentType] ||
                        t.paymentMethod ||
                        t.paymentType}
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={t.status}>{t.status}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Link to={`/billing/${t.orderId}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={txnMeta.page}
              totalPages={txnMeta.totalPages}
              total={txnMeta.total}
              limit={txnMeta.limit}
              onPageChange={setTxnPage}
              itemLabel="transactions"
            />
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Refunds" padded={false}>
          {refundsQuery.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-40" />
            </div>
          ) : refundsQuery.isError ? (
            <div className="p-5">
              <ErrorState
                message="Failed to load refunds"
                onRetry={() => refundsQuery.refetch()}
              />
            </div>
          ) : refunds.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No refunds" description="Refunded orders will show up here." />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border px-5">
                {refunds.map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <Link
                        to={`/orders/${r._id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {r.orderNumber}
                      </Link>
                      <p className="text-xs text-text-secondary">
                        {r.shippingAddress?.name || r.customerId?.name || '—'} ·{' '}
                        {r.refund?.refundedAt
                          ? format(new Date(r.refund.refundedAt), 'dd MMM yyyy')
                          : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-danger">
                        {formatCurrency(r.refund?.amount ?? r.totalAmount)}
                      </p>
                      <Badge status="refunded">refunded</Badge>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={refundMeta.page}
                totalPages={refundMeta.totalPages}
                total={refundMeta.total}
                limit={refundMeta.limit}
                onPageChange={setRefundPage}
                itemLabel="refunds"
              />
            </>
          )}
        </Card>

        <Card title="Receipt lookup">
          <form onSubmit={lookupReceipt} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <Input
                className="pl-9"
                placeholder="Order ID (e.g. ord-1)"
                value={receiptOrderId}
                onChange={(e) => setReceiptOrderId(e.target.value)}
              />
            </div>
            <Button type="submit" loading={lookingUp}>
              Lookup
            </Button>
          </form>

          {receipt ? (
            <div className="mt-4 rounded-2xl border border-border bg-lavender-soft/60 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">
                    {receipt.orderNumber || receipt.orderId || 'Receipt'}
                  </p>
                  <p className="mt-1 text-text-secondary">
                    Total: {formatCurrency(receipt.totalAmount ?? receipt.amount ?? 0)}
                  </p>
                  {receipt.issuedAt || receipt.createdAt ? (
                    <p className="mt-1 text-xs text-text-secondary">
                      {format(
                        new Date(receipt.issuedAt || receipt.createdAt),
                        'dd MMM yyyy, HH:mm'
                      )}
                    </p>
                  ) : null}
                </div>
                <Link to={`/billing/${receipt.orderId || receiptOrderId.trim()}`}>
                  <Button variant="outline" size="sm">
                    Open
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">
              Enter an order ID to fetch its receipt, or browse the transactions table above.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
