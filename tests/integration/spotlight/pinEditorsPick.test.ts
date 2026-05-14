import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { spotlightPicks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { pinEditorsPick, unpinEditorsPick } from '@/lib/actions/spotlight';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), {
      digest: `NEXT_REDIRECT;replace;${url};200;`,
    });
  }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

describe('pinEditorsPick server action', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return Unauthorized when no session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await pinEditorsPick('some-idea-id', testDb);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return Unauthorized when role is not admin', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const result = await pinEditorsPick('some-idea-id', testDb);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return idea not found when ideaId does not exist', async () => {
    const admin = await loginAs(testDb, 'admin');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const result = await pinEditorsPick('non-existent-id', testDb);

    expect(result).toEqual({ success: false, error: 'Idea not found' });
  });

  it('should pin an idea as Editor\'s Pick for the current month', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const idea = await submitIdea(testDb, submitter.id);

    const result = await pinEditorsPick(idea.id, testDb);

    expect(result).toEqual({ success: true });

    const picks = await testDb.select().from(spotlightPicks).where(eq(spotlightPicks.monthYear, '2026-05'));
    expect(picks).toHaveLength(1);
    expect(picks[0].ideaId).toBe(idea.id);
    expect(picks[0].pinnedByAdminId).toBe(admin.id);
  });

  it('should replace an existing pick for the same month (upsert behaviour)', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const idea1 = await submitIdea(testDb, submitter.id, { title: 'First Pick' });
    const idea2 = await submitIdea(testDb, submitter.id, { title: 'Second Pick' });

    await pinEditorsPick(idea1.id, testDb);
    const result = await pinEditorsPick(idea2.id, testDb);

    expect(result).toEqual({ success: true });

    const picks = await testDb.select().from(spotlightPicks).where(eq(spotlightPicks.monthYear, '2026-05'));
    expect(picks).toHaveLength(1);
    expect(picks[0].ideaId).toBe(idea2.id);
  });
});

describe('unpinEditorsPick server action', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return Unauthorized when no session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await unpinEditorsPick(testDb);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return Unauthorized when role is not admin', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const result = await unpinEditorsPick(testDb);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should delete the current month pick when one exists', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const idea = await submitIdea(testDb, submitter.id);
    await testDb.insert(spotlightPicks).values({
      id: randomUUID(),
      ideaId: idea.id,
      monthYear: '2026-05',
      pinnedAt: Math.floor(Date.now() / 1000),
      pinnedByAdminId: admin.id,
    });

    const result = await unpinEditorsPick(testDb);

    expect(result).toEqual({ success: true });

    const picks = await testDb.select().from(spotlightPicks).where(eq(spotlightPicks.monthYear, '2026-05'));
    expect(picks).toHaveLength(0);
  });

  it('should succeed (idempotent) when no pick exists for the current month', async () => {
    const admin = await loginAs(testDb, 'admin');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const result = await unpinEditorsPick(testDb);

    expect(result).toEqual({ success: true });
  });
});
