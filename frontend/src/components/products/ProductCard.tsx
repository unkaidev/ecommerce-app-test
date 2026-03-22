'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import type { Product } from '@/types';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const firstVariant = product.variants?.[0];
  const imageUrl = product.images?.[0] ?? '/placeholder-product.jpg';
  const price = parseFloat(product.price);
  const compareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
  const discountPct = compareAt
    ? Math.round((1 - price / compareAt) * 100)
    : null;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!firstVariant) return;
    setIsAdding(true);
    try {
      await addItem(firstVariant.id, 1);
    } catch {
      // Error handled by store
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Link href={`/products/${product.slug}`} className={cn('group block', className)}>
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-square mb-3">
        <Image
          src={imageUrl}
          alt={`${product.name} — product image`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Sale badge */}
        {discountPct && (
          <span className="absolute top-2 left-2 rounded bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground">
            -{discountPct}%
          </span>
        )}

        {/* Wishlist button */}
        <button
          aria-label={`Add ${product.name} to wishlist`}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="h-3.5 w-3.5" />
        </button>

        {/* Add to cart overlay */}
        {firstVariant && (
          <button
            aria-label={`Add ${product.name} to cart`}
            onClick={handleAddToCart}
            disabled={isAdding}
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 bg-primary py-2.5 text-sm font-medium text-primary-foreground translate-y-full opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-70"
          >
            <ShoppingCart className="h-4 w-4" />
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>
        )}
      </div>

      {/* Product info */}
      <div className="space-y-1">
        {product.category && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {product.category.name}
          </p>
        )}
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-bold tabular-nums">{formatPrice(price)}</span>
          {compareAt && (
            <span className="text-sm text-muted-foreground line-through tabular-nums">
              {formatPrice(compareAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="block animate-pulse">
      <div className="rounded-lg bg-muted aspect-square mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
