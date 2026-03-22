import { test, expect } from '@playwright/test';

/**
 * Admin Flow Tests
 * Verifies admin-level access to products, categories, and order management.
 */

const API = 'http://localhost:3000/api/v1';
let adminToken: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@shopnext.com', password: 'Admin1234!' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  adminToken = body.data.accessToken;
});

test.describe('Admin: Products Management', () => {
  test('admin can list all products', async ({ request }) => {
    const res = await request.get(`${API}/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
  });

  test('admin can fetch product detail', async ({ request }) => {
    const listRes = await request.get(`${API}/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const list = await listRes.json();
    const products = Array.isArray(list.data) ? list.data : (list.data?.data ?? []);

    if (products.length === 0) {
      test.skip();
      return;
    }

    const detailRes = await request.get(`${API}/products/${products[0].id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(detailRes.status()).toBe(200);
  });

  test('admin token is accepted on authenticated routes', async ({ request }) => {
    // Profile endpoint is /auth/me (not /auth/profile)
    const profileRes = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(profileRes.status()).toBe(200);
    const body = await profileRes.json();
    expect(body.data).toHaveProperty('email', 'admin@shopnext.com');
  });
});

test.describe('Admin: Categories', () => {
  test('categories list is accessible (public)', async ({ request }) => {
    const res = await request.get(`${API}/categories`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
  });

  test('categories list has at least 1 category (seed data)', async ({ request }) => {
    const res = await request.get(`${API}/categories`);
    const body = await res.json();
    const categories = Array.isArray(body.data) ? body.data : (body.data?.data ?? []);
    expect(categories.length).toBeGreaterThanOrEqual(1);
    // Verify Electronics category from seed
    const electronics = categories.find(
      (c: { name: string }) => c.name.toLowerCase() === 'electronics',
    );
    expect(electronics).toBeDefined();
  });

  test('admin can fetch products with pagination', async ({ request }) => {
    // Note: categoryId filter is not supported via query params due to ValidationPipe whitelist.
    // Products can be filtered via page/limit which are defined in PaginationDto.
    const res = await request.get(`${API}/products?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    // Response has paginated structure
    expect(body.data).toBeDefined();
  });
});

test.describe('Admin: Orders', () => {
  test('admin can access orders list', async ({ request }) => {
    const res = await request.get(`${API}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('orders endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get(`${API}/orders`);
    expect(res.status()).toBe(401);
  });
});
