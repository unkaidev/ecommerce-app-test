import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Product, PaginatedResponse } from '@/types';

interface SearchParams {
  page?: string;
  search?: string;
  categoryId?: string;
}

async function getProducts(params: SearchParams): Promise<PaginatedResponse<Product>> {
  return api.products.list({
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
    search: params.search,
    categoryId: params.categoryId,
  });
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground'
      }
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function ProductTableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted" />
      ))}
    </div>
  );
}

async function ProductTable({ searchParams }: { searchParams: SearchParams }) {
  const result = await getProducts(searchParams);
  const { data: products, meta } = result;
  const page = meta.page;

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">SKU</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Category</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-9 w-9 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted shrink-0" />
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        {product.isFeatured && (
                          <span className="text-xs text-primary">Featured</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                    {product.sku}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {product.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatPrice(parseFloat(product.price))}
                    {product.compareAtPrice && (
                      <span className="block text-xs text-muted-foreground line-through tabular-nums">
                        {formatPrice(parseFloat(product.compareAtPrice))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge isActive={product.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
                        aria-label={`Edit ${product.name}`}
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <nav
          className="flex items-center justify-between mt-4"
          aria-label="Products pagination"
        >
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * meta.limit + 1}–
            {Math.min(page * meta.limit, meta.total)} of{' '}
            <span className="tabular-nums">{meta.total}</span> products
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/products?page=${page - 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={`/admin/products?page=${page + 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

export default function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your product catalog
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <form method="GET" className="flex gap-3 flex-1">
          <input
            name="search"
            type="search"
            defaultValue={searchParams.search}
            placeholder="Search products..."
            aria-label="Search products"
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <Suspense fallback={<ProductTableSkeleton />}>
        <ProductTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
