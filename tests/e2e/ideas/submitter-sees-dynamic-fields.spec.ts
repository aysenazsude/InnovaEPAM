import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Smart Submission Forms: Dynamic Category Fields', () => {
  test.describe.configure({ mode: 'serial' });

  const password = 'SecurePass1';

  async function registerAndLogin(page: import('@playwright/test').Page) {
    const email = `e2e-fields-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="displayName"]', 'Dynamic Fields User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|ideas)/);
    return email;
  }

  test('selecting a category shows category-specific fields', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto(`${BASE_URL}/ideas/new`);

    // Before selection, no category-specific fields or guidance
    await expect(page.getByTestId('category-guidance')).not.toBeVisible();

    // Select process_improvement
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /process improvement/i }).click();

    // Guidance text should now be visible
    await expect(page.getByTestId('category-guidance')).toBeVisible();

    // Category-specific fields should appear
    await expect(page.getByLabel(/affected team/i)).toBeVisible();
    await expect(page.getByLabel(/current pain point/i)).toBeVisible();
  });

  test('switching category replaces fields', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto(`${BASE_URL}/ideas/new`);

    // Select process_improvement
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /process improvement/i }).click();
    await expect(page.getByLabel(/affected team/i)).toBeVisible();

    // Switch to technical_innovation
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /technical innovation/i }).click();

    await expect(page.getByLabel(/technology area/i)).toBeVisible();
    await expect(page.getByLabel(/estimated effort/i)).toBeVisible();
    await expect(page.getByLabel(/affected team/i)).not.toBeVisible();
  });

  test('title and description are preserved when switching category', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto(`${BASE_URL}/ideas/new`);

    await page.fill('input[name="title"]', 'My Persistent Title');
    await page.fill('textarea[name="description"]', 'My Persistent Description');

    // Switch category
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /process improvement/i }).click();

    await expect(page.locator('input[name="title"]')).toHaveValue('My Persistent Title');
    await expect(page.locator('textarea[name="description"]')).toHaveValue('My Persistent Description');
  });

  test('character counter updates as user types in textarea field', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto(`${BASE_URL}/ideas/new`);

    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /process improvement/i }).click();

    // Type in the textarea
    await page.fill('textarea[name="current_pain_point"]', 'Some pain point text');

    // Counter should reflect the character count
    await expect(page.getByText(/20\s*\/\s*500/)).toBeVisible();
  });

  test('other category shows no extra fields', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto(`${BASE_URL}/ideas/new`);

    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /^other$/i }).click();

    await expect(page.getByTestId('category-guidance')).not.toBeVisible();
  });

  test('can submit an idea with category-specific fields and see it in the list', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto(`${BASE_URL}/ideas/new`);

    await page.fill('input[name="title"]', 'E2E Dynamic Fields Idea');
    await page.fill('textarea[name="description"]', 'Testing the dynamic fields feature end-to-end.');

    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: /process improvement/i }).click();

    await page.fill('input[name="affected_team"]', 'QA Team');
    await page.fill('textarea[name="current_pain_point"]', 'Testing is slow and manual.');

    await page.getByRole('button', { name: /submit idea/i }).click();

    // Should redirect to the idea detail page
    await page.waitForURL(/\/ideas\/.+/);
    await expect(page.getByText('E2E Dynamic Fields Idea')).toBeVisible();
  });
});
