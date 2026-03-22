import Link from 'next/link';
import { api } from '@/lib/api';

async function getDashboardStats() {
  const [products, orders, users, inventory] = await Promise.all([
    api.products.list({ page: 1, limit: 1 }),
    api.orders.adminList({ page: 1, limit: 1 }),
    api.users.adminList({ page: 1, limit: 1 }),
    api.inventory.lowStock({ page: 1, limit: 1 }),
  ]);

  return {
    totalProducts: products.meta.total,
    totalOrders: orders.meta.total,
    totalCustomers: users.meta.total,
    lowStockCount: inventory.meta.total,
  };
}

interface StatCardProps {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}

function StatCard({ label, value, href, accent }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-6 hover:bg-accent/50 transition-colors ${
        accent ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' : 'bg-card'
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold tabular-nums mt-1 ${accent ? 'text-yellow-700 dark:text-yellow-400' : ''}`}>
        {value.toLocaleString()}
      </p>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your store
        </p>
      </div>

      <section aria-label="Store statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={stats.totalProducts} href="/admin/products" />
          <StatCard label="Total Orders" value={stats.totalOrders} href="/admin/orders" />
          <StatCard label="Customers" value={stats.totalCustomers} href="/admin/users" />
          <StatCard
            label="Low Stock Alerts"
            value={stats.lowStockCount}
            href="/admin/inventory"
            accent={stats.lowStockCount > 0}
          />
        </div>
      </section>

      <section aria-label="Quick links">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <div>
              <p className="font-medium text-sm">Add Product</p>
              <p className="text-xs text-muted-foreground">Create a new product listing</p>
            </div>
          </Link>
          <Link
            href="/admin/orders?status=pending"
            className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <div>
              <p className="font-medium text-sm">Pending Orders</p>
              <p className="text-xs text-muted-foreground">Review orders awaiting confirmation</p>
            </div>
          </Link>
          <Link
            href="/admin/inventory"
            className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <div>
              <p className="font-medium text-sm">Stock Alerts</p>
              <p className="text-xs text-muted-foreground">Manage low-stock variants</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
