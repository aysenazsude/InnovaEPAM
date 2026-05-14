import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SUBMITTER_EMAIL = process.env.E2E_SUBMITTER_EMAIL ?? 'submitter@example.com';
const SUBMITTER_PASSWORD = process.env.E2E_SUBMITTER_PASSWORD ?? 'SubmitterPass1';

async function loginAs(page: Page, role: 'admin' | 'submitter') {
  const email = role === 'submitter' ? SUBMITTER_EMAIL : (process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com');
  const password = role === 'submitter' ? SUBMITTER_PASSWORD : (process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass1');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas|\/admin|\/home/);
}

test.describe('Submitter sees spotlight sections', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'submitter');
    await page.goto('/home');
  });

  test('spotlight card section is visible', async ({ page }) => {
    await expect(page.getByText(/idea of the month/i)).toBeVisible();
  });

  test('recently approved section is visible', async ({ page }) => {
    await expect(page.getByText(/recently approved/i)).toBeVisible();
  });

  test('monthly activity strip is visible', async ({ page }) => {
    await expect(page.getByText(/submitted/i).first()).toBeVisible();
    await expect(page.getByText(/in review/i).first()).toBeVisible();
    await expect(page.getByText(/approved/i).first()).toBeVisible();
  });

  test('no console errors on home page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
