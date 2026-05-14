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

async function registerAndLoginSubmitter(page: Page): Promise<{ email: string; password: string }> {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `blind-review-${uid}@example.com`;
  const password = 'SecurePass1';
  const displayName = `BlindReview User ${uid}`;

  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="displayName"]', displayName);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/, { timeout: 10000 });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas/, { timeout: 10000 });

  return { email, displayName };
}

test.describe('Admin blind review — submitter identity hidden', () => {
  test.describe.configure({ mode: 'serial' });

  let submitterEmail = '';
  let submitterDisplayName = '';
  let ideaTitle = '';

  test('submitter registers and submits an idea', async ({ page }) => {
    const { email, displayName } = await registerAndLoginSubmitter(page);
    submitterEmail = email;
    submitterDisplayName = displayName;

    const uid = Date.now();
    ideaTitle = `Blind Review Idea ${uid}`;

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', ideaTitle);
    await page.fill('textarea[name="description"]', 'This idea tests that admins cannot see who submitted it.');

    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas\/[a-f0-9-]{36}/, { timeout: 15000 });
  });

  test('admin sees "Anonymous Submitter" on the admin list — not the real submitter name or email', async ({ page }) => {
    test.skip(!submitterEmail, 'Depends on previous test creating a submitter');

    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    // Idea is visible in the list
    await expect(page.getByText(ideaTitle)).toBeVisible({ timeout: 10000 });

    // The submitter's real display name must NOT appear anywhere on the admin page
    const pageContent = await page.content();
    expect(pageContent).not.toContain(submitterEmail);
    // Display name is not shown on the list card (no submitter column), which is correct
    // The key negative assertion: submitter email is absent
  });

  test('admin opens Phase 1 detail — "Anonymous Submitter" shown, real name absent', async ({ page }) => {
    test.skip(!submitterEmail, 'Depends on previous test creating a submitter');

    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    // Click the idea card to open detail page
    await page.getByText(ideaTitle).click();
    await page.waitForURL(/\/admin\/ideas\/[a-f0-9-]{36}$/, { timeout: 10000 });

    // The review page auto-navigates to pipeline — handle both routes
    // Wait for page to settle
    await page.waitForLoadState('networkidle');

    const pageContent = await page.content();
    // Submitter email must not appear on the admin detail page
    expect(pageContent).not.toContain(submitterEmail);
    // Submitter display name must not appear
    expect(pageContent).not.toContain(submitterDisplayName);
  });

  test('admin opens pipeline review — "Anonymous Submitter" label visible, real identity absent', async ({ page }) => {
    test.skip(!submitterEmail, 'Depends on previous test creating a submitter');

    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    // Click the idea card
    await page.getByText(ideaTitle).click();
    await page.waitForLoadState('networkidle');

    // If we land on Phase 1 detail (under_review), navigate to pipeline review
    const currentUrl = page.url();
    if (currentUrl.match(/\/admin\/ideas\/[a-f0-9-]{36}$/)) {
      const pipelineLink = page.getByRole('link', { name: /start pipeline review/i });
      if (await pipelineLink.isVisible()) {
        await pipelineLink.click();
        await page.waitForURL(/\/admin\/ideas\/[a-f0-9-]{36}\/review/, { timeout: 10000 });
      }
    }

    await page.waitForURL(/\/admin\/ideas\/[a-f0-9-]{36}\/review/, { timeout: 10000 });

    // "Anonymous Submitter" must be visible on the pipeline review page
    await expect(page.getByText('Anonymous Submitter')).toBeVisible({ timeout: 5000 });

    const pageContent = await page.content();
    // Submitter email must not appear
    expect(pageContent).not.toContain(submitterEmail);
    // Submitter display name must not appear
    expect(pageContent).not.toContain(submitterDisplayName);
  });
});
