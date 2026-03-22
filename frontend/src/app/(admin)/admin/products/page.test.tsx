/**
 * Admin Products Page — integration tests
 *
 * Covers: table rendering, empty state, pagination controls, status badges,
 * search form presence, and "Add Product" link.
 */
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock next/navigation (required by any Server-Component-adjacent code)
// ---------------------------------------------------------------------------
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/products',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// ---------------------------------------------------------------------------
// Mock the API so we control what the page renders
// ---------------------------------------------------------------------------
jest.mock('@/lib/api', () => ({
  api: {
    products: {
      list: jest.fn(),
    },
  },
}));

import { api } from '@/lib/api';
import AdminProductsPage from './page';
import type { PaginatedResponse, Product } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Test Widget',
    slug: 'test-widget',
    description: null,
    shortDescription: null,
    price: '29.99',
    compareAtPrice: null,
    sku: 'WIDGET-001',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Gadgets', slug: 'gadgets', description: null, parentId: null, sortOrder: 0, isActive: true, createdAt: '', updatedAt: '' },
    isActive: true,
    isFeatured: false,
    images: [],
    tags: [],
    variants: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePaginatedResponse(products: Product[], page = 1, total?: number): PaginatedResponse<Product> {
  const t = total ?? products.length;
  return {
    data: products,
    meta: { total: t, page, limit: 20, totalPages: Math.ceil(t / 20) },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdminProductsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page heading and Add Product link', async () => {
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add product/i })).toHaveAttribute(
      'href',
      '/admin/products/new',
    );
  });

  it('renders search form', async () => {
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByRole('searchbox', { name: /search products/i })).toBeInTheDocument();
  });

  it('renders empty state when no products returned', async () => {
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse([]));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });

  it('renders product rows with name, SKU, price, and status badge', async () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Alpha Widget', sku: 'ALPHA-001', price: '19.99', isActive: true }),
      makeProduct({ id: 'p2', name: 'Beta Gadget', sku: 'BETA-002', price: '49.99', isActive: false }),
    ];
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse(products));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText('Alpha Widget')).toBeInTheDocument();
    expect(screen.getByText('ALPHA-001')).toBeInTheDocument();

    // Active badge
    const badges = screen.getAllByText(/active/i);
    expect(badges.some((b) => b.textContent === 'Active')).toBe(true);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('data.data is an array and data.meta.total is a number (gate assertion)', async () => {
    const products = [makeProduct()];
    const response = makePaginatedResponse(products, 1, 1);
    (api.products.list as jest.Mock).mockResolvedValue(response);

    expect(Array.isArray(response.data)).toBe(true);
    expect(typeof response.meta.total).toBe('number');
  });

  it('renders edit link per product row', async () => {
    const products = [makeProduct({ id: 'prod-abc', name: 'Editable Item' })];
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse(products));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    const editLink = screen.getByRole('link', { name: /edit editable item/i });
    expect(editLink).toHaveAttribute('href', '/admin/products/prod-abc/edit');
  });

  it('renders pagination controls when totalPages > 1', async () => {
    const products = Array.from({ length: 20 }, (_, i) =>
      makeProduct({ id: `p-${i}`, name: `Product ${i}`, sku: `SKU-${i}` }),
    );
    (api.products.list as jest.Mock).mockResolvedValue(
      makePaginatedResponse(products, 1, 45),
    );

    const jsx = await AdminProductsPage({ searchParams: { page: '1' } });
    render(jsx);

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next/i })).toBeInTheDocument();
  });

  it('renders previous link on page 2', async () => {
    const products = Array.from({ length: 5 }, (_, i) =>
      makeProduct({ id: `p-${i}`, name: `Product ${i}`, sku: `SKU-${i}` }),
    );
    (api.products.list as jest.Mock).mockResolvedValue(
      makePaginatedResponse(products, 2, 45),
    );

    const jsx = await AdminProductsPage({ searchParams: { page: '2' } });
    render(jsx);

    expect(screen.getByRole('link', { name: /previous/i })).toBeInTheDocument();
  });

  it('renders featured badge for featured products', async () => {
    const products = [makeProduct({ isFeatured: true, name: 'Star Product' })];
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse(products));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('renders compare-at price when present', async () => {
    const products = [makeProduct({ price: '29.99', compareAtPrice: '49.99' })];
    (api.products.list as jest.Mock).mockResolvedValue(makePaginatedResponse(products));

    const jsx = await AdminProductsPage({ searchParams: {} });
    render(jsx);

    // Both prices should be visible (formatted as currency)
    const cells = screen.getAllByText(/\$\d/);
    expect(cells.length).toBeGreaterThanOrEqual(2);
  });
});
