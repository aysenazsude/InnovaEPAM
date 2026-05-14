import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { createDraftInDb } from '../../helpers/draftHelpers';
import { getDrafts, getDraft } from '@/lib/actions/drafts';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

describe('getDrafts server action', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should return empty list when user has no drafts', async () => {
    const result = await getDrafts(testDb);
    expect(result).toEqual([]);
  });

  it('should return drafts belonging to the current user only', async () => {
    await createDraftInDb(testDb, submitter.id, { title: 'My Draft' });
    const otherUser = await loginAs(testDb, 'submitter', { email: 'other@test.com' });
    await createDraftInDb(testDb, otherUser.id, { title: 'Other Draft' });

    const result = await getDrafts(testDb);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('My Draft');
  });

  it('should return summaries ordered by updatedAt descending', async () => {
    const now = Math.floor(Date.now() / 1000);
    await createDraftInDb(testDb, submitter.id, {
      title: 'Older Draft',
      updatedAt: now - 1000,
    });
    await createDraftInDb(testDb, submitter.id, {
      title: 'Newer Draft',
      updatedAt: now,
    });

    const result = await getDrafts(testDb);
    expect(result[0].title).toBe('Newer Draft');
    expect(result[1].title).toBe('Older Draft');
  });

  it('should redirect to login when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    await expect(getDrafts(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });
});

describe('getDraft server action', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should return null when draft does not exist', async () => {
    const result = await getDraft('nonexistent-id', testDb);
    expect(result).toBeNull();
  });

  it('should return null when draft belongs to another user', async () => {
    const otherUser = await loginAs(testDb, 'submitter', { email: 'other@test.com' });
    const draft = await createDraftInDb(testDb, otherUser.id, { title: 'Other Draft' });

    const result = await getDraft(draft.id, testDb);
    expect(result).toBeNull();
  });

  it('should return full draft detail for own draft', async () => {
    const draft = await createDraftInDb(testDb, submitter.id, {
      title: 'My Detail Draft',
      description: 'Some desc',
      category: 'technical_innovation',
    });

    const result = await getDraft(draft.id, testDb);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('My Detail Draft');
    expect(result!.description).toBe('Some desc');
    expect(result!.category).toBe('technical_innovation');
    expect(result!.attachments).toEqual([]);
  });

  it('should redirect to login when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    await expect(getDraft('any-id', testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });
});
