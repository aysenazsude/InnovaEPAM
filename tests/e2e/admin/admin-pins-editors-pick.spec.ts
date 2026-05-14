import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass1';

async function loginAs(page: Page, role: 'admin' | 'submitter') {
  const email = role === 'admin' ? ADMIN_EMAIL : (process.env.E2E_SUBMITTER_EMAIL ?? 'submitter@example.com');
  const password = role === 'admin' ? ADMIN_PASSWORD : (process.env.E2E_SUBMITTER_PASSWORD ?? 'SubmitterPass1');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas|\/admin|\/home/);
}

test.describe('Admin pins Editor\'s Pick', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
  });

  test('admin sees "Pin as Editor\'s Pick" buttons on idea cards', async ({ page }) => {
    const pinButtons = page.getByRole('button', { name: /pin as editor.s pick/i });
    await expect(pinButtons.first()).toBeVisible();
  });
});
