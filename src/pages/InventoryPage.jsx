import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Filter, Layers, Pencil, Plus, Search, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, categoriesApi } from '../services/api';
import { PageHeader, Card, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination, { DEFAULT_PAGE_SIZE } from '../components/common/Pagination';
import { asList, cn, formatCurrency, getApiError, getListMeta } from '../utils/helpers';

const CATEGORY_PILLS = {
  books: 'bg-violet-100 text-brand',
  stationery: 'bg-amber-100 text-amber-700',
  bags: 'bg-rose-100 text-rose-700',
};

function stockMeta(p) {
  const qty = Number(p.stockQuantity) || 0;
  const low = Number(p.lowStockThreshold ?? 5);
  if (qty <= 0) return { label: `Out of Stock (${qty})`, tone: 'text-rose-600', dot: 'bg-rose-500' };
  if (qty <= low) return { label: `Low Stock (${qty})`, tone: 'text-amber-600', dot: 'bg-amber-500' };
  return { label: `In Stock (${qty})`, tone: 'text-emerald-600', dot: 'bg-emerald-500' };
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: 100 }),
  });

  const productsQuery = useQuery({
    queryKey: ['products', { search, categoryId, stockFilter, page }],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        categoryId: categoryId || undefined,
        stockStatus: stockFilter === 'all' ? undefined : stockFilter,
        page,
        limit: DEFAULT_PAGE_SIZE,
        sort: 'newest',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to delete product')),
  });

  const categories = asList(categoriesQuery.data);
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c._id] = c;
    });
    return map;
  }, [categories]);

  const products = useMemo(() => asList(productsQuery.data), [productsQuery.data]);
  const meta = useMemo(
    () => getListMeta(productsQuery.data, { page, limit: DEFAULT_PAGE_SIZE }),
    [productsQuery.data, page]
  );

  if (productsQuery.isError) {
    return (
      <ErrorState
        message={productsQuery.error?.response?.data?.message || 'Failed to load inventory'}
        onRetry={() => productsQuery.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventory Management"
        description="Update and track your bookstore catalog assets."
        actions={
          <Link to="/inventory/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add New Product
            </Button>
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, author, or SKU..."
              className="h-11 w-full rounded-xl border border-border bg-lavender-soft pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <Select
            className="lg:w-48"
            placeholder="All Categories"
            leadingIcon={Layers}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
          />
          <Select
            className="lg:w-44"
            placeholder="Stock Status"
            leadingIcon={Filter}
            value={stockFilter === 'all' ? '' : stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value || 'all');
              setPage(1);
            }}
            options={[
              { value: 'in', label: 'In Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
          />
          <Button variant="outline" aria-label="Export">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card padded={false}>
        {productsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No products found"
              description="Try another filter or add your first product."
              action={
                <Link to="/inventory/new">
                  <Button>Add New Product</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-lavender-soft/80 text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Image</th>
                  <th className="px-5 py-3 font-semibold">Product Name</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Stock Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const cat = categoryMap[p.categoryId] || {};
                  const stock = stockMeta(p);
                  const author =
                    p.specifications?.find((s) => s.key?.toLowerCase() === 'author')?.value ||
                    p.author ||
                    '';
                  return (
                    <tr key={p._id} className="border-t border-border/70 hover:bg-lavender-soft/50">
                      <td className="px-5 py-4">
                        <div className="h-12 w-10 overflow-hidden rounded-lg bg-lavender">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-brand">
                              <BookOpen className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-primary">{p.title}</p>
                        {author ? <p className="text-xs text-text-secondary">{author}</p> : null}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                            CATEGORY_PILLS[cat.slug] || 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {cat.name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-secondary">{p.sku || '—'}</td>
                      <td className="px-5 py-4 font-extrabold text-primary">
                        {formatCurrency(p.discountPrice ?? p.price)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center gap-2 text-xs font-semibold', stock.tone)}>
                          <span className={cn('h-2 w-2 rounded-full', stock.dot)} />
                          {stock.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/inventory/${p._id}`}
                            className="rounded-lg p-2 text-text-secondary hover:bg-lavender hover:text-brand"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-text-secondary hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDeleteId(p._id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={setPage}
              itemLabel="products"
            />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete product?"
        message="This will remove the product from your catalog."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
