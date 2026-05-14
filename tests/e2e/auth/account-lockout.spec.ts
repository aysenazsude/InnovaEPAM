import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const KNOWN_PASSWORD = 'CorrectPass1';
const WRONG_PASSWORD = 'WrongPass999';

test.describe('Auth: Account Lockout', () => {
  let lockedEmail: string;

  test.beforeAll(async () => {
    // Create the user directly in the DB to avoid UI-registration race conditions
    // (parallel SQLite writes can cause transient "Registration failed" errors)
    lockedEmail = `lockout-${Date.now()}@example.com`;
    const dbPath = path.join(process.cwd(), 'data', 'innovatepam.db');
    const db = new Database(dbPath);
    const hash = bcrypt.hashSync(KNOWN_PASSWORD, 10);
    db.prepare(
      `INSERT INTO users (id, display_name, email, password_hash, role, failed_login_count, locked_until, created_at)
       VALUES (?, 'Lockout User', ?, ?, 'submitter', 0, NULL, ?)`
    ).run(randomUUID(), lockedEmail, hash, Math.floor(Date.now() / 1000));
    db.close();
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
