'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { api } from '@/lib/api';

const shippingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  line1: z.string().min(1, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(3, 'Valid postal code is required'),
  country: z.string().length(2, 'Country must be 2-letter code'),
  notes: z.string().max(500).optional(),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;

const STEPS = ['Shipping', 'Review', 'Confirm'] as const;
type Step = (typeof STEPS)[number];

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('Shipping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items, subtotal } = useCartStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
  });

  const tax = subtotal * 0.08;
  const shipping = subtotal >= 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  async function onShippingSubmit() {
    setStep('Review');
  }

  async function onPlaceOrder() {
    setIsSubmitting(true);
    setError(null);

    try {
      // In a real scenario: first create the address, then place order with its ID
      // For this demo we use a placeholder address ID
      const order = await api.orders.create({
        shippingAddressId: 'placeholder-address-id',
        notes: getValues('notes'),
      });
      router.push(`/orders/${order.id}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i <= stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${i === stepIndex ? '' : 'text-muted-foreground'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form area */}
        <div className="lg:col-span-2">
          {step === 'Shipping' && (
            <form onSubmit={handleSubmit(onShippingSubmit)} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="text-sm font-medium block mb-1">First Name</label>
                  <input
                    id="firstName"
                    {...register('firstName')}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    aria-required="true"
                  />
                  {errors.firstName && (
                    <p role="alert" className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="text-sm font-medium block mb-1">Last Name</label>
                  <input
                    id="lastName"
                    {...register('lastName')}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    aria-required="true"
                  />
                  {errors.lastName && (
                    <p role="alert" className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="line1" className="text-sm font-medium block mb-1">Address Line 1</label>
                <input
                  id="line1"
                  {...register('line1')}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  aria-required="true"
                />
                {errors.line1 && (
                  <p role="alert" className="text-sm text-destructive mt-1">{errors.line1.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="line2" className="text-sm font-medium block mb-1">Address Line 2 (optional)</label>
                <input id="line2" {...register('line2')} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="text-sm font-medium block mb-1">City</label>
                  <input id="city" {...register('city')} className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
                  {errors.city && (
                    <p role="alert" className="text-sm text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="state" className="text-sm font-medium block mb-1">State</label>
                  <input id="state" {...register('state')} className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
                  {errors.state && (
                    <p role="alert" className="text-sm text-destructive mt-1">{errors.state.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="postalCode" className="text-sm font-medium block mb-1">Postal Code</label>
                  <input id="postalCode" {...register('postalCode')} className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
                  {errors.postalCode && (
                    <p role="alert" className="text-sm text-destructive mt-1">{errors.postalCode.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="country" className="text-sm font-medium block mb-1">Country (ISO 2-letter)</label>
                  <input id="country" {...register('country')} placeholder="US" maxLength={2} className="w-full rounded-md border px-3 py-2 text-sm" aria-required="true" />
                  {errors.country && (
                    <p role="alert" className="text-sm text-destructive mt-1">{errors.country.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="text-sm font-medium block mb-1">Order Notes (optional)</label>
                <textarea id="notes" {...register('notes')} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continue to Review
              </button>
            </form>
          )}

          {step === 'Review' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review Your Order</h2>
              <div className="rounded-lg border p-4 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.variant?.product?.name ?? 'Product'} × {item.quantity}</span>
                    <span className="font-medium tabular-nums">
                      {formatPrice(parseFloat(item.unitPrice) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('Shipping')}
                  className="flex-1 rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={onPlaceOrder}
                  disabled={isSubmitting}
                  className="flex-1 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="rounded-lg border bg-card p-6 h-fit">
          <h2 className="font-semibold mb-4">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="tabular-nums">
                {shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{formatPrice(tax)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
