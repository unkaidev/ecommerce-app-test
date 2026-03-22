import { Page, expect } from '@playwright/test';

/**
 * Base page object providing common navigation and assertion utilities.
 * All page objects extend this class.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  async expectToast(message: string | RegExp): Promise<void> {
    const toast = this.page.locator('[role="alert"], [data-sonner-toast], .toast');
    await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 5000 });
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
