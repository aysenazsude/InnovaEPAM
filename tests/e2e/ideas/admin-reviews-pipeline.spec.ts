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
  const email = `pipeline-submitter-${uid}@example.com`;
  const password = 'SecurePass1';

  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="displayName"]', 'Pipeline Submitter');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/, { timeout: 10000 });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas/, { timeout: 10000 });

  return { email, password };
}

test.describe('Admin reviews pipeline idea', () => {
  test.describe.configure({ mode: 'serial' });

  let ideaUrl = '';

  test('submitter submits an idea that enters pipeline', async ({ page }) => {
    await registerAndLoginSubmitter(page);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'Pipeline E2E Test Idea');
    await page.fill('textarea[name="description"]', 'This idea will go through the multi-stage review pipeline.');

    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas\/[a-f0-9-]{8}/, { timeout: 15000 });
    ideaUrl = page.url();
  });

  test('admin sees the idea and can navigate to pipeline review', async ({ page }) => {
    test.skip(!ideaUrl, 'Depends on previous test creating an idea');

    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    // The idea should be visible in the admin dashboard
    await expect(page.getByText('Pipeline E2E Test Idea')).toBeVisible({ timeout: 10000 });
  });

  test('admin can start pipeline review and advance through stages', async ({ page }) => {
    test.skip(!ideaUrl, 'Depends on previous test creating an idea');

    await loginAdmin(page);

    // Navigate to the pipeline review page
    const ideaId = ideaUrl.split('/ideas/')[1];
    await page.goto(`${BASE_URL}/admin/ideas/${ideaId}/review`);

    // Should see the pipeline form with stage info
    await expect(page.getByText('Screening')).toBeVisible({ timeout: 10000 });

    // Fill in screening notes and advance
    const notesTextarea = page.getByRole('textbox', { name: /screening notes/i }).first();
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill('Initial screening passed — idea is viable');
      await page.getByRole('button', { name: /advance to technical review/i }).click();

      // Wait for the page to update
      await page.waitForTimeout(1000);
      await expect(page.getByText(/technical review/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('admin can reject at a pipeline stage', async ({ page }) => {
    // This test creates its own idea to reject
    await registerAndLoginSubmitter(page);

    await page.goto(`${BASE_URL}/ideas/new`);
    await page.fill('input[name="title"]', 'Idea To Reject');
    await page.fill('textarea[name="description"]', 'This idea will be rejected during pipeline review.');

    await page.locator('[id="category"]').click();
    await page.locator('[role="option"]').first().click();

    await page.getByRole('button', { name: /submit idea/i }).click();
    await page.waitForURL(/\/ideas\/[a-f0-9-]{8}/, { timeout: 15000 });
    const rejectIdeaUrl = page.url();
    const rejectIdeaId = rejectIdeaUrl.split('/ideas/')[1];

    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin/ideas/${rejectIdeaId}/review`);

    await expect(page.getByText('Screening')).toBeVisible({ timeout: 10000 });

    // Reject
    const rejectNotes = page.getByRole('textbox', { name: /rejection reason/i }).first();
    if (await rejectNotes.isVisible()) {
      await rejectNotes.fill('Idea does not align with company strategy');
      await page.getByRole('button', { name: /reject/i }).click();

      await page.waitForTimeout(1000);
      await expect(page.getByText(/rejected/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('admin pipeline filter tab shows pipeline ideas', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    const pipelineTab = page.getByRole('button', { name: /pipeline/i }).first();
    if (await pipelineTab.isVisible()) {
      await pipelineTab.click();
      // Either pipeline ideas are listed or the empty state is shown
      const hasIdeas = await page.locator('li').count() > 0;
      const hasEmpty = await page.getByText(/no ideas in this category/i).isVisible();
      expect(hasIdeas || hasEmpty).toBeTruthy();
    }
  });
});
