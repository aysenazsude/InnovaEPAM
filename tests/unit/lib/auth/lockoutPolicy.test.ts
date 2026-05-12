import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createSubmitter } from '../../../fixtures/users';
import { createTestDb, loginAs } from '../../../helpers/authHelpers';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LOCKOUT_ATTEMPTS } from '@/lib/constants';

describe('lockoutPolicy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isLocked', () => {
    it('should return false when failedLoginCount is below threshold', async () => {
      const { isLocked } = await import('@/lib/auth/lockoutPolicy');
      const user = createSubmitter({ failedLoginCount: 4, lockedUntil: null });
      expect(isLocked(user)).toBe(false);
    });

    it('should return true when account is locked and expiry is in the future', async () => {
      const { isLocked } = await import('@/lib/auth/lockoutPolicy');
      const nowSeconds = Math.floor(Date.now() / 1000);
      const user = createSubmitter({ failedLoginCount: 5, lockedUntil: nowSeconds + 500 });
      expect(isLocked(user)).toBe(true);
    });

    it('should return false when lock has expired', async () => {
      const { isLocked } = await import('@/lib/auth/lockoutPolicy');
      const nowSeconds = Math.floor(Date.now() / 1000);
      const user = createSubmitter({ failedLoginCount: 5, lockedUntil: nowSeconds - 1 });
      expect(isLocked(user)).toBe(false);
    });

    it('should return false when lockedUntil is null', async () => {
      const { isLocked } = await import('@/lib/auth/lockoutPolicy');
      const user = createSubmitter({ failedLoginCount: 0, lockedUntil: null });
      expect(isLocked(user)).toBe(false);
    });
  });

  describe('getLockExpiry', () => {
    it('should return now + 900 seconds', async () => {
      const { getLockExpiry } = await import('@/lib/auth/lockoutPolicy');
      const now = 1_700_000_000;
      expect(getLockExpiry(now)).toBe(now + 900);
    });
  });
});

describe('incrementFailures', () => {
  it('should increment failedLoginCount by 1', async () => {
    const { incrementFailures } = await import('@/lib/auth/lockoutPolicy');
    const testDb = createTestDb();
    const user = await loginAs(testDb, 'submitter');

    await incrementFailures(testDb, user.id);

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updated.failedLoginCount).toBe(1);
    expect(updated.lockedUntil).toBeNull();
  });

  it('should set lockedUntil when count reaches the lockout threshold', async () => {
    const { incrementFailures } = await import('@/lib/auth/lockoutPolicy');
    const testDb = createTestDb();
    const user = await loginAs(testDb, 'submitter', { failedLoginCount: LOCKOUT_ATTEMPTS - 1 });

    await incrementFailures(testDb, user.id);

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updated.failedLoginCount).toBe(LOCKOUT_ATTEMPTS);
    expect(updated.lockedUntil).not.toBeNull();
  });

  it('should do nothing when user does not exist', async () => {
    const { incrementFailures } = await import('@/lib/auth/lockoutPolicy');
    const testDb = createTestDb();

    await expect(incrementFailures(testDb, 'non-existent-id')).resolves.toBeUndefined();
  });
});

describe('resetFailures', () => {
  it('should reset failedLoginCount to 0 and lockedUntil to null', async () => {
    const { resetFailures } = await import('@/lib/auth/lockoutPolicy');
    const testDb = createTestDb();
    const now = Math.floor(Date.now() / 1000);
    const user = await loginAs(testDb, 'submitter', {
      failedLoginCount: LOCKOUT_ATTEMPTS,
      lockedUntil: now + 900,
    });

    await resetFailures(testDb, user.id);

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updated.failedLoginCount).toBe(0);
    expect(updated.lockedUntil).toBeNull();
  });
});
