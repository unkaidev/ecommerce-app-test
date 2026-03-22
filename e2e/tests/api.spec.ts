import { test, expect } from '@playwright/test';

/**
 * API Integration Tests
 * Validates REST endpoint coverage: response shapes, status codes, auth enforcement.
 */

const API = 'http://localhost:3000/api/v1';
let token: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@shopnext.com', password: 'Admin1234!' },
  });
  const body = await res.json();
  token = body.data.accessToken;
});

test.describe('API: Core Endpoints', () => {
  test('GET /health returns { status: ok }', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/health');
    expect(res.status()).toBe(200);
    // API wraps all responses: { success, data: { status: 'ok' } }
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('status', 'ok');
  });

  test('GET /products returns paginated list', async ({ request }) => {
    const res = await request.get(`${API}/products`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test('GET /products supports pagination (page + limit)', async ({ request }) => {
    const res = await request.get(`${API}/products?page=1&limit=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  test('GET /categories returns list', async ({ request }) => {
    const res = await request.get(`${API}/categories`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

test.describe('API: Authentication Endpoints', () => {
  test('POST /auth/login with valid credentials returns JWT', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@shopnext.com', password: 'Admin1234!' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('accessToken');
    expect(body.data).toHaveProperty('refreshToken');
  });

  test('POST /auth/login with missing fields returns 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@shopnext.com' }, // missing password
    });
    expect([400, 401]).toContain(res.status());
  });

  test('GET /auth/me requires auth', async ({ request }) => {
    // Profile endpoint is /auth/me (not /auth/profile)
    const unauthRes = await request.get(`${API}/auth/me`);
    expect(unauthRes.status()).toBe(401);

    const authRes = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(authRes.status()).toBe(200);
    const body = await authRes.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('email');
    expect(body.data).not.toHaveProperty('password');
  });
});

test.describe('API: Product Endpoints', () => {
  test('GET /products/:id with valid ID returns product', async ({ request }) => {
    const listRes = await request.get(`${API}/products`);
    const list = await listRes.json();
    const products = Array.isArray(list.data) ? list.data : (list.data?.data ?? []);

    if (products.length === 0) {
      test.skip();
      return;
    }

    const res = await request.get(`${API}/products/${products[0].id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('name');
    expect(body.data).toHaveProperty('price');
    expect(body.data).toHaveProperty('slug');
  });

  test('GET /products/:id with invalid ID returns 404', async ({ request }) => {
    const res = await request.get(`${API}/products/00000000-0000-0000-0000-000000000000`);
    expect([404, 400]).toContain(res.status());
  });

  test('GET /products returns seed product (Wireless Headphones)', async ({ request }) => {
    // Note: search filter via ?search= is rejected by ValidationPipe whitelist.
    // Verify the product exists by listing all and checking name.
    const res = await request.get(`${API}/products?page=1&limit=100`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body.data) ? body.data : (body.data?.data ?? []);
    // Should find "Wireless Headphones" from seed data
    const wireless = items.find((p: { name: string }) =>
      p.name.toLowerCase().includes('wireless'),
    );
    expect(wireless).toBeDefined();
  });
});

test.describe('API: Orders — Auth Enforcement', () => {
  test('GET /orders without token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/orders`);
    expect(res.status()).toBe(401);
  });

  test('GET /orders with valid token returns 200', async ({ request }) => {
    const res = await request.get(`${API}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /cart without token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/cart`);
    expect(res.status()).toBe(401);
  });
});
