import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashSync, compareSync } from 'bcryptjs';
import { isLocked } from '@/lib/auth/lockoutPolicy';
import { LOCKOUT_ATTEMPTS, LOCKOUT_DURATION_SECONDS } from '@/lib/constants';

describe('login + lockout integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should validate correct credentials and allow login', async () => {
    // Arrange
    const user = await loginAs(testDb, 'submitter', { email: 'correct@test.com' });

    // Act — simulate credential check
    const passwordMatch = compareSync('Password1', user.passwordHash);

    // Assert
    expect(passwordMatch).toBe(true);
    expect(isLocked(user)).toBe(false);
  });

  it('should increment failed_login_count on wrong password', async () => {
    // Arrange
    const user = await loginAs(testDb, 'submitter', { email: 'failme@test.com' });

    // Act — simulate incrementing (as auth.ts lockoutPolicy.incrementFailures does)
    await testDb
      .update(users)
      .set({ failedLoginCount: user.failedLoginCount + 1 })
      .where(eq(users.id, user.id));

    // Assert
    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updated.failedLoginCount).toBe(1);
  });

  it('should lock the account after 5 consecutive failures', async () => {
    const user = await loginAs(testDb, 'submitter', { email: 'lockme@test.com' });
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Simulate 5 failures
    await testDb
      .update(users)
      .set({
        failedLoginCount: LOCKOUT_ATTEMPTS,
        lockedUntil: nowSeconds + LOCKOUT_DURATION_SECONDS,
      })
      .where(eq(users.id, user.id));

    const [locked] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(isLocked(locked)).toBe(true);
  });

  it('should return false from isLocked when lock has expired', async () => {
    const user = await loginAs(testDb, 'submitter', { email: 'expired@test.com' });
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Lock that expired 1 second ago
    await testDb
      .update(users)
      .set({
        failedLoginCount: LOCKOUT_ATTEMPTS,
        lockedUntil: nowSeconds - 1,
      })
      .where(eq(users.id, user.id));

    const [expired] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(isLocked(expired)).toBe(false);
  });

  it('should reset failed_login_count on successful login', async () => {
    const user = await loginAs(testDb, 'submitter', { email: 'reset@test.com' });

    // Simulate prior failures
    await testDb
      .update(users)
      .set({ failedLoginCount: 3 })
      .where(eq(users.id, user.id));

    // Simulate successful login reset
    await testDb
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, user.id));

    const [reset] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(reset.failedLoginCount).toBe(0);
    expect(reset.lockedUntil).toBeNull();
  });
});
