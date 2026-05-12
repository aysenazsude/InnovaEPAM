import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { register } from '@/lib/actions/auth';

// Mock 3rd-party boundaries: NextAuth + Next.js framework
jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

describe('register server action', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should create a user row with hashed password for valid input', async () => {
    const formData = new FormData();
    formData.set('displayName', 'Test User');
    formData.set('email', 'test@example.com');
    formData.set('password', 'SecurePass1');

    const result = await register(formData, testDb);

    expect(result.success).toBe(true);
    const [user] = await testDb.select().from(users).where(eq(users.email, 'test@example.com')).limit(1);
    expect(user).toBeDefined();
    expect(user.displayName).toBe('Test User');
    expect(user.role).toBe('submitter');
    expect(user.passwordHash).toMatch(/^\$2/);
    expect(user.failedLoginCount).toBe(0);
  });

  it('should reject a duplicate email without leaking account existence', async () => {
    await loginAs(testDb, 'submitter', { email: 'existing@example.com' });

    const formData = new FormData();
    formData.set('displayName', 'Duplicate User');
    formData.set('email', 'existing@example.com');
    formData.set('password', 'SecurePass1');

    const result = await register(formData, testDb);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toMatch(/Registration failed/);
    }
  });

  it('should store email in lowercase', async () => {
    const formData = new FormData();
    formData.set('displayName', 'Case Test');
    formData.set('email', 'UPPER@EXAMPLE.COM');
    formData.set('password', 'SecurePass1');

    const result = await register(formData, testDb);

    expect(result.success).toBe(true);
    const [user] = await testDb.select().from(users).where(eq(users.email, 'upper@example.com')).limit(1);
    expect(user.email).toBe('upper@example.com');
  });

  it('should return error for missing displayName', async () => {
    const formData = new FormData();
    formData.set('displayName', '');
    formData.set('email', 'valid@example.com');
    formData.set('password', 'SecurePass1');

    const result = await register(formData, testDb);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.displayName).toBeDefined();
    }
  });

  it('should return error for missing email', async () => {
    const formData = new FormData();
    formData.set('displayName', 'Test User');
    formData.set('email', '');
    formData.set('password', 'SecurePass1');

    const result = await register(formData, testDb);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it('should return error for weak password', async () => {
    const formData = new FormData();
    formData.set('displayName', 'Test User');
    formData.set('email', 'valid@example.com');
    formData.set('password', 'weak');

    const result = await register(formData, testDb);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.password).toBeDefined();
    }
  });

  it('should not insert a row when validation fails', async () => {
    const formData = new FormData();
    formData.set('displayName', '');
    formData.set('email', 'valid@example.com');
    formData.set('password', 'SecurePass1');

    await register(formData, testDb);

    const all = await testDb.select().from(users);
    expect(all).toHaveLength(0);
  });
});
