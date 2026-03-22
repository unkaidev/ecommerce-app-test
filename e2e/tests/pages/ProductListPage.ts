import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the product listing page.
 * Provides helpers for searching products and interacting with product cards.
 */
export class ProductListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/products');
    await this.waitForNetworkIdle();
  }

  async getProductCount(): Promise<number> {
    const cards = this.page.locator('[data-testid="product-card"], .product-card, article');
    return cards.count();
  }

  async searchProducts(query: string): Promise<void> {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="search" i]');
    await searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForNetworkIdle();
  }

  async clickFirstProduct(): Promise<void> {
    const firstCard = this.page
      .locator('[data-testid="product-card"], .product-card, article')
      .first();
    await firstCard.click();
  }

  async addFirstProductToCart(): Promise<void> {
    const addBtn = this.page
      .locator('button:has-text("Add to Cart"), button:has-text("Add to cart")')
      .first();
    await addBtn.click();
  }
}
