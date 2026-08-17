import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, MapPin, RotateCcw, Truck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ordersApi, billingApi } from '../services/api';
import { PageHeader, Card, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import { formatCurrency, getNextStatuses, getApiError, unwrap } from '../utils/helpers';
import { PAYMENT_STATUSES } from '../utils/constants';

export default function OrderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const query = useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id),
  });

  const order = useMemo(() => {
    const data = unwrap(query.data);
    return data.order || data;
  }, [query.data]);

  const statusMutation = useMutation({
    mutationFn: (next) => ordersApi.updateStatus(id, next),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['orders', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update status')),
  });

  const paymentMutation = useMutation({
    mutationFn: (paymentStatus) => ordersApi.updatePaymentStatus(id, paymentStatus),
    onSuccess: () => {
      toast.success('Payment status updated');
      qc.invalidateQueries({ queryKey: ['orders', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) =>
      toast.error(getApiError(err, 'Failed to update payment status')),
  });

  const refundMutation = useMutation({
    mutationFn: (payload) => ordersApi.refund(id, payload),
    onSuccess: () => {
      toast.success('Refund processed');
      setRefundOpen(false);
      setRefundReason('');
      qc.invalidateQueries({ queryKey: ['orders', id] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Refund failed')),
  });

  const openReceipt = async () => {
    try {
      const res = await billingApi.receipt(id);
      const receipt = unwrap(res).receipt || unwrap(res);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Receipt opened');
    } catch (err) {
      toast.error(getApiError(err, 'Receipt not available'));
    }
  };

  const downloadReceipt = async () => {
    try {
      const res = await billingApi.receipt(id);
      const receipt = unwrap(res).receipt || unwrap(res);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.orderNumber || id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiError(err, 'Receipt not available'));
    }
  };

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.response?.data?.message || 'Order not found'}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.isLoading || !order?._id) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const nextStatuses = getNextStatuses(order.orderStatus);
  const address = order.shippingAddress || {};
  const history = order.statusHistory || [];
  const canRefund = ['paid', 'pending'].includes(order.paymentStatus);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm') : '—'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/orders">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link to={`/billing/${id}`}>
              <Button variant="outline">
                <FileText className="h-4 w-4" />
                Receipt
              </Button>
            </Link>
            <Button variant="outline" onClick={openReceipt}>
              <FileText className="h-4 w-4" />
              Raw receipt
            </Button>
            <Button variant="outline" onClick={downloadReceipt}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            {canRefund ? (
              <Button
                variant="danger"
                onClick={() => {
                  setRefundAmount(String(order.totalAmount ?? ''));
                  setRefundOpen(true);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Refund
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <Badge status={order.orderStatus}>{String(order.orderStatus).replaceAll('_', ' ')}</Badge>
        <Badge status={order.paymentStatus}>{order.paymentStatus}</Badge>
        {order.paymentMethod ? (
          <Badge status={order.paymentMethod}>{order.paymentMethod}</Badge>
        ) : null}
        {order.paymentStatus !== 'refunded' ? (
          <div className="w-44">
            <Select
              size="sm"
              placeholder="Update payment…"
              value=""
              disabled={paymentMutation.isPending}
              onChange={(e) => {
                const value = e.target.value;
                if (!value || value === order.paymentStatus) return;
                paymentMutation.mutate(value);
              }}
              options={PAYMENT_STATUSES.filter((s) => s.value !== order.paymentStatus)}
            />
          </div>
        ) : null}
        <span className="ml-auto text-lg font-extrabold text-primary">
          {formatCurrency(order.totalAmount)}
        </span>
        {nextStatuses.length ? (
          <div className="w-48">
            <Select
              size="sm"
              placeholder="Update status…"
              value=""
              disabled={statusMutation.isPending}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                statusMutation.mutate(value);
              }}
              options={nextStatuses.map((s) => ({
                value: s,
                label: s.replaceAll('_', ' '),
              }))}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Items">
            <ul className="divide-y divide-border">
              {(order.items || []).map((item, idx) => (
                <li key={`${item.productId}-${idx}`} className="flex items-center gap-3 py-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-lavender-soft">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">{item.title}</p>
                    <p className="text-xs text-text-secondary">
                      {item.sku || '—'} · Qty {item.quantity}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                    <p className="text-xs text-text-secondary">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 rounded-2xl bg-lavender-soft/70 p-4 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-extrabold text-primary">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          <Card title="Status timeline">
            {history.length === 0 ? (
              <p className="text-sm text-text-secondary">No status history yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l-2 border-lavender pl-5">
                {[...history].reverse().map((entry, idx) => (
                  <li key={`${entry.status}-${idx}`} className="relative">
                    <span className="absolute -left-[1.45rem] top-1.5 h-3 w-3 rounded-full border-2 border-brand bg-surface" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={entry.status}>{String(entry.status).replaceAll('_', ' ')}</Badge>
                      <span className="text-xs text-text-secondary">
                        {entry.changedAt
                          ? format(new Date(entry.changedAt), 'dd MMM yyyy, HH:mm')
                          : '—'}
                      </span>
                    </div>
                    {entry.note ? <p className="mt-1 text-sm text-text-secondary">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card
            title="Shipping address"
            action={<MapPin className="h-4 w-4 text-brand" />}
          >
            <div className="space-y-1 text-sm">
              <p className="font-bold text-primary">{address.name}</p>
              <p className="text-text-secondary">{address.phone}</p>
              <p className="text-text-secondary">{address.email}</p>
              <p className="mt-3 text-primary">{address.addressLine}</p>
              <p className="text-text-secondary">
                {address.city}
                {address.postalCode ? `, ${address.postalCode}` : ''}
              </p>
            </div>
          </Card>

          <Card title="Fulfillment" action={<Truck className="h-4 w-4 text-brand" />}>
            <p className="text-sm capitalize text-text-secondary">
              Status: <span className="font-semibold text-primary">{String(order.orderStatus).replaceAll('_', ' ')}</span>
            </p>
            <p className="mt-2 text-sm capitalize text-text-secondary">
              Payment:{' '}
              {order.paymentMethod ? (
                <Badge status={order.paymentMethod} className="ml-1 align-middle">
                  {order.paymentMethod}
                </Badge>
              ) : (
                <span className="font-semibold text-primary">—</span>
              )}
            </p>
          </Card>

          {order.refund ? (
            <Card title="Refund">
              <p className="text-sm font-extrabold text-danger">
                {formatCurrency(order.refund.amount)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{order.refund.reason}</p>
              <p className="mt-2 text-xs text-text-secondary">
                {order.refund.refundedAt
                  ? format(new Date(order.refund.refundedAt), 'dd MMM yyyy, HH:mm')
                  : ''}
              </p>
            </Card>
          ) : null}

          {order.customerNote ? (
            <Card title="Customer note">
              <p className="text-sm text-text-secondary">{order.customerNote}</p>
            </Card>
          ) : null}
        </div>
      </div>

      {refundOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Close"
            onClick={() => setRefundOpen(false)}
          />
          <div className="relative w-full max-w-md animate-fade-up rounded-2xl bg-surface p-6 shadow-modal">
            <h3 className="text-lg font-bold text-text-primary">Refund this order?</h3>
            <p className="mt-2 text-sm text-text-secondary">
              This will mark the order as refunded. Enter amount and reason to continue.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                label="Refund amount"
                type="number"
                min="0"
                max={order.totalAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
              <Textarea
                label="Reason"
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refundMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={refundMutation.isPending}
                onClick={() =>
                  refundMutation.mutate({
                    amount: Number(refundAmount),
                    reason: refundReason.trim() || 'Refund issued by admin',
                  })
                }
              >
                Process refund
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
