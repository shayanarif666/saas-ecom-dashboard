import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, ExternalLink, Printer, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { billingApi } from '../services/api';
import { PageHeader, Card, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { formatCurrency, unwrap } from '../utils/helpers';

const METHOD_LABELS = {
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  cod: 'Cash on delivery',
};

export default function BillingDetailPage() {
  const { id } = useParams();

  const txnQuery = useQuery({
    queryKey: ['billing', 'transaction', id],
    queryFn: () => billingApi.getTransaction(id),
    retry: false,
  });

  const receiptQuery = useQuery({
    queryKey: ['billing', 'receipt', id],
    queryFn: () => billingApi.receipt(id),
    enabled: txnQuery.isError,
    retry: false,
  });

  const receipt = useMemo(() => {
    if (txnQuery.data) {
      const data = unwrap(txnQuery.data);
      return data.receipt || data;
    }
    if (receiptQuery.data) {
      return unwrap(receiptQuery.data).receipt || unwrap(receiptQuery.data);
    }
    return null;
  }, [txnQuery.data, receiptQuery.data]);

  const isLoading = txnQuery.isLoading || (txnQuery.isError && receiptQuery.isLoading);
  const isError = txnQuery.isError && receiptQuery.isError;

  const handlePrint = () => window.print();

  if (isError) {
    return (
      <ErrorState
        message="Transaction not found"
        onRetry={() => {
          txnQuery.refetch();
          receiptQuery.refetch();
        }}
      />
    );
  }

  if (isLoading || !receipt) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const history = receipt.statusHistory || [];
  const orderId = receipt.orderId || id;
  const txnId = receipt.transactionId || `TXN-${orderId}`;

  return (
    <div className="print:bg-white">
      <PageHeader
        title="Transaction receipt"
        description={txnId}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link to="/billing">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Link to={`/orders/${orderId}`}>
              <Button>
                <ExternalLink className="h-4 w-4" />
                View order
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge status={receipt.paymentStatus}>{receipt.paymentStatus}</Badge>
        {receipt.orderStatus ? (
          <Badge status={receipt.orderStatus}>
            {String(receipt.orderStatus).replaceAll('_', ' ')}
          </Badge>
        ) : null}
        <span className="text-sm text-text-secondary">
          {METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-lavender p-3 text-brand">
                <Receipt className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Transaction ID
                </p>
                <p className="mt-1 font-mono text-lg font-extrabold text-primary">{txnId}</p>
                <p className="mt-2 text-sm text-text-secondary">
                  {receipt.issuedAt || receipt.createdAt || receipt.date
                    ? format(
                        new Date(receipt.issuedAt || receipt.createdAt || receipt.date),
                        'dd MMM yyyy, HH:mm'
                      )
                    : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">Amount</p>
                <p className="text-2xl font-extrabold text-primary">
                  {formatCurrency(Math.abs(receipt.totalAmount ?? receipt.amount ?? 0))}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Amount breakdown">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(receipt.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-text-secondary">
                <dt>Discount</dt>
                <dd>-{formatCurrency(receipt.discountAmount)}</dd>
              </div>
              <div className="flex justify-between text-text-secondary">
                <dt>Shipping</dt>
                <dd>{formatCurrency(receipt.shippingFee)}</dd>
              </div>
              {(receipt.taxAmount || 0) > 0 ? (
                <div className="flex justify-between text-text-secondary">
                  <dt>Tax</dt>
                  <dd>{formatCurrency(receipt.taxAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-primary">
                <dt>Total</dt>
                <dd>{formatCurrency(receipt.totalAmount ?? receipt.amount)}</dd>
              </div>
            </dl>

            {(receipt.items || []).length > 0 ? (
              <ul className="mt-5 divide-y divide-border border-t border-border pt-4">
                {receipt.items.map((item, idx) => (
                  <li key={`${item.productId}-${idx}`} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl bg-lavender-soft">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary">{item.title}</p>
                      <p className="text-xs text-text-secondary">
                        Qty {item.quantity} · {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>
                    <p className="text-sm font-bold">{formatCurrency(item.subtotal)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title="Timeline">
            {history.length === 0 ? (
              <p className="text-sm text-text-secondary">No timeline events yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-lavender pl-5">
                {[...history].reverse().map((entry, idx) => (
                  <li key={`${entry.status}-${idx}`} className="relative">
                    <span className="absolute -left-[1.45rem] top-1.5 h-3 w-3 rounded-full border-2 border-brand bg-surface" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={entry.status}>
                        {String(entry.status).replaceAll('_', ' ')}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        {entry.changedAt
                          ? format(new Date(entry.changedAt), 'dd MMM yyyy, HH:mm')
                          : '—'}
                      </span>
                    </div>
                    {entry.note ? (
                      <p className="mt-1 text-sm text-text-secondary">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Customer">
            <div className="space-y-1 text-sm">
              <p className="font-bold text-primary">
                {receipt.customer || receipt.shippingAddress?.name || '—'}
              </p>
              <p className="text-text-secondary">
                {receipt.customerPhone || receipt.shippingAddress?.phone || '—'}
              </p>
              <p className="text-text-secondary">
                {receipt.customerEmail || receipt.shippingAddress?.email || '—'}
              </p>
              {receipt.shippingAddress?.addressLine ? (
                <p className="mt-3 text-text-secondary">
                  {receipt.shippingAddress.addressLine}
                  <br />
                  {receipt.shippingAddress.city}
                  {receipt.shippingAddress.postalCode
                    ? `, ${receipt.shippingAddress.postalCode}`
                    : ''}
                </p>
              ) : null}
            </div>
          </Card>

          <Card title="Payment">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-lavender p-2.5 text-brand">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">
                  {METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
                </p>
                <p className="text-xs capitalize text-text-secondary">{receipt.paymentStatus}</p>
              </div>
            </div>
            <Link
              to={`/orders/${orderId}`}
              className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline"
            >
              Order {receipt.orderNumber || orderId}
            </Link>
          </Card>

          {receipt.storeSnapshot ? (
            <Card title="Issued by">
              <p className="text-sm font-bold text-primary">{receipt.storeSnapshot.name}</p>
              <p className="mt-1 text-sm text-text-secondary">{receipt.storeSnapshot.address}</p>
              <p className="text-sm text-text-secondary">{receipt.storeSnapshot.contactPhone}</p>
            </Card>
          ) : null}

          {receipt.refund ? (
            <Card title="Refund">
              <p className="text-sm font-extrabold text-danger">
                {formatCurrency(receipt.refund.amount)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{receipt.refund.reason}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
