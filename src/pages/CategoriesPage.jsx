import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi } from '../services/api';
import { PageHeader, Card, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { CATEGORY_ICONS, getCategoryIcon } from '../constants/categoryIcons';
import { asList, cn, getApiError } from '../utils/helpers';

const emptyForm = {
  name: '',
  description: '',
  icon: 'layers',
  sortOrder: '0',
  isActive: true,
};

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['categories', search],
    queryFn: () =>
      categoriesApi.list({
        limit: 100,
        search: search || undefined,
      }),
  });

  const categories = useMemo(() => asList(query.data), [query.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? categoriesApi.update(editing._id, payload) : categoriesApi.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category created');
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save category')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success('Category deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to delete category')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      icon: cat.icon || 'layers',
      sortOrder: String(cat.sortOrder ?? 0),
      isActive: cat.isActive !== false,
    });
    setFormOpen(true);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      icon: form.icon || 'layers',
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    });
  };

  if (query.isError) {
    return (
      <ErrorState
        message={getApiError(query.error, 'Failed to load categories')}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize inventory into store-scoped categories for your domain."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New category
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {formOpen ? (
        <Card title={editing ? 'Edit category' : 'Create category'} className="mb-6">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField('sortOrder', e.target.value)}
            />

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-text-primary">
                Category icon <span className="text-rose-500">*</span>
              </p>
              <p className="mb-3 text-xs text-text-secondary">
                Pick a default icon for this category. It appears on your storefront.
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {CATEGORY_ICONS.map(({ key, label, Icon }) => {
                  const selected = form.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setField('icon', key)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[10px] font-medium transition',
                        selected
                          ? 'border-brand bg-lavender text-brand shadow-sm'
                          : 'border-border bg-surface text-text-secondary hover:border-brand/40 hover:bg-lavender-soft'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="line-clamp-1 w-full text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>
            <Select
              label="Status"
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setField('isActive', e.target.value === 'active')}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                {editing ? 'Save changes' : 'Create category'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : categories.length === 0 && !formOpen ? (
        <EmptyState
          title="No categories yet"
          description="Create categories so inventory can be grouped for your store domain."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New category
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden" padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-background/80 text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Slug</th>
                  <th className="px-5 py-3 font-semibold">Sort</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  return (
                    <tr key={cat._id} className="hover:bg-background/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lavender text-brand">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold text-text-primary">{cat.name}</p>
                            {cat.description ? (
                              <p className="line-clamp-1 text-xs text-text-secondary">
                                {cat.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                        {cat.slug}
                      </td>
                      <td className="px-5 py-3">{cat.sortOrder ?? 0}</td>
                      <td className="px-5 py-3">
                        <Badge status={cat.isActive === false ? 'inactive' : 'active'}>
                          {cat.isActive === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteId(cat._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete category?"
        message="Products in this category must be reassigned first. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
