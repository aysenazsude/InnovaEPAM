import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass1';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas|\/admin/);
}

test.describe('Admin evaluates idea', () => {
  test('admin can open admin dashboard', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });

  test('empty comment blocked on evaluation', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/admin`);

    // If any ideas exist, open the first one
    const firstLink = page.locator('a[href^="/admin/ideas/"]').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForURL(/\/admin\/ideas\//);

      // Try Accept without comment
      const acceptBtn = page.getByRole('button', { name: /accept/i });
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click();
        await expect(page.getByText('Comment is required')).toBeVisible();
      }
    }
  });
});
