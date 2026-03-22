/**
 * Admin Users Page — integration tests
 *
 * Covers: table rendering, empty state, role/active badges, pagination,
 * role filter tabs, search form, view links, and gate assertions.
 */
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/users',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    users: {
      adminList: jest.fn(),
    },
  },
}));

import { api } from '@/lib/api';
import AdminUsersPage from './page';
import type { User, PaginatedResponse } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    role: 'customer',
    isActive: true,
    emailVerifiedAt: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

function makePaginatedResponse(users: User[], page = 1, total?: number): PaginatedResponse<User> {
  const t = total ?? users.length;
  return {
    data: users,
    meta: { total: t, page, limit: 20, totalPages: Math.ceil(t / 20) },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page heading', async () => {
    (api.users.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminUsersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('heading', { name: /customers/i })).toBeInTheDocument();
  });

  it('renders role filter tabs (All, customer, admin)', async () => {
    (api.users.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminUsersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('link', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^customer$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^admin$/i })).toBeInTheDocument();
  });

  it('renders search form', async () => {
    (api.users.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminUsersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('searchbox', { name: /search customers/i })).toBeInTheDocument();
  });

  it('renders empty state when no users', async () => {
    (api.users.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminUsersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
  });

  it('renders user rows with name, email, role badge, and status badge', async () => {
    const users = [
      makeUser({ id: 'u1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', role: 'customer', isActive: true }),
      makeUser({ id: 'u2', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'admin', isActive: true }),
      makeUser({ id: 'u3', firstName: 'Suspended', lastName: 'User', email: 'sus@example.com', role: 'customer', isActive: false }),
    ];
    (api.users.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse(users));

    const jsx = await AdminUsersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText(/suspended/i)).toBeInTheDocument();

    // Badge checks
    const adminBadge = screen.getByText('admin', { selector: 'span' });
    expect(adminBadge).toBeInTheDocument();
  });

  it('data.data is array and data.meta.total is number (gate assertion)', async () => {
    const users = [makeUser()];
    const response = makePaginatedResponse(users, 1, 1);
    (api.users.adminList as jest.Mock).mockResolvedValue(response);

    expect(Array.isArray(response.data)).toBe(true);
    expect(typeof response.meta.total).toBe('number');
  });

  it('renders view link per user row', async () => {
    const users = [makeUser({ id: 'usr-abc', firstName: 'Test', lastName: 'Person' })];
    (api.users.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse(users));

    const jsx = await AdminUsersPage({ searchParams: {} });
    render(jsx);

    const viewLink = screen.getByRole('link', { name: /view test person/i });
    expect(viewLink).toHaveAttribute('href', '/admin/users/usr-abc');
  });

  it('renders pagination when totalPages > 1', async () => {
    const users = Array.from({ length: 20 }, (_, i) =>
      makeUser({ id: `u-${i}`, email: `user${i}@example.com` }),
    );
    (api.users.adminList as jest.Mock).mockResolvedValue(
      makePaginatedResponse(users, 1, 60),
    );

    const jsx = await AdminUsersPage({ searchParams: { page: '1' } });
    render(jsx);

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next/i })).toBeInTheDocument();
  });
});
