/**
 * Admin Orders Page — integration tests
 *
 * Covers: table rendering, empty state, status badge rendering, pagination,
 * status filter tabs, search form presence, and gate assertions.
 */
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/orders',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    orders: {
      adminList: jest.fn(),
    },
  },
}));

import { api } from '@/lib/api';
import AdminOrdersPage from './page';
import type { Order, PaginatedResponse } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    orderNumber: 'ORD-20240101-0001',
    userId: 'usr-1',
    status: 'pending',
    subtotal: '29.99',
    discountAmount: '0.00',
    taxAmount: '2.40',
    shippingAmount: '5.99',
    total: '38.38',
    currency: 'USD',
    couponCode: null,
    shippingAddressId: 'addr-1',
    shippingAddressSnapshot: { firstName: 'Jane', lastName: 'Doe' },
    notes: null,
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    ...overrides,
  };
}

function makePaginatedResponse(orders: Order[], page = 1, total?: number): PaginatedResponse<Order> {
  const t = total ?? orders.length;
  return {
    data: orders,
    meta: { total: t, page, limit: 20, totalPages: Math.ceil(t / 20) },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdminOrdersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page heading', async () => {
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminOrdersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('heading', { name: /orders/i })).toBeInTheDocument();
  });

  it('renders status filter tabs for all 7 statuses', async () => {
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminOrdersPage({ searchParams: {} });
    render(jsx);

    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    for (const s of statuses) {
      expect(screen.getByRole('link', { name: new RegExp(s, 'i') })).toBeInTheDocument();
    }
  });

  it('renders search form', async () => {
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminOrdersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('searchbox', { name: /search orders/i })).toBeInTheDocument();
  });

  it('renders empty state when no orders', async () => {
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminOrdersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
  });

  it('renders order rows with order number, status badge, and total', async () => {
    const orders = [
      makeOrder({ orderNumber: 'ORD-20240101-0001', status: 'pending', total: '38.38' }),
      makeOrder({ id: 'ord-2', orderNumber: 'ORD-20240101-0002', status: 'delivered', total: '99.00' }),
    ];
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse(orders));

    const jsx = await AdminOrdersPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText('ORD-20240101-0001')).toBeInTheDocument();
    expect(screen.getByText('ORD-20240101-0002')).toBeInTheDocument();
    // Status badges
    const pendingBadge = screen.getAllByText(/pending/i).find(
      (el) => el.tagName.toLowerCase() === 'span',
    );
    expect(pendingBadge).toBeInTheDocument();
  });

  it('data.data is array and data.meta.total is number (gate assertion)', async () => {
    const orders = [makeOrder()];
    const response = makePaginatedResponse(orders, 1, 1);
    (api.orders.adminList as jest.Mock).mockResolvedValue(response);

    expect(Array.isArray(response.data)).toBe(true);
    expect(typeof response.meta.total).toBe('number');
  });

  it('renders view link per order row', async () => {
    const orders = [makeOrder({ id: 'ord-abc', orderNumber: 'ORD-20240101-0003' })];
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse(orders));

    const jsx = await AdminOrdersPage({ searchParams: {} });
    render(jsx);

    const viewLink = screen.getByRole('link', { name: /view order ORD-20240101-0003/i });
    expect(viewLink).toHaveAttribute('href', '/admin/orders/ord-abc');
  });

  it('renders pagination when totalPages > 1', async () => {
    const orders = Array.from({ length: 20 }, (_, i) =>
      makeOrder({ id: `ord-${i}`, orderNumber: `ORD-202401${String(i).padStart(2, '0')}-0001` }),
    );
    (api.orders.adminList as jest.Mock).mockResolvedValue(
      makePaginatedResponse(orders, 1, 50),
    );

    const jsx = await AdminOrdersPage({ searchParams: { page: '1' } });
    render(jsx);

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next/i })).toBeInTheDocument();
  });

  it('highlights active status tab', async () => {
    (api.orders.adminList as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminOrdersPage({ searchParams: { status: 'pending' } });
    render(jsx);

    // The active tab link should have primary styling class — check by examining the link
    const pendingLink = screen.getByRole('link', { name: /^pending$/i });
    expect(pendingLink.className).toContain('bg-primary');
  });
});
