import { test, expect } from '@playwright/test';

/**
 * Smoke Tests — fast health checks for all core services.
 * These should always pass; failure indicates a deployment issue.
 */
test.describe('Smoke Tests @smoke', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    // Use domcontentloaded — networkidle times out with Next.js streaming responses
    await page.waitForLoadState('domcontentloaded');
    // Title format: "Home | ShopNext" or "ShopNext" variants
    await expect(page).toHaveTitle(/ShopNext|Ecommerce|Shop/i);
  });

  test('API health check returns 200', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/health');
    expect(res.status()).toBe(200);
    // API wraps all responses: { success, data: { status: 'ok' } }
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toHaveProperty('status', 'ok');
  });

  test('Swagger docs accessible', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/docs');
    expect(res.status()).toBe(200);
  });

  test('products API returns paginated data', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/v1/products');
    expect(res.status()).toBe(200);
    const body = await res.json();
    // API wraps response in { success, data: { data: [...] } }
    expect(body).toHaveProperty('success', true);
    expect(body.data).toBeDefined();
  });

  test('login page renders', async ({ page }) => {
    // Route is /login (Next.js (auth) route group strips the group prefix)
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    // Page should return 200, not a 404 error page
    const title = await page.title();
    expect(title).not.toMatch(/404/i);
    // The page has ShopNext branding
    await expect(page.locator('body')).toContainText(/ShopNext|Sign in|Login/i, { timeout: 10000 });
  });
});
