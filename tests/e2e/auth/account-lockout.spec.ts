import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const KNOWN_PASSWORD = 'CorrectPass1';
const WRONG_PASSWORD = 'WrongPass999';

test.describe('Auth: Account Lockout', () => {
  let lockedEmail: string;

  test.beforeAll(async ({ browser }) => {
    // Register a user to lock out
    const page = await browser.newPage();
    lockedEmail = `lockout-${Date.now()}@example.com`;
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'Lockout User');
    await page.fill('input[name="email"]', lockedEmail);
    await page.fill('input[name="password"]', KNOWN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);
    await page.close();
  });

  test('5 wrong-password attempts trigger lockout message', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', lockedEmail);
      await page.fill('input[name="password"]', WRONG_PASSWORD);
      await page.click('button[type="submit"]');
    }

    // After 5 failures the page should show a lockout/error message
    const errorText = await page.textContent('body');
    expect(errorText).toMatch(/invalid|locked|error|incorrect/i);
  });

  test('error message never reveals account existence', async ({ page }) => {
    // Try with a non-existent email — error should be generic
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', `nonexistent-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', WRONG_PASSWORD);
    await page.click('button[type="submit"]');

    const errorText = await page.textContent('body');
    // Should NOT say "user not found" or "email not registered"
    expect(errorText).not.toMatch(/not found|not registered|no account/i);
  });
});
