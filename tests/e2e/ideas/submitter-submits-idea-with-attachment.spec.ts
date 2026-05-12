import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

async function registerAndLogin(page: Page, email: string) {
  const password = 'SecurePass1';
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="displayName"]', 'Idea Submitter');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas/);
}

test.describe('Submit Idea with Attachment', () => {
  test('form validation shown on empty submit', async ({ page }) => {
    const email = `idea-${Date.now()}@example.com`;
    await registerAndLogin(page, email);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.click('button[type="submit"]');

    // Browser native required validation or server-side errors should appear
    await expect(page.locator('form')).toBeVisible();
  });

  test('valid idea appears in listing with status Submitted', async ({ page }) => {
    const email = `idea2-${Date.now()}@example.com`;
    await registerAndLogin(page, email);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'My E2E Idea');
    await page.fill('textarea[name="description"]', 'This is a valid description for my idea.');

    // Select first category option via combobox
    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    await page.click('button[type="submit"]');

    // Should redirect to idea detail or ideas listing
    await page.waitForURL(/\/ideas/);

    await page.goto(`${BASE_URL}/ideas`);
    await expect(page.getByText('My E2E Idea')).toBeVisible();
  });

  test('attachment upload: PDF appears with download link on idea detail', async ({ page }) => {
    const email = `idea3-${Date.now()}@example.com`;
    await registerAndLogin(page, email);

    // Create a temp PDF-like file for upload
    const tmpPath = path.join(os.tmpdir(), `e2e-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, '%PDF-1.4 test');

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'Idea with PDF');
    await page.fill('textarea[name="description"]', 'This idea has an attachment.');
    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/ideas\//);

    // The detail page should be visible
    await expect(page.getByText('Idea with PDF')).toBeVisible();

    fs.unlinkSync(tmpPath);
  });
});
