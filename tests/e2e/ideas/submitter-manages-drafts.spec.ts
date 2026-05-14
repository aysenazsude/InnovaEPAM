import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const SHARED_PASSWORD = 'SecurePass1';

async function registerAndLogin(page: Page, email: string) {
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="displayName"]', 'Draft Tester');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', SHARED_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', SHARED_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas$/, { timeout: 10000 });
}

async function loginOnly(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', SHARED_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas$/, { timeout: 10000 });
}

test.describe('Submitter manages drafts', () => {
  test.describe.configure({ mode: 'serial' });

  let draftTitle: string;
  let sharedEmail: string;

  test('save a draft from the new idea form', async ({ page }) => {
    sharedEmail = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    draftTitle = `My Draft ${Date.now()}`;
    await registerAndLogin(page, sharedEmail);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', draftTitle);
    await page.fill('textarea[name="description"]', 'A draft description to be completed later.');

    await page.getByRole('button', { name: /save draft/i }).click();

    // Expect success confirmation
    await expect(page.getByText(/draft saved successfully/i)).toBeVisible({ timeout: 8000 });
  });

  test.skip('draft appears in My Drafts list', async ({ page }) => {
    await loginOnly(page, sharedEmail);
    await page.goto(`${BASE_URL}/ideas/drafts`);

    await expect(page.getByRole('link', { name: /my drafts/i }).or(page.getByRole('heading', { name: /my drafts/i }))).toBeVisible();
    await expect(page.getByText(draftTitle ?? '')).toBeVisible();
  });

  test('resuming a draft pre-fills the form', async ({ page }) => {
    await loginOnly(page, sharedEmail);
    await page.goto(`${BASE_URL}/ideas/drafts`);

    await page.getByRole('link', { name: /resume/i }).first().click();
    await page.waitForURL(/\/ideas\/new\?draftId=/);

    await expect(page.locator('input[name="title"]')).toHaveValue(draftTitle ?? '', { timeout: 5000 });
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
      'A draft description to be completed later.'
    );
  });

  test('submit a draft as an idea navigates to the idea detail page', async ({ page }) => {
    await loginOnly(page, sharedEmail);
    await page.goto(`${BASE_URL}/ideas/drafts`);
    await page.getByRole('link', { name: /resume/i }).first().click();
    await page.waitForURL(/\/ideas\/new\?draftId=/);

    // Select a category so the idea is valid for submission
    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas\/[a-f0-9-]{8}/, { timeout: 15000 });

    // Idea title should be shown on the detail page
    if (draftTitle) {
      await expect(page.getByText(draftTitle)).toBeVisible();
    }
  });

  test('submitted draft is removed from My Drafts list', async ({ page }) => {
    await loginOnly(page, sharedEmail);
    await page.goto(`${BASE_URL}/ideas/drafts`);

    if (draftTitle) {
      await expect(page.getByText(draftTitle)).not.toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByText(/you have no saved drafts/i)).toBeVisible();
  });

  test('delete flow: save a draft then delete it from the list', async ({ page }) => {
    const email = `draft-del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const title = `Delete Me ${Date.now()}`;
    await registerAndLogin(page, email);

    // Save a draft
    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', 'This one will be deleted.');
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/draft saved successfully/i)).toBeVisible({ timeout: 8000 });

    // Go to drafts list and delete it
    await page.goto(`${BASE_URL}/ideas/drafts`);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete/i }).first().click();

    // After deletion the empty-state message should show
    await expect(page.getByText(/you have no saved drafts/i)).toBeVisible({ timeout: 8000 });
  });
});
