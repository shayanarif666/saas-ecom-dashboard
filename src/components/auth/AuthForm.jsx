import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../common/Input';
import Button from '../common/Button';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z
  .object({
    storeName: z.string().min(2, 'Store name is required').max(120),
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

/**
 * Reusable auth form — mode: 'login' | 'register'
 */
export default function AuthForm({ mode = 'login', onSubmit, loading }) {
  const isRegister = mode === 'register';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: isRegister
      ? {
          storeName: '',
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
        }
      : { email: '', password: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {isRegister ? (
        <>
          <Input
            label="Store name"
            required
            placeholder="e.g. Ali's Book Corner"
            error={errors.storeName?.message}
            {...register('storeName')}
          />
          <Input label="Your name" required error={errors.name?.message} {...register('name')} />
        </>
      ) : null}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      {isRegister ? (
        <Input
          label="Phone"
          type="tel"
          placeholder="03XXXXXXXXX"
          error={errors.phone?.message}
          {...register('phone')}
        />
      ) : null}

      <Input
        label="Password"
        type="password"
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        required
        helperText={isRegister ? 'At least 8 characters' : undefined}
        error={errors.password?.message}
        {...register('password')}
      />

      {isRegister ? (
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      ) : null}

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {isRegister ? 'Create store & account' : 'Sign in'}
      </Button>
    </form>
  );
}
