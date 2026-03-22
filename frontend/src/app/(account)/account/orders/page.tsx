'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Order, OrderStatus, PaginatedResponse } from '@/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AccountOrdersPage() {
  const [result, setResult] = useState<PaginatedResponse<Order> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.orders.myList({ page, limit: 10 });
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your order history
        </p>
      </div>

      <nav className="flex gap-4 text-sm border-b pb-3" aria-label="Account navigation">
        <Link href="/account" className="text-muted-foreground hover:text-foreground transition-colors">
          Profile
        </Link>
        <Link href="/account/orders" className="font-medium text-primary border-b-2 border-primary pb-3 -mb-3">
          Orders
        </Link>
        <Link href="/account/addresses" className="text-muted-foreground hover:text-foreground transition-colors">
          Addresses
        </Link>
      </nav>

      {isLoading ? (
        <div className="animate-pulse space-y-3" aria-label="Loading orders">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-sm text-destructive">
          {error}
        </div>
      ) : !result || result.data.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">You have not placed any orders yet.</p>
          <Link
            href="/products"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {result.data.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                aria-label={`Order ${order.orderNumber}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono font-medium text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status}
                    </span>
                    <span className="font-bold tabular-nums text-sm">
                      {formatPrice(parseFloat(order.total))}
                    </span>
                  </div>
                </div>
                {order.items && order.items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    {order.items[0] && ` — ${order.items[0].productName}`}
                    {order.items.length > 1 && ` +${order.items.length - 1} more`}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {result.meta.totalPages > 1 && (
            <nav
              className="flex items-center justify-between"
              aria-label="Orders pagination"
            >
              <p className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {result.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(result.meta.totalPages, p + 1))}
                  disabled={page === result.meta.totalPages}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
