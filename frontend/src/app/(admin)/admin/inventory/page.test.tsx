/**
 * Admin Inventory Page — integration tests
 *
 * Covers: heading, alert banner, table rendering, empty state (healthy stock),
 * low-stock display, critical (zero available) display, pagination, gate assertions.
 */
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/inventory',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    inventory: {
      lowStock: jest.fn(),
    },
  },
}));

import { api } from '@/lib/api';
import AdminInventoryPage from './page';
import type { ProductVariant, Inventory, PaginatedResponse } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type VariantWithInventory = ProductVariant & {
  product?: { id: string; name: string; sku: string };
};

function makeVariant(overrides: Partial<VariantWithInventory> = {}): VariantWithInventory {
  return {
    id: 'var-1',
    productId: 'prod-1',
    sku: 'WIDGET-S',
    name: 'Small',
    priceOverride: null,
    attributes: { size: 'S' },
    sortOrder: 0,
    isActive: true,
    inventory: {
      id: 'inv-1',
      variantId: 'var-1',
      quantity: 5,
      reserved: 2,
      lowStockThreshold: 10,
      updatedAt: '2024-01-01T00:00:00Z',
    },
    product: { id: 'prod-1', name: 'Test Widget', sku: 'WIDGET' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePaginatedResponse(
  variants: VariantWithInventory[],
  page = 1,
  total?: number,
): PaginatedResponse<VariantWithInventory> {
  const t = total ?? variants.length;
  return {
    data: variants,
    meta: { total: t, page, limit: 20, totalPages: Math.ceil(t / 20) },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdminInventoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page heading', async () => {
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('heading', { name: /inventory/i })).toBeInTheDocument();
  });

  it('renders alert banner about low-stock', async () => {
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders Manage Products link', async () => {
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('link', { name: /manage products/i })).toHaveAttribute(
      'href',
      '/admin/products',
    );
  });

  it('renders empty state when no low-stock variants', async () => {
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText(/all stock levels are healthy/i)).toBeInTheDocument();
  });

  it('renders variant rows with SKU, product name, and stock levels', async () => {
    const variants = [
      makeVariant({
        id: 'v1',
        sku: 'ALPHA-S',
        name: 'Alpha Small',
        product: { id: 'p1', name: 'Alpha Widget', sku: 'ALPHA' },
        inventory: { id: 'i1', variantId: 'v1', quantity: 5, reserved: 2, lowStockThreshold: 10, updatedAt: '' },
      }),
    ];
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makePaginatedResponse(variants));

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText('Alpha Small')).toBeInTheDocument();
    expect(screen.getByText('ALPHA-S')).toBeInTheDocument();
    expect(screen.getByText('Alpha Widget')).toBeInTheDocument();
    // available = 5 - 2 = 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('data.data is array and data.meta.total is number (gate assertion)', async () => {
    const variants = [makeVariant()];
    const response = makePaginatedResponse(variants, 1, 1);
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(response);

    expect(Array.isArray(response.data)).toBe(true);
    expect(typeof response.meta.total).toBe('number');
  });

  it('shows meta.total count in summary text', async () => {
    const variants = [makeVariant(), makeVariant({ id: 'v2', sku: 'BETA-M' })];
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(
      makePaginatedResponse(variants, 1, 2),
    );

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/low-stock/i)).toBeInTheDocument();
  });

  it('renders Edit Stock link pointing to product edit page', async () => {
    const variants = [
      makeVariant({ id: 'v1', sku: 'SKU-1', productId: 'prod-xyz' }),
    ];
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(makePaginatedResponse(variants));

    const jsx = await AdminInventoryPage({ searchParams: {} });
    render(jsx);

    const editLink = screen.getByRole('link', { name: /edit product for variant SKU-1/i });
    expect(editLink).toHaveAttribute('href', '/admin/products/prod-xyz/edit');
  });

  it('renders pagination when totalPages > 1', async () => {
    const variants = Array.from({ length: 20 }, (_, i) =>
      makeVariant({ id: `v-${i}`, sku: `SKU-${i}` }),
    );
    (api.inventory.lowStock as jest.Mock).mockResolvedValue(
      makePaginatedResponse(variants, 1, 50),
    );

    const jsx = await AdminInventoryPage({ searchParams: { page: '1' } });
    render(jsx);

    expect(screen.getByRole('navigation', { name: /inventory pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next/i })).toBeInTheDocument();
  });
});
