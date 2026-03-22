import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductVariant,
  Category,
  Cart,
  CartWithTotals,
  Order,
  OrderStatus,
  User,
  Address,
  TokenPair,
  Inventory,
} from '@/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------- Fetch wrapper ----------

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach JWT from localStorage if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, { ...options, headers });

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(response.status, body.message ?? 'Request failed');
  }

  // Unwrap the TransformInterceptor envelope
  return body.data;
}

// ---------- Query string builder ----------

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ---------- API namespaces ----------

export const api = {
  // ---- Auth ----
  auth: {
    register: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }) =>
      fetchApi<TokenPair>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      fetchApi<TokenPair>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    refresh: (refreshToken: string) =>
      fetchApi<TokenPair>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    me: () => fetchApi<ApiResponse<User>>('/auth/me'),

    updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
      fetchApi<User>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      fetchApi<undefined>('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ---- Users ----
  users: {
    me: () => fetchApi<ApiResponse<User>>('/auth/me'),

    listAddresses: () => fetchApi<Address[]>('/users/me/addresses'),

    createAddress: (data: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
      fetchApi<Address>('/users/me/addresses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateAddress: (
      id: string,
      data: Partial<Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
    ) =>
      fetchApi<Address>(`/users/me/addresses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteAddress: (id: string) =>
      fetchApi<undefined>(`/users/me/addresses/${id}`, { method: 'DELETE' }),

    setDefaultAddress: (id: string) =>
      fetchApi<Address>(`/users/me/addresses/${id}/default`, { method: 'PATCH' }),

    // Admin — canonical name
    listAll: (params: { page?: number; limit?: number; search?: string; role?: string } = {}) =>
      fetchApi<PaginatedResponse<User>>(`/admin/users${buildQuery(params)}`),

    // Admin — alias used by admin pages and tests
    adminList: (params: { page?: number; limit?: number; search?: string; role?: string } = {}) =>
      fetchApi<PaginatedResponse<User>>(`/admin/users${buildQuery(params)}`),

    getById: (id: string) => fetchApi<User>(`/admin/users/${id}`),

    setStatus: (id: string, isActive: boolean) =>
      fetchApi<User>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
  },

  // ---- Products ----
  products: {
    list: (
      params: {
        page?: number;
        limit?: number;
        categoryId?: string;
        search?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
        sort?: string;
        order?: 'ASC' | 'DESC';
      } = {},
    ) => fetchApi<PaginatedResponse<Product>>(`/products${buildQuery(params)}`),

    getById: (id: string) => fetchApi<Product>(`/products/${id}`),

    getBySlug: (slug: string) => fetchApi<Product>(`/products/slug/${slug}`),

    create: (data: Partial<Product>) =>
      fetchApi<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Partial<Product>) =>
      fetchApi<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string) =>
      fetchApi<undefined>(`/products/${id}`, { method: 'DELETE' }),
  },

  // ---- Categories ----
  categories: {
    list: () => fetchApi<Category[]>('/categories'),
    getById: (id: string) => fetchApi<Category>(`/categories/${id}`),
    create: (data: Partial<Category>) =>
      fetchApi<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Category>) =>
      fetchApi<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi<undefined>(`/categories/${id}`, { method: 'DELETE' }),
  },

  // ---- Cart ----
  cart: {
    get: () => fetchApi<CartWithTotals>('/cart'),

    addItem: (data: { variantId: string; quantity: number; notes?: string }) =>
      fetchApi<CartWithTotals>('/cart/items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateItem: (id: string, data: { quantity: number }) =>
      fetchApi<CartWithTotals>(`/cart/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    removeItem: (id: string) =>
      fetchApi<CartWithTotals>(`/cart/items/${id}`, { method: 'DELETE' }),

    clear: () => fetchApi<undefined>('/cart', { method: 'DELETE' }),

    applyCoupon: (couponCode: string) =>
      fetchApi<CartWithTotals>('/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ couponCode }),
      }),

    removeCoupon: () => fetchApi<CartWithTotals>('/cart/coupon', { method: 'DELETE' }),
  },

  // ---- Orders ----
  orders: {
    create: (data: { shippingAddressId: string; notes?: string }) =>
      fetchApi<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),

    list: (params: { page?: number; limit?: number } = {}) =>
      fetchApi<PaginatedResponse<Order>>(`/orders${buildQuery(params)}`),

    myList: (params: { page?: number; limit?: number } = {}) =>
      fetchApi<PaginatedResponse<Order>>(`/orders${buildQuery(params)}`),

    getById: (id: string) => fetchApi<Order>(`/orders/${id}`),

    cancel: (id: string) =>
      fetchApi<Order>(`/orders/${id}/cancel`, { method: 'PATCH' }),

    // Admin — canonical name
    listAll: (
      params: {
        page?: number;
        limit?: number;
        status?: OrderStatus;
        userId?: string;
        search?: string;
      } = {},
    ) => fetchApi<PaginatedResponse<Order>>(`/admin/orders${buildQuery(params)}`),

    // Admin — alias used by admin pages and tests
    adminList: (
      params: {
        page?: number;
        limit?: number;
        status?: OrderStatus;
        userId?: string;
        search?: string;
      } = {},
    ) => fetchApi<PaginatedResponse<Order>>(`/admin/orders${buildQuery(params)}`),

    getByIdAdmin: (id: string) => fetchApi<Order>(`/admin/orders/${id}`),

    updateStatus: (id: string, data: { status: OrderStatus; notes?: string }) =>
      fetchApi<Order>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // ---- Inventory ----
  inventory: {
    getByVariant: (variantId: string) =>
      fetchApi<Inventory>(`/inventory/${variantId}`),

    update: (variantId: string, data: { quantity: number; lowStockThreshold?: number }) =>
      fetchApi<Inventory>(`/inventory/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    // Canonical name — returns variants with embedded inventory from low-stock endpoint
    getLowStock: (params: { page?: number; limit?: number } = {}) =>
      fetchApi<PaginatedResponse<ProductVariant>>(`/admin/inventory/low-stock${buildQuery(params)}`),

    // Alias used by admin pages and tests
    lowStock: (params: { page?: number; limit?: number } = {}) =>
      fetchApi<PaginatedResponse<ProductVariant>>(`/admin/inventory/low-stock${buildQuery(params)}`),
  },
};
