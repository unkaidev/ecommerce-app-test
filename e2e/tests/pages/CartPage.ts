import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the shopping cart sidebar/page.
 * Handles cart item management and checkout navigation.
 */
export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openCart(): Promise<void> {
    const cartBtn = this.page.locator(
      '[data-testid="cart-button"], button:has-text("Cart"), [aria-label*="cart" i]',
    );
    await cartBtn.first().click();
  }

  async getItemCount(): Promise<number> {
    const badge = this.page.locator('[data-testid="cart-count"], .cart-badge');
    const text = await badge.textContent();
    return parseInt(text ?? '0', 10);
  }

  async proceedToCheckout(): Promise<void> {
    const checkoutBtn = this.page.locator(
      'button:has-text("Checkout"), a:has-text("Checkout"), [data-testid="checkout-btn"]',
    );
    await checkoutBtn.first().click();
  }

  async isVisible(): Promise<boolean> {
    const cart = this.page.locator('[data-testid="cart-sidebar"], [role="dialog"], aside');
    return cart.first().isVisible();
  }
}
