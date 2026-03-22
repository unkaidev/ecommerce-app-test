import { Suspense } from 'react';
import { api } from '@/lib/api';
import { ProductCard, ProductGridSkeleton } from '@/components/products/ProductCard';

export const metadata = { title: 'Products' };

interface ProductsPageProps {
  searchParams: {
    page?: string;
    search?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = parseInt(searchParams.page ?? '1', 10);

  const result = await api.products.list({
    page,
    limit: 20,
    search: searchParams.search,
    categoryId: searchParams.categoryId,
    minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    sort: searchParams.sort,
    order: searchParams.order,
  }).catch(() => ({
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
  }));

  const categories = await api.categories.list().catch(() => []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <h2 className="font-semibold mb-4">Filters</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="category-filter" className="text-sm font-medium block mb-2">Category</label>
              <select id="category-filter" className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-sm font-medium block mb-2">Price Range</span>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" className="w-full rounded-md border px-3 py-2 text-sm" aria-label="Minimum price" />
                <input type="number" placeholder="Max" className="w-full rounded-md border px-3 py-2 text-sm" aria-label="Maximum price" />
              </div>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {result.meta.total} {result.meta.total === 1 ? 'product' : 'products'}
            </p>
            <select className="rounded-md border px-3 py-2 text-sm" aria-label="Sort products">
              <option>Latest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>

          {result.data.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {result.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No products found.</p>
            </div>
          )}

          {/* Pagination */}
          {result.meta.totalPages > 1 && (
            <nav aria-label="Product pagination" className="flex justify-center gap-2 mt-8">
              {Array.from({ length: result.meta.totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/products?page=${p}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'border hover:bg-accent'
                  }`}
                >
                  {p}
                </a>
              ))}
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}
