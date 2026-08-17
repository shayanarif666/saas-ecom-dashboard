import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Check, Store, UserRound, ShieldCheck } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useMeQuery } from '../features/auth/useAuth';
import { authApi } from '../services/api';
import { cn, getApiError } from '../utils/helpers';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/authSlice';
import { useQueryClient } from '@tanstack/react-query';
import { ROLES } from '../utils/constants';

const STEPS = [
  { id: 1, label: 'Store', icon: Store },
  { id: 2, label: 'Owner', icon: UserRound },
  { id: 3, label: 'Verify', icon: ShieldCheck },
];

const storeSchema = z.object({
  storeName: z.string().min(2, 'Store name is required').max(120),
  customDomain: z
    .string()
    .min(3, 'Domain is required')
    .max(120)
    .refine(
      (v) => {
        const d = v
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .split('/')[0]
          .replace(/^www\./, '');
        return (
          d === 'localhost' ||
          /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)
        );
      },
      { message: 'Enter a valid domain (e.g. acadex.pk)' }
    ),
  businessType: z.string().max(60).optional(),
});

const ownerSchema = z
  .object({
    name: z.string().min(2, 'Name is required').max(100),
    email: z.string().email('Enter a valid email'),
    phone: z
      .string()
      .max(30)
      .optional()
      .refine((v) => !v || v.length >= 10, { message: 'Enter a valid phone' }),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const { user, status } = useSelector((s) => s.auth);
  useMeQuery(status === 'idle');

  const [step, setStep] = useState(1);
  const [storeData, setStoreData] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === ROLES.CUSTOMER || user.role === 'customer') return;
    navigate('/', { replace: true });
  }, [user, navigate]);

  const storeForm = useForm({
    resolver: zodResolver(storeSchema),
    defaultValues: { storeName: '', customDomain: '', businessType: 'bookstore' },
  });

  const ownerForm = useForm({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  if (user && user.role !== ROLES.CUSTOMER && user.role !== 'customer') {
    return <Navigate to="/" replace />;
  }

  const onStoreNext = async (values) => {
    setCheckingDomain(true);
    try {
      const domain = String(values.customDomain || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split('?')[0];
      await authApi.checkDomain({ domain, customDomain: domain });
      setStoreData({ ...values, customDomain: domain });
      setStep(2);
    } catch (err) {
      toast.error(getApiError(err, 'Domain is not available'));
    } finally {
      setCheckingDomain(false);
    }
  };

  const onOwnerNext = async (values) => {
    setSendingOtp(true);
    try {
      await authApi.registerStart({
        storeName: storeData.storeName,
        customDomain: storeData.customDomain,
        businessType: storeData.businessType || 'bookstore',
        name: values.name,
        email: values.email,
        phone: values.phone || '',
        password: values.password,
      });
      setOwnerData(values);
      setStep(3);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send OTP'));
    } finally {
      setSendingOtp(false);
    }
  };

  const onVerify = async (values) => {
    setVerifying(true);
    try {
      const res = await authApi.registerVerify({
        email: ownerData.email,
        otp: values.otp,
      });
      const created = res?.data?.user ?? res?.user;
      if (created) {
        dispatch(setUser(created));
        qc.setQueryData(['auth', 'me'], created);
      }
      toast.success(`Store ready. Welcome, ${created?.name || 'Admin'}!`);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(getApiError(err, 'OTP verification failed'));
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    if (!ownerData?.email) return;
    setResending(true);
    try {
      await authApi.registerResendOtp({ email: ownerData.email });
      toast.success('OTP resent');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to resend OTP'));
    } finally {
      setResending(false);
    }
  };

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Store details';
    if (step === 2) return 'Owner account';
    return 'Verify email';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 1) {
      return 'Your custom domain ties inventory, categories, orders, billing, and reviews to this store.';
    }
    if (step === 2) return 'Create the administrator account that manages this store.';
    return `We sent a 6-digit code to ${ownerData?.email || 'your email'}.`;
  }, [step, ownerData]);

  return (
    <AuthShell
      title={stepTitle}
      subtitle={stepSubtitle}
      panelTitle="Launch your brand"
      panelCopy="Register your domain once — every product, category, order, and receipt stays scoped to your store."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition',
                  done && 'border-brand bg-brand text-white',
                  active && !done && 'border-brand bg-lavender text-brand',
                  !active && !done && 'border-border bg-white text-text-secondary'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-xs font-semibold',
                    active || done ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  {s.label}
                </p>
              </div>
              {idx < STEPS.length - 1 ? (
                <span
                  className={cn(
                    'mx-1 hidden h-px flex-1 sm:block',
                    step > s.id ? 'bg-brand' : 'bg-border'
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <form onSubmit={storeForm.handleSubmit(onStoreNext)} className="space-y-4" noValidate>
          <Input
            label="Store name"
            required
            placeholder="e.g. Acadex Books"
            error={storeForm.formState.errors.storeName?.message}
            {...storeForm.register('storeName')}
          />
          <Input
            label="Store domain"
            required
            placeholder="www.acadex.pk"
            helperText="Bought domain (Hostinger etc.). Used to scope products, categories, orders & billing."
            error={storeForm.formState.errors.customDomain?.message}
            {...storeForm.register('customDomain')}
          />
          <Input
            label="Business type"
            placeholder="bookstore"
            error={storeForm.formState.errors.businessType?.message}
            {...storeForm.register('businessType')}
          />
          <Button type="submit" className="w-full" size="lg" loading={checkingDomain}>
            Continue
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={ownerForm.handleSubmit(onOwnerNext)} className="space-y-4" noValidate>
          <Input
            label="Your name"
            required
            error={ownerForm.formState.errors.name?.message}
            {...ownerForm.register('name')}
          />
          <Input
            label="Email"
            type="email"
            required
            helperText="OTP will be sent here for verification"
            error={ownerForm.formState.errors.email?.message}
            {...ownerForm.register('email')}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="03XXXXXXXXX"
            error={ownerForm.formState.errors.phone?.message}
            {...ownerForm.register('phone')}
          />
          <Input
            label="Password"
            type="password"
            required
            helperText="At least 8 characters"
            error={ownerForm.formState.errors.password?.message}
            {...ownerForm.register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            required
            error={ownerForm.formState.errors.confirmPassword?.message}
            {...ownerForm.register('confirmPassword')}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" size="lg" loading={sendingOtp}>
              Send OTP
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={otpForm.handleSubmit(onVerify)} className="space-y-4" noValidate>
          <Input
            label="6-digit OTP"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            maxLength={6}
            error={otpForm.formState.errors.otp?.message}
            {...otpForm.register('otp')}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" size="lg" loading={verifying}>
              Verify & create store
            </Button>
          </div>
          <button
            type="button"
            className="w-full text-center text-sm font-semibold text-primary hover:underline disabled:opacity-50"
            disabled={resending}
            onClick={onResend}
          >
            {resending ? 'Resending…' : 'Resend OTP'}
          </button>
        </form>
      ) : null}
    </AuthShell>
  );
}
