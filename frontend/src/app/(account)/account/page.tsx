'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { User } from '@/types';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(30).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/\d/, 'Must contain a digit'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

function ProfileForm({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.auth.updateProfile(data);
      onUpdated(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <section aria-labelledby="profile-heading" className="rounded-lg border p-6">
      <h2 id="profile-heading" className="text-lg font-semibold mb-4">
        Profile Information
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium block mb-1">
              First Name
            </label>
            <input
              id="firstName"
              {...register('firstName')}
              className="w-full rounded-md border px-3 py-2 text-sm"
              aria-required="true"
            />
            {errors.firstName && (
              <p role="alert" className="text-sm text-destructive mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium block mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              {...register('lastName')}
              className="w-full rounded-md border px-3 py-2 text-sm"
              aria-required="true"
            />
            {errors.lastName && (
              <p role="alert" className="text-sm text-destructive mt-1">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium block mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed"
            aria-describedby="email-hint"
          />
          <p id="email-hint" className="text-xs text-muted-foreground mt-1">
            Email cannot be changed.
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium block mb-1">
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            autoComplete="tel"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Profile updated successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}

function ChangePasswordForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(data: PasswordFormValues) {
    setError(null);
    setSuccess(false);
    try {
      await api.auth.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    }
  }

  return (
    <section aria-labelledby="password-heading" className="rounded-lg border p-6">
      <h2 id="password-heading" className="text-lg font-semibold mb-4">
        Change Password
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="currentPassword" className="text-sm font-medium block mb-1">
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            {...register('currentPassword')}
            autoComplete="current-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            aria-required="true"
          />
          {errors.currentPassword && (
            <p role="alert" className="text-sm text-destructive mt-1">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="text-sm font-medium block mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            {...register('newPassword')}
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            aria-required="true"
          />
          {errors.newPassword && (
            <p role="alert" className="text-sm text-destructive mt-1">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium block mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            aria-required="true"
          />
          {errors.confirmPassword && (
            <p role="alert" className="text-sm text-destructive mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Password changed successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.users.me();
        setUser(result.data);
      } catch {
        setError('Failed to load profile. Please sign in again.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div role="alert" className="rounded-md border border-destructive p-4 text-sm text-destructive">
        {error ?? 'Could not load profile.'}
        <Link href="/login" className="ml-2 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and security settings
        </p>
      </div>

      <nav className="flex gap-4 text-sm border-b pb-3" aria-label="Account navigation">
        <Link href="/account" className="font-medium text-primary border-b-2 border-primary pb-3 -mb-3">
          Profile
        </Link>
        <Link href="/account/orders" className="text-muted-foreground hover:text-foreground transition-colors">
          Orders
        </Link>
        <Link href="/account/addresses" className="text-muted-foreground hover:text-foreground transition-colors">
          Addresses
        </Link>
      </nav>

      <ProfileForm user={user} onUpdated={setUser} />
      <ChangePasswordForm />
    </div>
  );
}
