import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass1';

async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas|\/admin/, { timeout: 10000 });
}

async function registerAndLoginSubmitter(page: Page) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `scoring-submitter-${uid}@example.com`;
  const password = 'SecurePass1';

  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="displayName"]', 'Scoring Submitter');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/, { timeout: 10000 });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas/, { timeout: 10000 });
}

test.describe('Admin scores an idea during pipeline review', () => {
  test.describe.configure({ mode: 'serial' });

  let ideaId = '';

  test('submitter creates an idea', async ({ page }) => {
    await registerAndLoginSubmitter(page);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'Scoring E2E Test Idea');
    await page.fill(
      'textarea[name="description"]',
      'This idea is used to verify the scoring system end-to-end.'
    );

    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas$/, { timeout: 10000 });
  });

  test('admin navigates to pipeline review page and can see scoring fields', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    // Find the scoring test idea card on admin dashboard
    const ideaLink = page.getByText('Scoring E2E Test Idea').first();
    await expect(ideaLink).toBeVisible({ timeout: 10000 });

    // Navigate to the idea (via closest link)
    await ideaLink.click();
    await page.waitForURL(/\/admin\/ideas\/.+/, { timeout: 10000 });

    const url = page.url();
    const match = url.match(/\/admin\/ideas\/([^/]+)/);
    if (match) ideaId = match[1];

    // Navigate to review page
    const reviewUrl = url.includes('/review') ? url : `${BASE_URL}/admin/ideas/${ideaId}/review`;
    await page.goto(reviewUrl);
    await page.waitForURL(/\/review$/, { timeout: 10000 });

    // The ScoringPanel should be visible
    await expect(page.getByRole('group', { name: /innovation/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('group', { name: /feasibility/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('group', { name: /business impact/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('group', { name: /strategic alignment/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('group', { name: /technical soundness/i })).toBeVisible({ timeout: 10000 });
  });
});
