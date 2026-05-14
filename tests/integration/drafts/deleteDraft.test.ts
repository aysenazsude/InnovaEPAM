import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { createDraftInDb, getDraftById } from '../../helpers/draftHelpers';
import { deleteDraft } from '@/lib/actions/drafts';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));
jest.mock('@/lib/storage', () => ({
  saveFile: jest.fn().mockReturnValue('mock-storage-path.pdf'),
  deleteFile: jest.fn(),
}));

describe('deleteDraft server action', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should delete a draft that belongs to the current user', async () => {
    const draft = await createDraftInDb(testDb, submitter.id, { title: 'To Delete' });

    const result = await deleteDraft(draft.id, testDb);

    expect(result.success).toBe(true);
    const found = await getDraftById(testDb, draft.id);
    expect(found).toBeUndefined();
  });

  it('should return error when draft does not exist', async () => {
    const result = await deleteDraft('nonexistent-id', testDb);
    expect(result.errors?.form).toBeDefined();
  });

  it("should not allow deleting another user's draft", async () => {
    const otherUser = await loginAs(testDb, 'submitter', { email: 'other@test.com' });
    const draft = await createDraftInDb(testDb, otherUser.id, { title: 'Other Draft' });

    const result = await deleteDraft(draft.id, testDb);

    expect(result.errors?.form).toBeDefined();
    const found = await getDraftById(testDb, draft.id);
    expect(found).toBeDefined();
  });

  it('should redirect to login when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const draft = await createDraftInDb(testDb, submitter.id, { title: 'Draft' });
    await expect(deleteDraft(draft.id, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });
});
