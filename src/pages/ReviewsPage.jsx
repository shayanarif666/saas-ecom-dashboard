import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Star, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { reviewsApi } from '../services/api';
import { PageHeader, Card, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import Badge from '../components/common/Badge';
import Select from '../components/common/Select';
import ConfirmDialog from '../components/common/ConfirmDialog';
import IconTooltip from '../components/common/IconTooltip';
import Pagination, { DEFAULT_PAGE_SIZE } from '../components/common/Pagination';
import { asList, getApiError, getListMeta } from '../utils/helpers';

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const query = useQuery({
    queryKey: ['reviews', filter, page],
    queryFn: () =>
      reviewsApi.list({
        status: filter === 'all' ? undefined : filter,
        page,
        limit: DEFAULT_PAGE_SIZE,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => reviewsApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'approved' ? 'Review approved' : 'Review rejected');
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update review')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reviewsApi.remove(id),
    onSuccess: () => {
      toast.success('Review deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to delete review')),
  });

  const reviews = useMemo(() => {
    const list = asList(query.data);
    return list.map((r) => ({
      ...r,
      id: r._id || r.id,
    }));
  }, [query.data]);

  const meta = useMemo(
    () => getListMeta(query.data, { page, limit: DEFAULT_PAGE_SIZE }),
    [query.data, page]
  );

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.response?.data?.message || 'Failed to load reviews'}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Moderate customer feedback before it appears on your storefront."
        actions={
          <div className="w-44">
            <Select
              placeholder="All statuses"
              value={filter === 'all' ? '' : filter}
              onChange={(e) => {
                setFilter(e.target.value || 'all');
                setPage(1);
              }}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>
        }
      />

      <Card padded={false}>
        {query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No reviews" description="Nothing matches this filter." />
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-lavender-soft text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">Comment</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-t border-border/70 hover:bg-lavender-soft/40">
                    <td className="px-5 py-4 font-bold text-primary">{r.product}</td>
                    <td className="px-5 py-4 text-text-secondary">{r.customer}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {r.rating}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-text-secondary">{r.comment}</td>
                    <td className="px-5 py-4 text-xs text-text-secondary">
                      {r.createdAt || r.date
                        ? format(new Date(r.createdAt || r.date), 'dd MMM yyyy')
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={r.status === 'approved' ? 'completed' : r.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <IconTooltip
                          label="Approve"
                          tone="success"
                          disabled={statusMutation.isPending || r.status === 'approved'}
                          onClick={() =>
                            statusMutation.mutate({ id: r.id, status: 'approved' })
                          }
                        >
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        </IconTooltip>
                        <IconTooltip
                          label="Reject"
                          tone="danger"
                          disabled={statusMutation.isPending || r.status === 'rejected'}
                          onClick={() =>
                            statusMutation.mutate({ id: r.id, status: 'rejected' })
                          }
                        >
                          <X className="h-4 w-4" strokeWidth={2.5} />
                        </IconTooltip>
                        <IconTooltip
                          label="Delete"
                          tone="muted"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconTooltip>
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
            itemLabel="reviews"
          />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete review?"
        message="This permanently removes the customer review."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
