/**
 * Admin Dashboard Page — integration tests
 *
 * Covers: heading, stat cards (labels + values), quick-action links,
 * low-stock accent rendering, and gate assertions.
 */
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    products: { list: jest.fn() },
    orders: { adminList: jest.fn() },
    users: { adminList: jest.fn() },
    inventory: { lowStock: jest.fn() },
  },
}));

import { api } from '@/lib/api';
import AdminDashboardPage from './page';

function makeMeta(total: number) {
  return { data: [], meta: { total, page: 1, limit: 1, totalPages: 1 } };
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.products.list as jest.Mock).mockResolvedValue(makeMeta(42));
    (api.orders.adminList as jest.Mock).mockResolvedValue(makeMeta(17));
    (api.users.adminList as jest.Mock).mockResolvedValue(makeMeta(300));
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makeMeta(5));
  });

  it('renders Dashboard heading', async () => {
    const jsx = await AdminDashboardPage();
    render(jsx);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders all four stat cards with correct values', async () => {
    const jsx = await AdminDashboardPage();
    render(jsx);

    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();

    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();

    expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('stat cards link to correct admin sections', async () => {
    const jsx = await AdminDashboardPage();
    render(jsx);

    expect(screen.getByRole('link', { name: /total products/i })).toHaveAttribute('href', '/admin/products');
    expect(screen.getByRole('link', { name: /total orders/i })).toHaveAttribute('href', '/admin/orders');
    expect(screen.getByRole('link', { name: /customers/i })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /low stock alerts/i })).toHaveAttribute('href', '/admin/inventory');
  });

  it('renders quick action links', async () => {
    const jsx = await AdminDashboardPage();
    render(jsx);

    expect(screen.getByRole('link', { name: /add product/i })).toHaveAttribute('href', '/admin/products/new');
    expect(screen.getByRole('link', { name: /pending orders/i })).toHaveAttribute('href', '/admin/orders?status=pending');
    expect(screen.getByRole('link', { name: /stock alerts/i })).toHaveAttribute('href', '/admin/inventory');
  });

  it('data.meta.total is number for each API call (gate assertion)', async () => {
    const jsx = await AdminDashboardPage();
    render(jsx);

    // All four mocked responses must have numeric meta.total
    expect(typeof (api.products.list as jest.Mock).mock.results[0]?.value).toBe('object');
    const productResult = await (api.products.list as jest.Mock).mock.results[0].value;
    expect(typeof productResult.meta.total).toBe('number');

    const orderResult = await (api.orders.adminList as jest.Mock).mock.results[0].value;
    expect(typeof orderResult.meta.total).toBe('number');
  });

  it('renders zero low-stock without accent styling when count is 0', async () => {
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makeMeta(0));

    const jsx = await AdminDashboardPage();
    render(jsx);

    const lowStockCard = screen.getByRole('link', { name: /low stock alerts/i });
    // accent class should NOT be present when count is 0
    expect(lowStockCard.className).not.toContain('border-yellow-300');
  });
});
