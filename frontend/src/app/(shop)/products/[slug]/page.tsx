import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await api.products.getBySlug(params.slug).catch(() => null);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await api.products.getBySlug(params.slug).catch(() => null);

  if (!product) {
    notFound();
  }

  const price = parseFloat(product.price);
  const compareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
  const discountPct = compareAt ? Math.round((1 - price / compareAt) * 100) : null;
  const mainImage = product.images?.[0] ?? '/placeholder-product.jpg';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
        {/* Image gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <Image
              src={mainImage}
              alt={`${product.name} — main product image`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(0, 5).map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded overflow-hidden bg-muted border">
                  <Image
                    src={img}
                    alt={`${product.name} — image ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-6">
          {product.category && (
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              {product.category.name}
            </p>
          )}

          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold tabular-nums">{formatPrice(price)}</span>
            {compareAt && (
              <span className="text-lg text-muted-foreground line-through tabular-nums">
                {formatPrice(compareAt)}
              </span>
            )}
            {discountPct && (
              <span className="text-sm font-bold text-destructive">-{discountPct}%</span>
            )}
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const available = variant.inventory
                    ? variant.inventory.quantity - variant.inventory.reserved
                    : 0;
                  return (
                    <button
                      key={variant.id}
                      disabled={available === 0}
                      className="rounded-md border px-4 py-2 text-sm font-medium hover:border-primary hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Select ${variant.name}`}
                    >
                      {variant.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add to cart */}
          <div className="flex gap-3">
            <button
              className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label={`Add ${product.name} to cart`}
            >
              Add to Cart
            </button>
            <button
              aria-label={`Add ${product.name} to wishlist`}
              className="flex items-center justify-center rounded-md border h-11 w-11 hover:bg-accent transition-colors"
            >
              ♡
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
