import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Plus, Trash2, Upload, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, categoriesApi } from '../services/api';
import { PageHeader, Card, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import RichTextEditor from '../components/common/RichTextEditor';
import { cn, formatCurrency, getApiError, unwrap } from '../utils/helpers';

const MIN_HIGHLIGHTS = 2;
const MAX_HIGHLIGHTS = 4;

const emptyForm = {
  title: '',
  sku: '',
  categoryId: '',
  price: '',
  discountPrice: '',
  stockQuantity: '0',
  lowStockThreshold: '5',
  description: '',
  isPublished: false,
  images: [],
  quickFacts: [{ key: '', value: '' }],
  specifications: [{ key: '', value: '' }],
  keyHighlights: ['', ''],
};

const mapKvRows = (rows) =>
  Array.isArray(rows) && rows.length > 0
    ? rows.map((s) => ({ key: s.key || '', value: s.value || '' }))
    : [{ key: '', value: '' }];

const legacyQuickFacts = (product) => {
  const rows = [];
  if (product.author) rows.push({ key: 'Author / Brand', value: product.author });
  if (product.publisher) rows.push({ key: 'Publisher', value: product.publisher });
  if (product.language) rows.push({ key: 'Language', value: product.language });
  if (product.isbn) rows.push({ key: 'ISBN', value: product.isbn });
  if (product.sku) rows.push({ key: 'SKU', value: product.sku });
  return rows.length ? rows : [{ key: '', value: '' }];
};

const filterKv = (rows) =>
  rows
    .filter((s) => s.key.trim() && s.value.trim())
    .map((s) => ({ key: s.key.trim(), value: s.value.trim() }));


export default function ProductDetailPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: 100 }),
  });

  const productQuery = useQuery({
    queryKey: ['products', id],
    enabled: !isNew,
    queryFn: () => productsApi.get(id),
  });

  const categories = useMemo(() => {
    const data = unwrap(categoriesQuery.data);
    return data.categories || data.items || (Array.isArray(data) ? data : []);
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (isNew || !productQuery.data) return;
    const product = unwrap(productQuery.data).product || unwrap(productQuery.data);
    const highlights = Array.isArray(product.keyHighlights)
      ? product.keyHighlights.filter(Boolean)
      : [];
    setForm({
      title: product.title || '',
      sku: product.sku || '',
      categoryId: product.categoryId?._id || product.categoryId || '',
      price: product.price ?? '',
      discountPrice: product.discountPrice ?? '',
      stockQuantity: product.stockQuantity ?? 0,
      lowStockThreshold: product.lowStockThreshold ?? 5,
      description: product.description || '',
      isPublished: Boolean(product.isPublished),
      images: product.images || [],
      quickFacts:
        product.quickFacts?.length > 0
          ? mapKvRows(product.quickFacts)
          : legacyQuickFacts(product),
      specifications: mapKvRows(product.specifications),
      keyHighlights:
        highlights.length >= MIN_HIGHLIGHTS
          ? highlights.slice(0, MAX_HIGHLIGHTS)
          : [...highlights, ...Array(MIN_HIGHLIGHTS - highlights.length).fill('')],
    });
  }, [isNew, productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isNew ? productsApi.create(payload) : productsApi.update(id, payload),
    onSuccess: (res) => {
      const product = unwrap(res).product || unwrap(res);
      toast.success(isNew ? 'Product created' : 'Product updated');
      qc.invalidateQueries({ queryKey: ['products'] });
      if (isNew && product?._id) navigate(`/inventory/${product._id}`, { replace: true });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save product')),
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateKv = (field, index, key, value) => {
    setForm((prev) => {
      const rows = [...prev[field]];
      rows[index] = { ...rows[index], [key]: value };
      return { ...prev, [field]: rows };
    });
  };

  const addKv = (field) =>
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], { key: '', value: '' }],
    }));

  const removeKv = (field, index) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));

  const updateHighlight = (index, value) => {
    setForm((prev) => {
      const next = [...prev.keyHighlights];
      next[index] = value;
      return { ...prev, keyHighlights: next };
    });
  };

  const addHighlight = () =>
    setForm((prev) => {
      if (prev.keyHighlights.length >= MAX_HIGHLIGHTS) return prev;
      return { ...prev, keyHighlights: [...prev.keyHighlights, ''] };
    });

  const removeHighlight = (index) =>
    setForm((prev) => {
      if (prev.keyHighlights.length <= MIN_HIGHLIGHTS) return prev;
      return {
        ...prev,
        keyHighlights: prev.keyHighlights.filter((_, i) => i !== index),
      };
    });

  const removeImage = (url) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((img) => img !== url) }));

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((file) => fd.append('images', file));
    fd.append('folder', 'products');
    setUploading(true);
    try {
      const res = await productsApi.upload(fd);
      const data = unwrap(res);
      const urls = (data.images || data.urls || [])
        .map((img) => (typeof img === 'string' ? img : img.url))
        .filter(Boolean);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      toast.error(getApiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const highlights = form.keyHighlights.map((h) => h.trim()).filter(Boolean);
    if (highlights.length < MIN_HIGHLIGHTS || highlights.length > MAX_HIGHLIGHTS) {
      toast.error(`Add between ${MIN_HIGHLIGHTS} and ${MAX_HIGHLIGHTS} key highlights`);
      return;
    }

    const quickFacts = filterKv(form.quickFacts);
    const findFact = (label) =>
      quickFacts.find((r) => r.key.toLowerCase() === label)?.value;

    const payload = {
      title: form.title.trim(),
      sku: form.sku.trim(),
      categoryId: form.categoryId,
      price: Number(form.price),
      discountPrice:
        form.discountPrice === '' || form.discountPrice == null
          ? null
          : Number(form.discountPrice),
      stockQuantity: Number(form.stockQuantity) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      description: form.description || '',
      isPublished: form.isPublished,
      images: form.images,
      quickFacts,
      specifications: filterKv(form.specifications),
      keyHighlights: highlights,
      author:
        findFact('author / brand') ||
        findFact('author') ||
        findFact('brand') ||
        undefined,
      publisher: findFact('publisher') || undefined,
      language: findFact('language') || undefined,
      isbn: findFact('isbn') || undefined,
    };
    saveMutation.mutate(payload);
  };

  if (!isNew && productQuery.isError) {
    return (
      <ErrorState
        message={productQuery.error?.response?.data?.message || 'Product not found'}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  if (!isNew && productQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const filledHighlights = form.keyHighlights.filter((h) => h.trim()).length;

  return (
    <div>
      <PageHeader
        title={isNew ? 'New product' : 'Edit product'}
        description={
          isNew ? 'Create a catalog item for your storefront.' : form.title || 'Update product details.'
        }
        actions={
          <Link to="/inventory">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Title"
                  required
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </div>
              <Input
                label="SKU"
                required
                value={form.sku}
                onChange={(e) => setField('sku', e.target.value)}
              />
              <Select
                label="Category"
                required
                placeholder="Select category"
                value={form.categoryId}
                onChange={(e) => setField('categoryId', e.target.value)}
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
              />
              <Input
                label="Price (PKR)"
                type="number"
                min="0"
                step="1"
                required
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
              />
              <Input
                label="Discount price"
                type="number"
                min="0"
                step="1"
                value={form.discountPrice}
                onChange={(e) => setField('discountPrice', e.target.value)}
                helperText="Leave empty for no discount"
              />
              <Input
                label="Stock"
                type="number"
                min="0"
                required
                value={form.stockQuantity}
                onChange={(e) => setField('stockQuantity', e.target.value)}
              />
              <Input
                label="Low stock threshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setField('lowStockThreshold', e.target.value)}
              />
              <div className="sm:col-span-2">
                <RichTextEditor
                  label="Description"
                  value={form.description}
                  onChange={(html) => setField('description', html)}
                  helperText="Use the editor for paragraphs, lists, and emphasis shown on the product page."
                />
              </div>
            </div>
          </Card>

          <Card
            title="Key highlights"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHighlight}
                disabled={form.keyHighlights.length >= MAX_HIGHLIGHTS}
              >
                <Plus className="h-3.5 w-3.5" />
                Add highlight
              </Button>
            }
          >
            <p className="mb-4 text-xs text-text-secondary">
              Storefront checklist under the description. Required: {MIN_HIGHLIGHTS}–{MAX_HIGHLIGHTS}{' '}
              items ({filledHighlights}/{MAX_HIGHLIGHTS} filled).
            </p>
            <div className="space-y-3">
              {form.keyHighlights.map((text, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <Input
                    placeholder={`Highlight ${index + 1} (e.g. Ideal for readers of contemporary literary fiction)`}
                    value={text}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => removeHighlight(index)}
                    disabled={form.keyHighlights.length <= MIN_HIGHLIGHTS}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Quick facts"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => addKv('quickFacts')}>
                <Plus className="h-3.5 w-3.5" />
                Add row
              </Button>
            }
          >
            <p className="mb-4 text-xs text-text-secondary">
              Storefront Quick facts panel (e.g. Author, Publisher, Language, ISBN, SKU).
            </p>
            <div className="space-y-3">
              {form.quickFacts.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Key (e.g. Author / Brand)"
                    value={row.key}
                    onChange={(e) => updateKv('quickFacts', index, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g. Matt Haig)"
                    value={row.value}
                    onChange={(e) => updateKv('quickFacts', index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeKv('quickFacts', index)}
                    disabled={form.quickFacts.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Specifications"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addKv('specifications')}
              >
                <Plus className="h-3.5 w-3.5" />
                Add row
              </Button>
            }
          >
            <p className="mb-4 text-xs text-text-secondary">
              Extra custom key/value rows (pages, binding, dimensions, etc.) — separate from Quick facts.
            </p>
            <div className="space-y-3">
              {form.specifications.map((spec, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Key (e.g. Pages)"
                    value={spec.key}
                    onChange={(e) => updateKv('specifications', index, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g. 288)"
                    value={spec.value}
                    onChange={(e) => updateKv('specifications', index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeKv('specifications', index)}
                    disabled={form.specifications.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-elevated backdrop-blur">
            <Link to="/inventory">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={saveMutation.isPending}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card title="Visibility">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-lavender-soft/60 px-4 py-4 transition hover:border-brand/30">
              <div>
                <p className="text-sm font-bold text-primary">Published</p>
                <p className="text-xs text-text-secondary">
                  Visible on the customer storefront when enabled.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublished}
                onClick={() => setField('isPublished', !form.isPublished)}
                className={cn(
                  'relative h-7 w-12 rounded-full transition',
                  form.isPublished ? 'bg-brand' : 'bg-slate-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                    form.isPublished ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </label>
          </Card>

          <Card title="Images">
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-lavender-soft/50 px-4 py-8 text-center transition hover:border-brand/40',
                uploading && 'opacity-60'
              )}
            >
              <Upload className="h-5 w-5 text-brand" />
              <span className="text-sm font-semibold text-primary">
                {uploading ? 'Uploading…' : 'Upload images'}
              </span>
              <span className="text-xs text-text-secondary">Recommended Size : 345x255 <br></br> PNG, JPG up to several MB</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={onUpload}
              />
            </label>

            {form.images.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 py-8 text-text-secondary">
                <ImageIcon className="h-8 w-8 opacity-40" />
                <p className="text-xs">No images yet</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {form.images.map((url) => (
                  <div
                    key={url}
                    className="group relative overflow-hidden rounded-2xl border border-border"
                  >
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute right-1.5 top-1.5 rounded-xl bg-ink/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Storefront preview">
            <div className="overflow-hidden rounded-2xl border border-border bg-lavender-soft/40">
              {form.images[0] ? (
                <img src={form.images[0]} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-text-secondary">
                  <ImageIcon className="h-10 w-10 opacity-30" />
                </div>
              )}
              <div className="p-4">
                <p className="text-sm font-extrabold text-primary">
                  {form.title || 'Untitled product'}
                </p>
                <p className="mt-1 text-lg font-extrabold text-brand">
                  {formatCurrency(form.discountPrice || form.price || 0)}
                </p>
                {form.discountPrice ? (
                  <p className="text-xs text-text-secondary line-through">
                    {formatCurrency(form.price || 0)}
                  </p>
                ) : null}
                {filledHighlights > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {form.keyHighlights
                      .filter((h) => h.trim())
                      .slice(0, 4)
                      .map((h) => (
                        <li key={h} className="flex gap-2 text-xs text-text-secondary">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                          <span className="line-clamp-2">{h}</span>
                        </li>
                      ))}
                  </ul>
                ) : null}
                <p className="mt-3 inline-flex rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                  Stock: {form.stockQuantity || 0} · {form.isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </form>
    </div>
  );
}
