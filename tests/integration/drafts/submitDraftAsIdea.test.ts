import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { createDraftInDb } from '../../helpers/draftHelpers';
import { submitDraftAsIdea } from '@/lib/actions/drafts';
import { ideas, drafts } from '@/lib/db/schema';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

describe('submitDraftAsIdea server action', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should create an idea and delete the draft on success', async () => {
    const draft = await createDraftInDb(testDb, submitter.id, {
      title: 'Complete Draft',
      description: 'A full description for submission.',
      category: 'technical_innovation',
    });

    await expect(submitDraftAsIdea(draft.id, testDb)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT',
    });

    const allIdeas = await testDb.select().from(ideas);
    expect(allIdeas).toHaveLength(1);
    expect(allIdeas[0].title).toBe('Complete Draft');
    expect(allIdeas[0].status).toBe('submitted');

    const remainingDrafts = await testDb.select().from(drafts);
    expect(remainingDrafts).toHaveLength(0);
  });

  it('should return validation errors when draft title is empty', async () => {
    const draft = await createDraftInDb(testDb, submitter.id, {
      title: null,
      description: 'A description.',
      category: 'technical_innovation',
    });

    const result = await submitDraftAsIdea(draft.id, testDb);

    expect(result.errors?.title).toBeDefined();
    const allIdeas = await testDb.select().from(ideas);
    expect(allIdeas).toHaveLength(0);
  });

  it('should return error when draft does not exist', async () => {
    const result = await submitDraftAsIdea('nonexistent-draft-id', testDb);
    expect(result.errors?.form).toBeDefined();
  });

  it("should not allow submitting another user's draft", async () => {
    const otherUser = await loginAs(testDb, 'submitter', { email: 'other@test.com' });
    const draft = await createDraftInDb(testDb, otherUser.id, {
      title: 'Other User Draft',
      description: 'Description',
      category: 'process_improvement',
    });

    const result = await submitDraftAsIdea(draft.id, testDb);
    expect(result.errors?.form).toBeDefined();
  });

  it('should redirect to login when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const draft = await createDraftInDb(testDb, submitter.id, { title: 'Draft' });
    await expect(submitDraftAsIdea(draft.id, testDb)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT',
    });
  });
});
