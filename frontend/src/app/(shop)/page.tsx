import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/products/ProductCard';

export const metadata = { title: 'Home' };

export default async function HomePage() {
  // Fetch featured products server-side
  const featuredResult = await api.products.list({ limit: 8, inStock: true }).catch(() => ({
    data: [],
    meta: { total: 0, page: 1, limit: 8, totalPages: 0 },
  }));

  const categories = await api.categories.list().catch(() => []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Discover Amazing Products
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Shop the latest collection with fast shipping and easy returns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Shop Now
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center justify-center rounded-md border px-8 py-3 text-base font-medium hover:bg-accent transition-colors"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex flex-col items-center justify-center rounded-lg border bg-card p-6 hover:border-primary hover:shadow-sm transition-all"
              >
                <span className="font-semibold text-center group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12 container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground mt-1">Handpicked just for you</p>
          </div>
          <Link href="/products" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        </div>

        {featuredResult.data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredResult.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No featured products available yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
