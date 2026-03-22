import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { User, PaginatedResponse } from '@/types';

interface SearchParams {
  page?: string;
  search?: string;
  role?: string;
}

async function getUsers(params: SearchParams): Promise<PaginatedResponse<User>> {
  return api.users.adminList({
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
    search: params.search,
    role: params.role as 'admin' | 'customer' | undefined,
  });
}

function RoleBadge({ role }: { role: 'admin' | 'customer' }) {
  return (
    <span
      className={
        role === 'admin'
          ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
          : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground'
      }
    >
      {role}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }
    >
      {isActive ? 'Active' : 'Suspended'}
    </span>
  );
}

function UserTableSkeleton() {
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

async function UserTable({ searchParams }: { searchParams: SearchParams }) {
  const result = await getUsers(searchParams);
  const { data: users, meta } = result;
  const page = meta.page;

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-center px-4 py-3 font-medium">Role</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActiveBadge isActive={user.isActive} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="rounded px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
                      aria-label={`View ${user.firstName} ${user.lastName}`}
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
          aria-label="Users pagination"
        >
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * meta.limit + 1}–
            {Math.min(page * meta.limit, meta.total)} of{' '}
            <span className="tabular-nums">{meta.total}</span> customers
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users?page=${page - 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={`/admin/users?page=${page + 1}`}
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

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const activeRole = searchParams.role ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage customer accounts
        </p>
      </div>

      {/* Role filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <nav className="flex gap-1" aria-label="Filter by role">
          {(['', 'customer', 'admin'] as const).map((role) => (
            <Link
              key={role || 'all'}
              href={role ? `/admin/users?role=${role}` : '/admin/users'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeRole === role
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              {role || 'All'}
            </Link>
          ))}
        </nav>

        <form method="GET" className="flex gap-3 flex-1">
          <input
            name="search"
            type="search"
            defaultValue={searchParams.search}
            placeholder="Search by name or email..."
            aria-label="Search customers"
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchParams.role && (
            <input type="hidden" name="role" value={searchParams.role} />
          )}
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <Suspense fallback={<UserTableSkeleton />}>
        <UserTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
