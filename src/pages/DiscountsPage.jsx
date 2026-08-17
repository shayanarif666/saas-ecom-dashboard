import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, TicketPercent } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { discountsApi } from '../services/api';
import { PageHeader, Card, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination, { DEFAULT_PAGE_SIZE } from '../components/common/Pagination';
import { formatCurrency, formatNumber, getApiError, unwrap, getListMeta } from '../utils/helpers';

const emptyForm = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '0',
  startDate: '',
  endDate: '',
  usageLimit: '',
  isActive: true,
};

const toDateInput = (value) => {
  if (!value) return '';
  try {
    return format(new Date(value), 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

export default function DiscountsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [testCode, setTestCode] = useState('');
  const [testSubtotal, setTestSubtotal] = useState('2000');
  const [testResult, setTestResult] = useState(null);

  const query = useQuery({
    queryKey: ['discounts', page],
    queryFn: () => discountsApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const discounts = useMemo(() => {
    const data = unwrap(query.data);
    return data.discounts || data.items || [];
  }, [query.data]);

  const meta = useMemo(
    () => getListMeta(query.data, { page, limit: DEFAULT_PAGE_SIZE }),
    [query.data, page]
  );

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? discountsApi.update(editing._id, payload) : discountsApi.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'Discount updated' : 'Discount created');
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save discount')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => discountsApi.remove(id),
    onSuccess: () => {
      toast.success('Discount deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to delete discount')),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      discountsApi.validate({
        code: testCode.trim().toUpperCase(),
        orderSubtotal: Number(testSubtotal) || 0,
      }),
    onSuccess: (res) => {
      const data = unwrap(res);
      setTestResult({
        ok: true,
        message:
          data.message ||
          `Valid — discount ${formatCurrency(data.discountAmount || 0)}`,
        discountAmount: data.discountAmount,
      });
      toast.success('Coupon is valid');
    },
    onError: (err) => {
      setTestResult({
        ok: false,
        message: getApiError(err, 'Invalid coupon'),
      });
      toast.error(getApiError(err, 'Invalid coupon'));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      code: d.code || '',
      type: d.type || 'percentage',
      value: d.value ?? '',
      minOrderAmount: d.minOrderAmount ?? 0,
      startDate: toDateInput(d.startDate),
      endDate: toDateInput(d.endDate),
      usageLimit: d.usageLimit ?? '',
      isActive: d.isActive !== false,
    });
    setFormOpen(true);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      startDate: form.startDate
        ? new Date(`${form.startDate}T00:00:00.000`).toISOString()
        : undefined,
      endDate: form.endDate
        ? new Date(`${form.endDate}T23:59:59.999`).toISOString()
        : undefined,
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      isActive: form.isActive,
    };
    saveMutation.mutate(payload);
  };

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.response?.data?.message || 'Failed to load discounts'}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Discounts & Coupons"
        description="Create coupon codes customers can apply on cart and checkout. Usage is counted when an order is placed."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New coupon
          </Button>
        }
      />

      <Card className="mb-6" title="Test a coupon">
        <p className="mb-4 text-sm text-text-secondary">
          Preview whether a code is valid for a sample order subtotal before sharing it
          on the storefront.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!testCode.trim()) {
              toast.error('Enter a coupon code');
              return;
            }
            testMutation.mutate();
          }}
        >
          <Input
            label="Coupon code"
            value={testCode}
            onChange={(e) => setTestCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
          <Input
            label="Order subtotal"
            type="number"
            min="0"
            value={testSubtotal}
            onChange={(e) => setTestSubtotal(e.target.value)}
          />
          <Button type="submit" loading={testMutation.isPending}>
            <TicketPercent className="h-4 w-4" />
            Validate
          </Button>
        </form>
        {testResult ? (
          <p
            className={`mt-3 text-sm font-medium ${
              testResult.ok ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {testResult.message}
            {testResult.ok && testResult.discountAmount != null
              ? ` · Saves ${formatCurrency(testResult.discountAmount)}`
              : ''}
          </p>
        ) : null}
      </Card>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : discounts.length === 0 && !formOpen ? (
        <EmptyState
          title="No coupons yet"
          description="Create a coupon code so customers can apply it at cart or checkout."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New coupon
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden" padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-background/80 text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Value</th>
                  <th className="px-5 py-3 font-semibold">Min order</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Usage</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {discounts.map((d) => (
                  <tr key={d._id} className="hover:bg-background/50">
                    <td className="px-5 py-3 font-semibold tracking-wide">{d.code}</td>
                    <td className="px-5 py-3">
                      <Badge status={d.type}>{d.type}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)}
                    </td>
                    <td className="px-5 py-3">{formatCurrency(d.minOrderAmount)}</td>
                    <td className="px-5 py-3 text-xs text-text-secondary">
                      {d.startDate ? format(new Date(d.startDate), 'dd MMM yyyy') : '—'}
                      {' → '}
                      {d.endDate ? format(new Date(d.endDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {formatNumber(d.usedCount || 0)}
                      {d.usageLimit != null ? ` / ${formatNumber(d.usageLimit)}` : ''}
                    </td>
                    <td className="px-5 py-3">
                      <Badge status={d.isActive ? 'active' : 'cancelled'}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(d._id)}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={setPage}
            itemLabel="discounts"
          />
        </Card>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Close"
            onClick={() => setFormOpen(false)}
          />
          <form
            onSubmit={onSubmit}
            className="relative w-full max-w-lg animate-fade-up rounded-lg bg-surface p-6 shadow-modal"
          >
            <h3 className="text-lg font-bold text-text-primary">
              {editing ? 'Edit coupon' : 'New coupon'}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Customers enter this code on cart or checkout to reduce their order total.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Code"
                  required
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                />
              </div>
              <Select
                label="Type"
                value={form.type}
                onChange={(e) => setField('type', e.target.value)}
                options={[
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed', label: 'Fixed amount' },
                ]}
              />
              <Input
                label="Value"
                type="number"
                min="0"
                required
                value={form.value}
                onChange={(e) => setField('value', e.target.value)}
              />
              <Input
                label="Min order amount"
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={(e) => setField('minOrderAmount', e.target.value)}
              />
              <Input
                label="Usage limit"
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(e) => setField('usageLimit', e.target.value)}
                helperText="Leave empty for unlimited"
              />
              <Input
                label="Start date"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
              />
              <Input
                label="End date"
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
              />
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={form.isActive}
                  onChange={(e) => setField('isActive', e.target.checked)}
                />
                <span className="text-sm font-medium text-text-primary">Active</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                {editing ? 'Save changes' : 'Create coupon'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete coupon?"
        message="Customers will no longer be able to use this coupon code."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
