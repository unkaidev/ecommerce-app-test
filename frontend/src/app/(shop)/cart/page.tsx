'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart.store';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

export default function CartPage() {
  const { items, subtotal, totalItems, fetchCart, updateItem, removeItem, isLoading } =
    useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Add some products to get started.</p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.variant?.product;
            const imageUrl = product?.images?.[0] ?? '/placeholder-product.jpg';
            const unitPrice = parseFloat(item.unitPrice);

            return (
              <div key={item.id} className="flex gap-4 rounded-lg border bg-card p-4">
                <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                  <Image
                    src={imageUrl}
                    alt={product?.name ?? 'Product image'}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{product?.name ?? 'Unknown Product'}</h3>
                  {item.variant && (
                    <p className="text-sm text-muted-foreground">{item.variant.name}</p>
                  )}
                  <p className="font-bold tabular-nums mt-1">{formatPrice(unitPrice)}</p>
                </div>
                <div className="flex flex-col items-end justify-between gap-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${product?.name ?? 'item'} from cart`}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                      aria-label="Decrease quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-accent transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-accent transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold tabular-nums">
                    {formatPrice(unitPrice * item.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="rounded-lg border bg-card p-6 h-fit">
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">
                {subtotal >= 50 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <span className="tabular-nums">{formatPrice(5.99)}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span className="font-medium tabular-nums">{formatPrice(subtotal * 0.08)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatPrice(subtotal + (subtotal >= 50 ? 0 : 5.99) + subtotal * 0.08)}
              </span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="mt-6 w-full inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Proceed to Checkout
          </Link>

          <Link
            href="/products"
            className="mt-3 w-full inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
