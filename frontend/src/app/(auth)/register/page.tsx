'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/\d/, 'Must contain at least one digit'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    setError(null);
    try {
      const tokens = await api.auth.register(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-2">Create Account</h1>
      <p className="text-muted-foreground text-sm mb-6">Join us today.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium block mb-1">First Name</label>
            <input id="firstName" {...register('firstName')} className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
            {errors.firstName && (
              <p role="alert" className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium block mb-1">Last Name</label>
            <input id="lastName" {...register('lastName')} className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
            {errors.lastName && (
              <p role="alert" className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium block mb-1">Email</label>
          <input id="email" type="email" {...register('email')} autoComplete="email" className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium block mb-1">Password</label>
          <input id="password" type="password" {...register('password')} autoComplete="new-password" className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
          {errors.password && (
            <p role="alert" className="text-sm text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">Sign In</Link>
      </p>
    </div>
  );
}
