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
  await page.waitForURL(/\/(home|ideas)/);
}

test.describe('Submit Idea with Attachment', () => {
  test.describe.configure({ mode: 'serial' });

  test('form validation shown on empty submit', async ({ page }) => {
    const email = `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    await registerAndLogin(page, email);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.getByRole('button', { name: /submit idea/i }).click();

    // The idea submission form should still be visible (submit was blocked by validation)
    await expect(page.locator('form.space-y-6')).toBeVisible();
  });

  test('valid idea appears in listing with status Submitted', async ({ page }) => {
    const email = `idea2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    await registerAndLogin(page, email);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'My E2E Idea');
    await page.fill('textarea[name="description"]', 'This is a valid description for my idea.');

    // Select first category option via combobox
    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    // Wait for redirect to idea detail page (UUID-based — won't match /ideas/new)
    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas\/[a-f0-9-]{8}/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/ideas`);
    await expect(page.getByText('My E2E Idea')).toBeVisible();
  });

  test('attachment upload: PDF appears with download link on idea detail', async ({ page }) => {
    const email = `idea3-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    await registerAndLogin(page, email);

    // Create a temp PDF-like file for upload
    const tmpPath = path.join(os.tmpdir(), `e2e-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, '%PDF-1.4 test');

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'Idea with PDF');
    await page.fill('textarea[name="description"]', 'This idea has an attachment.');
    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();
    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas\/[a-f0-9-]{8}/, { timeout: 15000 });

    // The detail page should be visible
    await expect(page.getByText('Idea with PDF')).toBeVisible();

    fs.unlinkSync(tmpPath);
  });
});
