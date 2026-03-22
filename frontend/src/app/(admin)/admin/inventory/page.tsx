import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ProductVariant, PaginatedResponse } from '@/types';

interface SearchParams {
  page?: string;
  lowStock?: string;
}

// ProductVariant with nested inventory comes from the low-stock endpoint
type VariantWithInventory = ProductVariant & {
  product?: { id: string; name: string; sku: string };
};

async function getLowStockVariants(params: SearchParams): Promise<PaginatedResponse<VariantWithInventory>> {
  return api.inventory.lowStock({
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
  });
}

function StockLevel({ quantity, reserved, threshold }: { quantity: number; reserved: number; threshold: number }) {
  const available = quantity - reserved;
  const isLow = available <= threshold;
  const isCritical = available <= 0;

  return (
    <div className="flex flex-col">
      <span
        className={`tabular-nums font-medium ${
          isCritical
            ? 'text-destructive'
            : isLow
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-green-700 dark:text-green-400'
        }`}
      >
        {available}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {quantity} total / {reserved} reserved
      </span>
    </div>
  );
}

function InventoryTableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-14 rounded bg-muted" />
      ))}
    </div>
  );
}

async function InventoryTable({ searchParams }: { searchParams: SearchParams }) {
  const result = await getLowStockVariants(searchParams);
  const { data: variants, meta } = result;
  const page = meta.page;

  return (
    <>
      {/* Meta summary */}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        <span className="tabular-nums font-medium text-foreground">{meta.total}</span> low-stock
        variant{meta.total !== 1 ? 's' : ''} require attention
      </p>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Variant</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">SKU</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Product</th>
              <th className="text-right px-4 py-3 font-medium">Available / Total</th>
              <th className="text-center px-4 py-3 font-medium">Threshold</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  All stock levels are healthy. No low-stock variants found.
                </td>
              </tr>
            ) : (
              variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium">{variant.name}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                    {variant.sku}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {variant.product?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {variant.inventory ? (
                      <StockLevel
                        quantity={variant.inventory.quantity}
                        reserved={variant.inventory.reserved}
                        threshold={variant.inventory.lowStockThreshold}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                    {variant.inventory?.lowStockThreshold ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${variant.productId}/edit`}
                      className="rounded px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
                      aria-label={`Edit product for variant ${variant.sku}`}
                    >
                      Edit Stock
                    </Link>
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
          aria-label="Inventory pagination"
        >
          <p className="text-sm text-muted-foreground">
            Page <span className="tabular-nums">{page}</span> of{' '}
            <span className="tabular-nums">{meta.totalPages}</span>
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/inventory?page=${page - 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={`/admin/inventory?page=${page + 1}`}
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

export default function AdminInventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor stock levels and resolve low-stock alerts
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Manage Products
        </Link>
      </div>

      {/* Alert banner */}
      <div
        role="status"
        className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      >
        Showing variants at or below their low-stock threshold. Update stock quantities from the
        product edit page.
      </div>

      {/* Table */}
      <Suspense fallback={<InventoryTableSkeleton />}>
        <InventoryTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
