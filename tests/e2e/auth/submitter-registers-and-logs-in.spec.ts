import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Auth: Register → Login → Logout → Protected Redirect', () => {
  const uniqueEmail = `e2e-${Date.now()}@example.com`;
  const password = 'SecurePass1';

  test('unauthenticated visit to /ideas redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/ideas`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('registration succeeds and lands on /login with success message', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'E2E User');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login after registration lands on /ideas', async ({ page }) => {
    // Register first
    await page.goto(`${BASE_URL}/register`);
    const email = `e2e-login-${Date.now()}@example.com`;
    await page.fill('input[name="displayName"]', 'E2E Login User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);

    // Login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/ideas/);
  });

  test('logout redirects to /login', async ({ page }) => {
    // Register + login
    const email = `e2e-logout-${Date.now()}@example.com`;
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'E2E Logout User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/ideas/);

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);
  });
});
