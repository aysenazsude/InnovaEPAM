import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// ── Minimal buffers ─────────────────────────────────────────────────────────────
const PDF_BYTES = Buffer.from('%PDF-1.4 test');
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function registerAndLogin(page: import('@playwright/test').Page) {
  const email = `val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="displayName"]', 'Validation Tester');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'SecurePass1');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'SecurePass1');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ideas/);
}

async function goToNewIdeaForm(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/ideas/new`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
test.describe('Attachment validation', () => {
  test('add-file control is absent after 3 files are staged', async ({ page }) => {
    await registerAndLogin(page);
    await goToNewIdeaForm(page);

    const picker = page.locator('[data-testid="file-picker"]');

    await picker.setInputFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES });
    await picker.setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: PNG_BYTES });
    // Stage a third file
    await picker.setInputFiles({
      name: 'c.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_BYTES,
    });

    // "Add File" button should no longer be in the DOM
    await expect(page.getByRole('button', { name: 'Add File' })).not.toBeVisible();
    // The count-limit message should be shown
    await expect(page.getByText(/maximum 3 files/i)).toBeVisible();
  });

  test('attaching a disallowed file type shows inline error; other staged files intact', async ({
    page,
  }) => {
    await registerAndLogin(page);
    await goToNewIdeaForm(page);

    const picker = page.locator('[data-testid="file-picker"]');

    // Stage a valid PDF first
    await picker.setInputFiles({ name: 'valid.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES });
    await expect(page.getByText('valid.pdf')).toBeVisible();

    // Now stage an .exe file (disallowed type)
    await picker.setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ'),
    });

    // Error should appear for the exe file
    await expect(page.getByRole('alert').filter({ hasText: /not allowed/i })).toBeVisible();

    // Valid PDF is still visible and not removed
    await expect(page.getByText('valid.pdf')).toBeVisible();
  });

  test('attaching a duplicate file name shows inline error; original file intact', async ({
    page,
  }) => {
    await registerAndLogin(page);
    await goToNewIdeaForm(page);

    const picker = page.locator('[data-testid="file-picker"]');

    // Stage the original file
    await picker.setInputFiles({ name: 'same.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES });
    await expect(page.getByText('same.pdf')).toBeVisible();

    // Stage a duplicate
    await picker.setInputFiles({ name: 'same.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES });

    // Duplicate error should appear
    await expect(page.getByRole('alert').filter({ hasText: /already added/i })).toBeVisible();
  });
});
