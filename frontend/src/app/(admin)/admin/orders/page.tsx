import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Order, OrderStatus, PaginatedResponse } from '@/types';

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
}

async function getOrders(params: SearchParams): Promise<PaginatedResponse<Order>> {
  return api.orders.adminList({
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
    status: params.status as OrderStatus | undefined,
    search: params.search,
  });
}

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ORDER_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function OrderTableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted" />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function OrderTable({ searchParams }: { searchParams: SearchParams }) {
  const result = await getOrders(searchParams);
  const { data: orders, meta } = result;
  const page = meta.page;

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Order</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Customer</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-xs">
                      {order.orderNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {order.shippingAddressSnapshot?.firstName}{' '}
                    {order.shippingAddressSnapshot?.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatPrice(parseFloat(order.total))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="rounded px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
                      aria-label={`View order ${order.orderNumber}`}
                    >
                      View
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
          aria-label="Orders pagination"
        >
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * meta.limit + 1}–
            {Math.min(page * meta.limit, meta.total)} of{' '}
            <span className="tabular-nums">{meta.total}</span> orders
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/orders?page=${page - 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={`/admin/orders?page=${page + 1}`}
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

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const activeStatus = searchParams.status ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and fulfill customer orders
        </p>
      </div>

      {/* Status filter tabs */}
      <nav className="flex gap-1 flex-wrap" aria-label="Filter by order status">
        <Link
          href="/admin/orders"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !activeStatus
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input
          name="search"
          type="search"
          defaultValue={searchParams.search}
          placeholder="Search by order number..."
          aria-label="Search orders"
          className="flex-1 max-w-xs rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {searchParams.status && (
          <input type="hidden" name="status" value={searchParams.status} />
        )}
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <Suspense fallback={<OrderTableSkeleton />}>
        <OrderTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
