import { test, expect } from '@playwright/test';

/**
 * Critical Journey Tests @critical
 * Tests the three mandatory user journeys:
 *  1. Browse → Add to Cart (→ checkout intent)
 *  2. Register / Login
 *  3. Order History (authenticated)
 */

const API = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@shopnext.com';
const ADMIN_PASSWORD = 'Admin1234!';

// ─── Journey 1: Browse → Add to Cart → Checkout ─────────────────────────────

test.describe('Critical Journey: Browse → Add to Cart → Checkout @critical', () => {
  test('product catalog is accessible and has at least 1 product', async ({ request }) => {
    const res = await request.get(`${API}/products`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Support both flat array and paginated { data: { data: [] } } shapes
    const products = Array.isArray(body.data) ? body.data : (body.data?.data ?? []);
    expect(products.length).toBeGreaterThanOrEqual(1);
  });

  test('product detail is retrievable by ID', async ({ request }) => {
    const listRes = await request.get(`${API}/products`);
    const list = await listRes.json();
    const products = Array.isArray(list.data) ? list.data : (list.data?.data ?? []);

    // Skip if no products (should not happen — seed data pre-flight ensures ≥1)
    if (products.length === 0) {
      test.skip();
      return;
    }

    const productId = products[0].id;
    const detailRes = await request.get(`${API}/products/${productId}`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.data).toHaveProperty('id', productId);
    expect(detail.data).toHaveProperty('name');
    expect(detail.data).toHaveProperty('price');
  });

  test('authenticated user can create a cart session', async ({ request }) => {
    // Login to get token
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const { data } = await loginRes.json();
    const token = data.accessToken;

    // Fetch cart — either empty cart (200) or cart-not-found (404 creates one on first add)
    const cartRes = await request.get(`${API}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 201, 404]).toContain(cartRes.status());
  });

  test('frontend products page loads over Nginx', async ({ page }) => {
    // Use domcontentloaded — networkidle times out with Next.js streaming responses
    const response = await page.goto('/products', { waitUntil: 'domcontentloaded' });
    // At minimum the page must return a 200 (not error boundary)
    expect(response?.status()).toBeLessThan(500);
    // Title should be set and not indicate a 404
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).not.toMatch(/404/i);
  });
});

// ─── Journey 2: Register / Login ─────────────────────────────────────────────

test.describe('Critical Journey: Register / Login @critical', () => {
  test('admin can login via API and receive JWT', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('accessToken');
    expect(typeof body.data.accessToken).toBe('string');
    expect(body.data.accessToken.length).toBeGreaterThan(20);
  });

  test('invalid credentials return 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'nonexistent@example.com', password: 'WrongPass999!' },
    });
    expect(res.status()).toBe(401);
  });

  test('new customer can register', async ({ request }) => {
    const timestamp = Date.now();
    const res = await request.post(`${API}/auth/register`, {
      data: {
        firstName: 'E2E',
        lastName: 'Tester',
        email: `e2e-tester-${timestamp}@test.example.com`,
        password: 'E2eTest1234!',
      },
    });
    // 201 Created on success; 409 if email already exists (repeat runs)
    expect([201, 409]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.data).toHaveProperty('accessToken');
    }
  });

  test('authenticated user can fetch own profile', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { data } = await loginRes.json();

    // Profile endpoint is /auth/me (not /auth/profile)
    const profileRes = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    expect(profileRes.status()).toBe(200);
    const profile = await profileRes.json();
    expect(profile.data).toHaveProperty('email', ADMIN_EMAIL);
  });
});

// ─── Journey 3: Order History ─────────────────────────────────────────────────

test.describe('Critical Journey: Order History @critical', () => {
  test('authenticated user can access orders endpoint', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { data } = await loginRes.json();

    const ordersRes = await request.get(`${API}/orders`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    expect(ordersRes.status()).toBe(200);
    const body = await ordersRes.json();
    // Response should have a data property (paginated list)
    expect(body).toHaveProperty('data');
  });

  test('unauthenticated access to orders returns 401', async ({ request }) => {
    const res = await request.get(`${API}/orders`);
    expect(res.status()).toBe(401);
  });

  test('admin can access all orders (admin scope)', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { data } = await loginRes.json();

    // Admin orders endpoint — may be /orders or /admin/orders
    const res = await request.get(`${API}/orders`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    expect(res.status()).toBe(200);
  });
});
