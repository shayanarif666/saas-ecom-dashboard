import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, storeApi, categoriesApi } from '../services/api';
import { PageHeader, Card, ErrorState, Skeleton } from '../components/common/States';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import RichTextEditor from '../components/common/RichTextEditor';
import { asList, cn, getApiError, unwrap } from '../utils/helpers';

const TABS = [
  { id: 'global', label: 'Global' },
  { id: 'home', label: 'Home Page' },
  { id: 'collections', label: 'Collections' },
  { id: 'about', label: 'About Page' },
  { id: 'contact', label: 'Contact Page' },
  { id: 'faq', label: 'FAQ Page' },
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'shipping', label: 'Shipping Information' },
];

const LOGO_W = 570;
const LOGO_H = 520;
const BANNER_W = 1900;
const BANNER_H = 560;
const GLOBAL_BANNER_W = 1535;
const GLOBAL_BANNER_H = 350;
const BANNER_MAX_BYTES = 2 * 1024 * 1024;

const DEFAULT_THEME = {
  primary: '#1e1b4b',
  secondary: '#f59e0b',
  buttonPrimaryBg: '#1e1b4b',
  buttonPrimaryText: '#ffffff',
  buttonSecondary: '#1e1b4b',
  buttonTertiary: '#1e1b4b',
  accent: '#1e1b4b',
};

const emptyWc = () => ({
  aboutTitle: '',
  aboutBody: '',
  aboutMission: '',
  aboutVision: '',
  aboutTargetAudience: '',
  aboutProductQualities: '',
  contactTitle: '',
  contactBody: '',
  homepageHeadline: '',
  homepageSubheadline: '',
  footerText: '',
  termsBody: '',
  privacyBody: '',
  faqBody: '',
  shippingBody: '',
  features: [],
  faqItems: [],
  collections: [],
});

const emptyState = {
  name: '',
  websiteTitle: '',
  customDomain: '',
  logoUrl: '',
  banners: [],
  faviconUrl: '',
  globalBannerUrl: '',
  aboutBannerUrl: '',
  contactBannerUrl: '',
  faqBannerUrl: '',
  trackOrderBannerUrl: '',
  themeColors: { ...DEFAULT_THEME },
  contactEmail: '',
  contactPhone: '',
  address: '',
  socialLinks: { facebook: '', instagram: '', twitter: '' },
  websiteContent: emptyWc(),
};

function socialFromStore(socialLinks) {
  if (!socialLinks) return { facebook: '', instagram: '', twitter: '' };
  const obj =
    socialLinks instanceof Map
      ? Object.fromEntries(socialLinks)
      : typeof socialLinks === 'object'
        ? socialLinks
        : {};
  return {
    facebook: obj.facebook || '',
    instagram: obj.instagram || '',
    twitter: obj.twitter || '',
  };
}

function normalizeBanners(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return { imageUrl: item, categoryId: '' };
      if (item?.imageUrl) {
        return {
          imageUrl: item.imageUrl,
          categoryId:
            item.categoryId?._id || item.categoryId || item.category?._id || '',
          _id: item._id,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeFeatures(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({
      _id: f._id,
      title: f.title || '',
      description: f.description || '',
      iconUrl: f.iconUrl || '',
    }))
    .filter((f) => f.title || f.description);
}

function normalizeFaqItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    _id: item._id,
    topHeading: item.topHeading || '',
    mainHeading: item.mainHeading || '',
    body: item.body || '',
  }));
}

function normalizeCollections(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      _id: item._id,
      title: item.title || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      categoryId: item.categoryId?._id || item.categoryId || '',
    }))
    .filter((item) => item.title || item.imageUrl);
}

function setWc(setForm, key, value) {
  setForm((p) => ({
    ...p,
    websiteContent: { ...p.websiteContent, [key]: value },
  }));
}

function readImageSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}

async function assertExactDimensions(file, width, height, label = 'Image') {
  const size = await readImageSize(file);
  if (size.width !== width || size.height !== height) {
    throw new Error(
      `${label} "${file.name}" must be exactly ${width}×${height}px (got ${size.width}×${size.height}px)`
    );
  }
}

function ImageUploadBox({
  label,
  helperText,
  uploading,
  onUpload,
  multiple = false,
  preview,
  onClear,
}) {
  return (
    <div className="w-full">
      {label ? (
        <p className="mb-1.5 text-sm font-semibold text-text-primary">{label}</p>
      ) : null}
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-lavender-soft/50 px-4 py-8 text-center transition hover:border-brand/40',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <Upload className="h-5 w-5 text-brand" />
        <span className="text-sm font-semibold text-primary">
          {uploading ? 'Uploading…' : multiple ? 'Upload images' : 'Upload image'}
        </span>
        {helperText ? <span className="text-xs text-text-secondary">{helperText}</span> : null}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          disabled={uploading}
          onChange={onUpload}
        />
      </label>
      {preview ? <div className="mt-3">{preview}</div> : null}
      {onClear ? (
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PageBannerUpload({ value, uploading, onUpload, onClear }) {
  return (
    <ImageUploadBox
      label="Banner image"
      helperText={`Required: exactly ${GLOBAL_BANNER_W}×${GLOBAL_BANNER_H}px · max 2 MB`}
      uploading={uploading}
      onUpload={onUpload}
      onClear={value ? onClear : undefined}
      preview={
        value ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <img src={value} alt="" className="aspect-[1535/350] w-full object-cover" />
          </div>
        ) : null
      }
    />
  );
}

function ColorField({ label, helperText, value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-primary">{label}</label>
      {helperText ? <p className="text-xs text-text-secondary">{helperText}</p> : null}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-surface p-1"
        />
        <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#1e1b4b" />
      </div>
      <div
        className="h-12 rounded-2xl border border-border shadow-card"
        style={{ background: value || '#000000' }}
      />
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('global');
  const [form, setForm] = useState(emptyState);
  const [uploadingBanners, setUploadingBanners] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPageBanner, setUploadingPageBanner] = useState(null);
  const [uploadingCollectionIndex, setUploadingCollectionIndex] = useState(null);

  const query = useQuery({
    queryKey: ['store', 'me'],
    queryFn: () => storeApi.getMine(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: 100 }),
  });

  const categories = asList(categoriesQuery.data);

  useEffect(() => {
    if (!query.data) return;
    const store = unwrap(query.data).store || unwrap(query.data);
    const banners =
      normalizeBanners(store.banners).length > 0
        ? normalizeBanners(store.banners)
        : normalizeBanners(store.bannerUrls);
    const tc = store.themeColors || {};
    const wc = store.websiteContent || {};
    setForm({
      name: store.name || '',
      websiteTitle: store.websiteTitle || '',
      customDomain: store.customDomain || '',
      logoUrl: store.logoUrl || '',
      banners,
      faviconUrl: store.faviconUrl || '',
      globalBannerUrl: store.globalBannerUrl || '',
      aboutBannerUrl: store.aboutBannerUrl || '',
      contactBannerUrl: store.contactBannerUrl || '',
      faqBannerUrl: store.faqBannerUrl || '',
      trackOrderBannerUrl: store.trackOrderBannerUrl || '',
      themeColors: {
        primary: tc.primary || DEFAULT_THEME.primary,
        secondary: tc.secondary || DEFAULT_THEME.secondary,
        buttonPrimaryBg:
          tc.buttonPrimaryBg ||
          tc.buttonPrimary ||
          tc.accent ||
          DEFAULT_THEME.buttonPrimaryBg,
        buttonPrimaryText: tc.buttonPrimaryText || DEFAULT_THEME.buttonPrimaryText,
        buttonSecondary: tc.buttonSecondary || DEFAULT_THEME.buttonSecondary,
        buttonTertiary:
          tc.buttonTertiary || tc.buttonSecondary || DEFAULT_THEME.buttonTertiary,
        accent:
          tc.accent ||
          tc.buttonPrimaryBg ||
          tc.buttonPrimary ||
          DEFAULT_THEME.accent,
      },
      contactEmail: store.contactEmail || '',
      contactPhone: store.contactPhone || '',
      address: store.address || '',
      socialLinks: socialFromStore(store.socialLinks),
      websiteContent: {
        ...emptyWc(),
        ...wc,
        features: normalizeFeatures(wc.features),
        faqItems: normalizeFaqItems(wc.faqItems),
        collections: normalizeCollections(wc.collections),
      },
    });
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => storeApi.updateMine(payload),
    onSuccess: () => {
      toast.success('Store settings saved');
      qc.invalidateQueries({ queryKey: ['store', 'me'] });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save settings')),
  });

  const uploadFiles = async (files) => {
    const fd = new FormData();
    files.forEach((file) => fd.append('images', file));
    const res = await productsApi.upload(fd);
    const data = unwrap(res);
    return (data.images || [])
      .map((img) => (typeof img === 'string' ? img : img.url))
      .filter(Boolean);
  };

  const onLogoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingLogo(true);
    try {
      const urls = await uploadFiles(files.slice(0, 1));
      if (urls[0]) {
        setForm((p) => ({ ...p, logoUrl: urls[0] }));
        toast.success('Logo uploaded');
      }
    } catch (err) {
      toast.error(err.message || getApiError(err, 'Logo upload failed'));
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const onFaviconUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFavicon(true);
    try {
      const urls = await uploadFiles(files.slice(0, 1));
      if (urls[0]) {
        setForm((p) => ({ ...p, faviconUrl: urls[0] }));
        toast.success('Favicon uploaded');
      }
    } catch (err) {
      toast.error(err.message || getApiError(err, 'Favicon upload failed'));
    } finally {
      setUploadingFavicon(false);
      e.target.value = '';
    }
  };

  const onPageBannerUpload = async (field, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const file = files[0];
    setUploadingPageBanner(field);
    try {
      if (file.size > BANNER_MAX_BYTES) {
        throw new Error(
          `Banner "${file.name}" exceeds 2 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
        );
      }
      await assertExactDimensions(file, GLOBAL_BANNER_W, GLOBAL_BANNER_H, 'Banner');
      const urls = await uploadFiles([file]);
      if (urls[0]) {
        setForm((p) => ({ ...p, [field]: urls[0] }));
        toast.success('Banner uploaded');
      }
    } catch (err) {
      toast.error(err.message || getApiError(err, 'Banner upload failed'));
    } finally {
      setUploadingPageBanner(null);
      e.target.value = '';
    }
  };

  const onBannerUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingBanners(true);
    try {
      for (const file of files) {
        if (file.size > BANNER_MAX_BYTES) {
          throw new Error(
            `Banner "${file.name}" exceeds 2 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
          );
        }
        // eslint-disable-next-line no-await-in-loop
        await assertExactDimensions(file, BANNER_W, BANNER_H, 'Banner');
      }
      const urls = await uploadFiles(files);
      setForm((p) => ({
        ...p,
        banners: [
          ...(p.banners || []),
          ...urls.map((imageUrl) => ({ imageUrl, categoryId: '' })),
        ],
      }));
      toast.success(`${urls.length} banner(s) uploaded — assign a category for each`);
    } catch (err) {
      toast.error(err.message || getApiError(err, 'Banner upload failed'));
    } finally {
      setUploadingBanners(false);
      e.target.value = '';
    }
  };

  const removeBanner = (index) =>
    setForm((p) => ({
      ...p,
      banners: (p.banners || []).filter((_, i) => i !== index),
    }));

  const setBannerCategory = (index, categoryId) =>
    setForm((p) => {
      const banners = [...(p.banners || [])];
      banners[index] = { ...banners[index], categoryId };
      return { ...p, banners };
    });

  const features = form.websiteContent.features || [];
  const faqItems = form.websiteContent.faqItems || [];
  const collections = form.websiteContent.collections || [];

  const addFeature = () => {
    if (features.length >= 4) {
      toast.error('Maximum 4 homepage features');
      return;
    }
    setWc(setForm, 'features', [
      ...features,
      { title: '', description: '', iconUrl: '' },
    ]);
  };

  const updateFeature = (index, patch) => {
    const next = features.map((f, i) => (i === index ? { ...f, ...patch } : f));
    setWc(setForm, 'features', next);
  };

  const removeFeature = (index) =>
    setWc(
      setForm,
      'features',
      features.filter((_, i) => i !== index)
    );

  const addFaqItem = () =>
    setWc(setForm, 'faqItems', [
      ...faqItems,
      { topHeading: '', mainHeading: '', body: '' },
    ]);

  const updateFaqItem = (index, patch) => {
    const next = faqItems.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    setWc(setForm, 'faqItems', next);
  };

  const removeFaqItem = (index) =>
    setWc(
      setForm,
      'faqItems',
      faqItems.filter((_, i) => i !== index)
    );

  const addCollection = () => {
    if (collections.length >= 12) {
      toast.error('Maximum 12 collections');
      return;
    }
    setWc(setForm, 'collections', [
      ...collections,
      { title: '', description: '', imageUrl: '', categoryId: '' },
    ]);
  };

  const updateCollection = (index, patch) => {
    const next = collections.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    setWc(setForm, 'collections', next);
  };

  const removeCollection = (index) =>
    setWc(
      setForm,
      'collections',
      collections.filter((_, i) => i !== index)
    );

  const onCollectionImageUpload = async (index, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const file = files[0];
    setUploadingCollectionIndex(index);
    try {
      if (file.size > BANNER_MAX_BYTES) {
        throw new Error(
          `Collection image exceeds 2 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
        );
      }
      const urls = await uploadFiles([file]);
      if (urls[0]) updateCollection(index, { imageUrl: urls[0] });
      toast.success('Collection banner uploaded');
    } catch (err) {
      toast.error(err.message || getApiError(err, 'Collection image upload failed'));
    } finally {
      setUploadingCollectionIndex(null);
      e.target.value = '';
    }
  };

  const setTheme = (key, value) =>
    setForm((p) => ({
      ...p,
      themeColors: { ...p.themeColors, [key]: value },
    }));

  const onSubmit = (e) => {
    e.preventDefault();
    const banners = (form.banners || [])
      .filter((b) => b.imageUrl)
      .map((b) => ({
        imageUrl: b.imageUrl,
        categoryId: b.categoryId || null,
      }));

    if (banners.length && banners.some((b) => !b.categoryId)) {
      toast.error('Select a category for every homepage banner');
      setTab('home');
      return;
    }

    const cleanFeatures = (form.websiteContent.features || [])
      .map((f) => ({
        title: String(f.title || '').trim(),
        description: String(f.description || '').trim(),
        iconUrl: String(f.iconUrl || '').trim() || undefined,
      }))
      .filter((f) => f.title);

    if (cleanFeatures.length > 0 && cleanFeatures.length < 3) {
      toast.error('Homepage features are optional, but if used provide 3 or 4');
      setTab('home');
      return;
    }
    if (cleanFeatures.length > 4) {
      toast.error('Maximum 4 homepage features');
      setTab('home');
      return;
    }

    const cleanFaq = (form.websiteContent.faqItems || [])
      .map((item) => ({
        topHeading: String(item.topHeading || '').trim(),
        mainHeading: String(item.mainHeading || '').trim(),
        body: item.body || '',
      }))
      .filter((item) => item.topHeading || item.mainHeading || item.body);

    for (const item of cleanFaq) {
      if (!item.topHeading || !item.mainHeading) {
        toast.error('Each FAQ needs a top heading and main heading');
        setTab('faq');
        return;
      }
    }

    const buttonPrimaryBg =
      form.themeColors.buttonPrimaryBg ||
      form.themeColors.buttonPrimary ||
      form.themeColors.accent;
    const themeColors = {
      primary: form.themeColors.primary,
      secondary: form.themeColors.secondary,
      buttonPrimaryBg,
      buttonPrimaryText: form.themeColors.buttonPrimaryText || '#ffffff',
      buttonSecondary: form.themeColors.buttonSecondary,
      buttonTertiary: form.themeColors.buttonTertiary,
      // Backward-compatible aliases
      buttonPrimary: buttonPrimaryBg,
      accent: buttonPrimaryBg,
    };

    const cleanCollections = (form.websiteContent.collections || [])
      .map((item) => ({
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim(),
        imageUrl: String(item.imageUrl || '').trim(),
        categoryId: item.categoryId || null,
      }))
      .filter((item) => item.title || item.imageUrl || item.description);

    for (const item of cleanCollections) {
      if (!item.title || !item.imageUrl) {
        toast.error('Each collection needs a banner and a title');
        setTab('collections');
        return;
      }
    }

    const { features: _f, faqItems: _q, collections: _c, ...restWc } = form.websiteContent;

    saveMutation.mutate({
      name: form.name.trim(),
      websiteTitle: form.websiteTitle.trim(),
      customDomain: form.customDomain.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      banners,
      faviconUrl: form.faviconUrl.trim() || undefined,
      globalBannerUrl: form.globalBannerUrl.trim(),
      aboutBannerUrl: form.aboutBannerUrl.trim(),
      contactBannerUrl: form.contactBannerUrl.trim(),
      faqBannerUrl: form.faqBannerUrl.trim(),
      trackOrderBannerUrl: form.trackOrderBannerUrl.trim(),
      themeColors,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      address: form.address.trim() || undefined,
      socialLinks: Object.fromEntries(
        Object.entries(form.socialLinks || {})
          .map(([k, v]) => [k, String(v || '').trim()])
          .filter(([, v]) => Boolean(v))
      ),
      websiteContent: {
        ...restWc,
        features: cleanFeatures,
        faqItems: cleanFaq,
        collections: cleanCollections,
      },
    });
  };

  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.response?.data?.message || 'Failed to load store settings'}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure global branding and page content for your storefront."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              tab === t.id
                ? 'bg-brand text-white shadow-card'
                : 'bg-lavender-soft text-text-secondary hover:bg-lavender hover:text-brand'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {tab === 'global' ? (
          <div className="space-y-6">
            <Card title="Logo & brand">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Store name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Website title"
                    value={form.websiteTitle}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, websiteTitle: e.target.value }))
                    }
                    placeholder={form.name || 'Shown in the browser tab'}
                    helperText="Browser tab title. Leave blank to use the store name."
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Store domain"
                    required
                    value={form.customDomain}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, customDomain: e.target.value }))
                    }
                    helperText="Unique domain for this tenant (e.g. acadex.com)."
                  />
                </div>
                <ImageUploadBox
                  label="Logo"
                  helperText={`Recommended size: ${LOGO_W}×${LOGO_H}px`}
                  uploading={uploadingLogo}
                  onUpload={onLogoUpload}
                  onClear={
                    form.logoUrl
                      ? () => setForm((p) => ({ ...p, logoUrl: '' }))
                      : undefined
                  }
                  preview={
                    form.logoUrl ? (
                      <div className="">
                        <img
                          src={form.logoUrl}
                          alt=""
                          className="max-w-[100px] object-contain"
                        />
                      </div>
                    ) : null
                  }
                />
                <ImageUploadBox
                  label="Favicon"
                  helperText="Small icon for browser tabs (recommended 32×32 or 64×64)"
                  uploading={uploadingFavicon}
                  onUpload={onFaviconUpload}
                  onClear={
                    form.faviconUrl
                      ? () => setForm((p) => ({ ...p, faviconUrl: '' }))
                      : undefined
                  }
                  preview={
                    form.faviconUrl ? (
                      <img
                        src={form.faviconUrl}
                        alt=""
                        className="max-w-[80px] object-contain"
                      />
                    ) : null
                  }
                />
                <div className="sm:col-span-2">
                  <Textarea
                    label="Footer text"
                    rows={2}
                    value={form.websiteContent.footerText}
                    onChange={(e) => setWc(setForm, 'footerText', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card
              title="Home banner"
              description={`Shown at the end of the Home page. Required size: exactly ${GLOBAL_BANNER_W}×${GLOBAL_BANNER_H}px.`}
            >
              <PageBannerUpload
                value={form.globalBannerUrl}
                uploading={uploadingPageBanner === 'globalBannerUrl'}
                onUpload={(e) => onPageBannerUpload('globalBannerUrl', e)}
                onClear={() => setForm((p) => ({ ...p, globalBannerUrl: '' }))}
              />
            </Card>

            <Card
              title="Track Order banner"
              description={`Hero banner on Track Order. Required size: exactly ${GLOBAL_BANNER_W}×${GLOBAL_BANNER_H}px.`}
            >
              <PageBannerUpload
                value={form.trackOrderBannerUrl}
                uploading={uploadingPageBanner === 'trackOrderBannerUrl'}
                onUpload={(e) => onPageBannerUpload('trackOrderBannerUrl', e)}
                onClear={() => setForm((p) => ({ ...p, trackOrderBannerUrl: '' }))}
              />
            </Card>

            <Card title="Color theme">
              <div className="grid gap-6 sm:grid-cols-2">
                <ColorField
                  label="Primary color"
                  helperText="Brand / navbar accents"
                  value={form.themeColors.primary}
                  onChange={(v) => setTheme('primary', v)}
                />
                <ColorField
                  label="Secondary color"
                  helperText="Highlights and secondary accents"
                  value={form.themeColors.secondary}
                  onChange={(v) => setTheme('secondary', v)}
                />
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <h3 className="mb-1 text-sm font-bold text-primary">Button colors</h3>
                <p className="mb-5 text-xs text-text-secondary">
                  Three button styles used across the storefront.
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <ColorField
                    label="Primary button background"
                    helperText="Filled button e.g. Shop Now"
                    value={form.themeColors.buttonPrimaryBg}
                    onChange={(v) => setTheme('buttonPrimaryBg', v)}
                  />
                  <ColorField
                    label="Primary button text"
                    helperText="Text on filled button e.g. Shop Now"
                    value={form.themeColors.buttonPrimaryText}
                    onChange={(v) => setTheme('buttonPrimaryText', v)}
                  />
                  <ColorField
                    label="Secondary button"
                    helperText="Outline border + text e.g. Contact Us"
                    value={form.themeColors.buttonSecondary}
                    onChange={(v) => setTheme('buttonSecondary', v)}
                  />
                  <ColorField
                    label="Tertiary button"
                    helperText="Text-only e.g. See All, View All"
                    value={form.themeColors.buttonTertiary}
                    onChange={(v) => setTheme('buttonTertiary', v)}
                  />
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                <div
                  className="px-5 py-8"
                  style={{
                    background: `linear-gradient(135deg, ${form.themeColors.primary}, ${form.themeColors.secondary})`,
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                    Live preview
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-white">
                    {form.name || 'Your store'}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full px-4 py-2 text-sm font-bold"
                      style={{
                        background: form.themeColors.buttonPrimaryBg,
                        color: form.themeColors.buttonPrimaryText,
                      }}
                    >
                      Shop Now
                    </button>
                    <button
                      type="button"
                      className="rounded-full border-2 bg-transparent px-4 py-2 text-sm font-bold"
                      style={{
                        borderColor: form.themeColors.buttonSecondary,
                        color: form.themeColors.buttonSecondary,
                      }}
                    >
                      Contact Us
                    </button>
                    <button
                      type="button"
                      className="bg-transparent px-2 py-2 text-sm font-bold underline-offset-4 hover:underline"
                      style={{ color: form.themeColors.buttonTertiary }}
                    >
                      See All
                    </button>
                    <button
                      type="button"
                      className="bg-transparent px-2 py-2 text-sm font-bold underline-offset-4 hover:underline"
                      style={{ color: form.themeColors.buttonTertiary }}
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === 'home' ? (
          <div className="space-y-6">
            <Card title="Homepage banners">
              <div className="grid gap-4">
                <ImageUploadBox
                  label="Banner images"
                  helperText={`Required: exactly ${BANNER_W}×${BANNER_H}px · max 2 MB · then assign a category`}
                  multiple
                  uploading={uploadingBanners}
                  onUpload={onBannerUpload}
                />

                {form.banners?.length ? (
                  <div className="space-y-4">
                    {form.banners.map((banner, index) => (
                      <div
                        key={banner._id || `${banner.imageUrl}-${index}`}
                        className="grid gap-4 rounded-2xl border border-border bg-lavender-soft/40 p-4 sm:grid-cols-[220px_1fr_auto]"
                      >
                        <div className="overflow-hidden rounded-xl border border-border bg-white">
                          <img
                            src={banner.imageUrl}
                            alt=""
                            className="aspect-[1900/560] w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 space-y-3 self-center">
                          <p className="text-sm font-semibold text-primary">
                            Banner {index + 1}
                          </p>
                          <Select
                            label="Category"
                            required
                            placeholder="Select category"
                            value={banner.categoryId || ''}
                            onChange={(e) => setBannerCategory(index, e.target.value)}
                            options={categories.map((c) => ({
                              value: c._id,
                              label: c.name,
                            }))}
                          />
                        </div>
                        <div className="flex items-start justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBanner(index)}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <ImageIcon className="h-4 w-4 opacity-50" />
                    No banners uploaded yet
                  </div>
                )}

                <Input
                  label="Homepage headline"
                  value={form.websiteContent.homepageHeadline}
                  onChange={(e) => setWc(setForm, 'homepageHeadline', e.target.value)}
                />
                <Input
                  label="Homepage subheadline"
                  value={form.websiteContent.homepageSubheadline}
                  onChange={(e) =>
                    setWc(setForm, 'homepageSubheadline', e.target.value)
                  }
                />
              </div>
            </Card>

            <Card
              title="Homepage features"
              description="Optional. If used, provide 3 or 4 features."
            >
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={feature._id || `feature-${index}`}
                    className="grid gap-3 rounded-2xl border border-border bg-lavender-soft/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">
                        Feature {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                    <Input
                      label="Title"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, { title: e.target.value })}
                    />
                    <Textarea
                      label="Description"
                      rows={2}
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(index, { description: e.target.value })
                      }
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={addFeature}
                  disabled={features.length >= 4}
                >
                  <Plus className="h-4 w-4" />
                  Add feature ({features.length}/4)
                </Button>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === 'collections' ? (
          <Card
            title="Collections"
            description="Add homepage collection cards: banner, title, and paragraph. Empty list hides the section on the storefront."
          >
            <div className="space-y-4">
              {collections.map((item, index) => (
                <div
                  key={item._id || `collection-${index}`}
                  className="grid gap-4 rounded-2xl border border-border bg-lavender-soft/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">
                      Collection {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCollection(index)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                  <ImageUploadBox
                    label="Banner"
                    helperText="Max 2 MB. Recommended size: 330x440 Portrait images work best on the storefront."
                    uploading={uploadingCollectionIndex === index}
                    onUpload={(e) => onCollectionImageUpload(index, e)}
                    onClear={
                      item.imageUrl
                        ? () => updateCollection(index, { imageUrl: '' })
                        : undefined
                    }
                    preview={
                      item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="aspect-[3/4] max-h-56 w-full rounded-xl border border-border object-contain"
                        />
                      ) : null
                    }
                  />
                  <Input
                    label="Title"
                    value={item.title}
                    onChange={(e) => updateCollection(index, { title: e.target.value })}
                    placeholder="e.g. Bags Collection"
                  />
                  <Textarea
                    label="Paragraph"
                    rows={3}
                    value={item.description}
                    onChange={(e) =>
                      updateCollection(index, { description: e.target.value })
                    }
                    placeholder="Short description shown on the collection card"
                  />
                  <Select
                    label="Link category (optional)"
                    placeholder="Shop Now goes to this category"
                    value={item.categoryId || ''}
                    onChange={(e) =>
                      updateCollection(index, { categoryId: e.target.value })
                    }
                    options={[
                      { value: '', label: 'None' },
                      ...categories.map((c) => ({
                        value: c._id,
                        label: c.name,
                      })),
                    ]}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={addCollection}
                disabled={collections.length >= 12}
              >
                <Plus className="h-4 w-4" />
                Add collection ({collections.length}/12)
              </Button>
            </div>
          </Card>
        ) : null}

        {tab === 'about' ? (
          <Card title="About page">
            <div className="grid gap-4">
              <PageBannerUpload
                value={form.aboutBannerUrl}
                uploading={uploadingPageBanner === 'aboutBannerUrl'}
                onUpload={(e) => onPageBannerUpload('aboutBannerUrl', e)}
                onClear={() => setForm((p) => ({ ...p, aboutBannerUrl: '' }))}
              />
              <Input
                label="About title"
                value={form.websiteContent.aboutTitle}
                onChange={(e) => setWc(setForm, 'aboutTitle', e.target.value)}
              />
              <RichTextEditor
                label="Detailed information about the company"
                value={form.websiteContent.aboutBody}
                onChange={(html) => setWc(setForm, 'aboutBody', html)}
                placeholder="Tell customers about your company…"
              />
              <RichTextEditor
                label="Mission"
                value={form.websiteContent.aboutMission}
                onChange={(html) => setWc(setForm, 'aboutMission', html)}
                placeholder="Your mission…"
              />
              <RichTextEditor
                label="Vision"
                value={form.websiteContent.aboutVision}
                onChange={(html) => setWc(setForm, 'aboutVision', html)}
                placeholder="Your vision…"
              />
              <RichTextEditor
                label="Target audience"
                value={form.websiteContent.aboutTargetAudience}
                onChange={(html) => setWc(setForm, 'aboutTargetAudience', html)}
                placeholder="Who you serve…"
              />
              <RichTextEditor
                label="Product qualities / why customers buy"
                value={form.websiteContent.aboutProductQualities}
                onChange={(html) => setWc(setForm, 'aboutProductQualities', html)}
                placeholder="What makes your products worth buying…"
              />
            </div>
          </Card>
        ) : null}

        {tab === 'contact' ? (
          <Card title="Contact page">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PageBannerUpload
                  value={form.contactBannerUrl}
                  uploading={uploadingPageBanner === 'contactBannerUrl'}
                  onUpload={(e) => onPageBannerUpload('contactBannerUrl', e)}
                  onClear={() => setForm((p) => ({ ...p, contactBannerUrl: '' }))}
                />
              </div>
              <Input
                label="Email"
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
              />
              <Input
                label="Phone number"
                value={form.contactPhone}
                onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>
          </Card>
        ) : null}

        {tab === 'faq' ? (
          <Card
            title="FAQ page"
            description="Each question has a top heading (e.g. SHIPPING), main heading (question), and answer paragraphs."
          >
            <div className="space-y-4">
              <PageBannerUpload
                value={form.faqBannerUrl}
                uploading={uploadingPageBanner === 'faqBannerUrl'}
                onUpload={(e) => onPageBannerUpload('faqBannerUrl', e)}
                onClear={() => setForm((p) => ({ ...p, faqBannerUrl: '' }))}
              />
              {faqItems.map((item, index) => (
                <div
                  key={item._id || `faq-${index}`}
                  className="grid gap-3 rounded-2xl border border-border bg-lavender-soft/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">
                      Question {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFaqItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                  <Input
                    label="Top heading"
                    placeholder="e.g. SHIPPING"
                    value={item.topHeading}
                    onChange={(e) =>
                      updateFaqItem(index, { topHeading: e.target.value })
                    }
                  />
                  <Input
                    label="Main heading"
                    placeholder="e.g. How long does delivery take?"
                    value={item.mainHeading}
                    onChange={(e) =>
                      updateFaqItem(index, { mainHeading: e.target.value })
                    }
                  />
                  <RichTextEditor
                    label="Paragraphs / answer"
                    value={item.body}
                    onChange={(html) => updateFaqItem(index, { body: html })}
                    placeholder="Write the answer…"
                  />
                </div>
              ))}

              <Button type="button" variant="secondary" onClick={addFaqItem}>
                <Plus className="h-4 w-4" />
                Add FAQ question
              </Button>
            </div>
          </Card>
        ) : null}

        {tab === 'terms' ? (
          <Card title="Terms & Conditions">
            <RichTextEditor
              label="Detailed terms & conditions"
              value={form.websiteContent.termsBody}
              onChange={(html) => setWc(setForm, 'termsBody', html)}
              placeholder="Write your terms & conditions…"
            />
          </Card>
        ) : null}

        {tab === 'privacy' ? (
          <Card title="Privacy Policy">
            <RichTextEditor
              label="Detailed privacy policy"
              value={form.websiteContent.privacyBody}
              onChange={(html) => setWc(setForm, 'privacyBody', html)}
              placeholder="Write your privacy policy…"
            />
          </Card>
        ) : null}

        {tab === 'shipping' ? (
          <Card title="Shipping information">
            <RichTextEditor
              label="Detailed shipping information"
              value={form.websiteContent.shippingBody}
              onChange={(html) => setWc(setForm, 'shippingBody', html)}
              placeholder="Write shipping & delivery details…"
            />
          </Card>
        ) : null}

        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button type="submit" loading={saveMutation.isPending} className="shadow-elevated">
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
