import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Welcome Dashboard: Submitter sees welcome page after login', () => {
  test.describe.configure({ mode: 'serial' });

  const password = 'SecurePass1';

  test('submitter lands on /home after login', async ({ page }) => {
    const email = `e2e-welcome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

    // Register
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'Welcome Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);

    // Login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should land on /home
    await expect(page).toHaveURL(/\/home/);
  });

  test('welcome page shows system stat cards', async ({ page }) => {
    const email = `e2e-welcome-stats-${Date.now()}@example.com`;

    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'Stats User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/);

    // System stats section should be visible
    await expect(page.getByText(/total ideas/i)).toBeVisible();
    await expect(page.getByText(/approved/i)).toBeVisible();
    await expect(page.getByText(/pipeline/i)).toBeVisible();
  });

  test('clicking Submit New Idea navigates to /ideas/new', async ({ page }) => {
    const email = `e2e-welcome-cta-${Date.now()}@example.com`;

    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'CTA User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/);

    // Click the Submit New Idea link
    await page.getByRole('link', { name: /submit.*idea/i }).first().click();
    await expect(page).toHaveURL(/\/ideas\/new/);
  });

  test('Home nav link is visible in navigation for submitters', async ({ page }) => {
    const email = `e2e-welcome-nav-${Date.now()}@example.com`;

    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'Nav User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/);

    const homeNavLink = page.getByRole('navigation').getByRole('link', { name: /^home$/i });
    await expect(homeNavLink).toBeVisible();
    await expect(homeNavLink).toHaveAttribute('href', '/home');
  });
});
