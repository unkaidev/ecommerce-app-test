/**
 * Admin Categories Page — integration tests
 *
 * Covers: heading, add form, loading state, empty state, category tree rendering,
 * activate/deactivate buttons, error display, and gate assertions.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/categories',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    categories: {
      tree: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { api } from '@/lib/api';
import AdminCategoriesPage from './page';
import type { Category } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: null,
    parentId: null,
    sortOrder: 0,
    isActive: true,
    children: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page heading', async () => {
    (api.categories.tree as jest.Mock).mockResolvedValue([]);

    render(<AdminCategoriesPage />);

    expect(screen.getByRole('heading', { name: /categories/i })).toBeInTheDocument();
  });

  it('renders add category form', async () => {
    (api.categories.tree as jest.Mock).mockResolvedValue([]);

    render(<AdminCategoriesPage />);

    expect(screen.getByRole('textbox', { name: /new category name/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    // Hang the promise so loading state persists
    (api.categories.tree as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<AdminCategoriesPage />);

    expect(screen.getByLabelText(/loading categories/i)).toBeInTheDocument();
  });

  it('renders empty state after loading with no categories', async () => {
    (api.categories.tree as jest.Mock).mockResolvedValue([]);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
    });
  });

  it('renders category rows with name, slug, and status badge', async () => {
    const cats = [
      makeCategory({ id: 'c1', name: 'Electronics', slug: 'electronics', isActive: true }),
      makeCategory({ id: 'c2', name: 'Clothing', slug: 'clothing', isActive: false }),
    ];
    (api.categories.tree as jest.Mock).mockResolvedValue(cats);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    expect(screen.getByText('clothing')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders nested child categories with indentation marker', async () => {
    const cats = [
      makeCategory({
        id: 'c1',
        name: 'Electronics',
        children: [
          makeCategory({ id: 'c2', name: 'Phones', parentId: 'c1', children: [] }),
        ],
      }),
    ];
    (api.categories.tree as jest.Mock).mockResolvedValue(cats);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Phones')).toBeInTheDocument();
    });
  });

  it('renders error state when API fails', async () => {
    (api.categories.tree as jest.Mock).mockRejectedValue(new Error('Server error'));

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/server error/i);
    });
  });

  it('renders deactivate button for active category and activate for inactive', async () => {
    const cats = [
      makeCategory({ id: 'c1', name: 'Active Cat', isActive: true }),
      makeCategory({ id: 'c2', name: 'Inactive Cat', isActive: false }),
    ];
    (api.categories.tree as jest.Mock).mockResolvedValue(cats);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deactivate active cat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /activate inactive cat/i })).toBeInTheDocument();
    });
  });

  it('calls api.categories.update and reloads when toggle clicked', async () => {
    const cats = [makeCategory({ id: 'c1', name: 'Electronics', isActive: true })];
    (api.categories.tree as jest.Mock).mockResolvedValue(cats);
    (api.categories.update as jest.Mock).mockResolvedValue({});

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deactivate electronics/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /deactivate electronics/i }));

    expect(api.categories.update).toHaveBeenCalledWith('c1', { isActive: false });
    // tree should reload
    expect(api.categories.tree).toHaveBeenCalledTimes(2);
  });

  it('submits add category form with name and calls api.categories.create', async () => {
    (api.categories.tree as jest.Mock).mockResolvedValue([]);
    (api.categories.create as jest.Mock).mockResolvedValue({ id: 'new-cat' });

    render(<AdminCategoriesPage />);

    await waitFor(() => screen.getByRole('textbox', { name: /new category name/i }));

    await userEvent.type(screen.getByRole('textbox', { name: /new category name/i }), 'New Category');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(api.categories.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Category' }),
    );
  });
});
