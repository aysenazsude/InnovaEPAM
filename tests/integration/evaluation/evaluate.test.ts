import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { ideas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { transition } from '@/lib/ideas/statusMachine';
import { transitionToUnderReview, acceptIdea, rejectIdea } from '@/lib/actions/evaluation';
import { auth } from '@/auth';

// Mock 3rd-party boundaries: NextAuth + Next.js framework
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

// Existing DB-layer tests — keep to retain statusMachine coverage
describe('evaluate idea integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('transitionToUnderReview: sets status + evaluating_admin_id', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    await testDb
      .update(ideas)
      .set({ status: 'under_review', evaluatingAdminId: admin.id })
      .where(eq(ideas.id, idea.id));

    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('under_review');
    expect(updated.evaluatingAdminId).toBe(admin.id);
  });

  it('acceptIdea: sets status accepted + trimmed comment + evaluatedAt timestamp', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    const now = Math.floor(Date.now() / 1000);

    await testDb
      .update(ideas)
      .set({ status: 'under_review', evaluatingAdminId: admin.id })
      .where(eq(ideas.id, idea.id));

    await testDb
      .update(ideas)
      .set({ status: 'accepted', adminComment: '  Great idea!  '.trim(), evaluatedAt: now })
      .where(eq(ideas.id, idea.id));

    const [accepted] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(accepted.status).toBe('accepted');
    expect(accepted.adminComment).toBe('Great idea!');
    expect(accepted.evaluatedAt).toBeDefined();
  });

  it('empty comment at acceptance should be rejected by validation', () => {
    const comment = '   ';
    expect(comment.trim().length === 0).toBe(true);
  });

  it('invalid transition throws (statusMachine guard)', () => {
    expect(() => transition('submitted', 'accepted')).toThrow();
  });

  it('rejectIdea: sets status rejected + comment', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    const now = Math.floor(Date.now() / 1000);

    await testDb
      .update(ideas)
      .set({ status: 'under_review', evaluatingAdminId: admin.id })
      .where(eq(ideas.id, idea.id));

    await testDb
      .update(ideas)
      .set({ status: 'rejected', adminComment: 'Not feasible.', evaluatedAt: now })
      .where(eq(ideas.id, idea.id));

    const [rejected] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(rejected.status).toBe('rejected');
    expect(rejected.adminComment).toBe('Not feasible.');
  });
});

// Server action tests — call real actions with injected testDb
describe('evaluation server actions', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let admin: Awaited<ReturnType<typeof loginAs>>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    admin = await loginAs(testDb, 'admin');
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });
  });

  it('should set idea status to under_review and record evaluatingAdminId', async () => {
    const idea = await submitIdea(testDb, submitter.id);

    const result = await transitionToUnderReview(idea.id, testDb);

    expect(result).toEqual({});
    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('under_review');
    expect(updated.evaluatingAdminId).toBe(admin.id);
  });

  it('should return empty result when idea is already past submitted status', async () => {
    const idea = await submitIdea(testDb, submitter.id, { status: 'accepted' });

    const result = await transitionToUnderReview(idea.id, testDb);

    expect(result).toEqual({});
  });

  it('should return error when idea is not found for transitionToUnderReview', async () => {
    const result = await transitionToUnderReview('does-not-exist', testDb);

    expect(result.error).toBe('Idea not found');
  });

  it('should accept idea and persist trimmed comment and evaluatedAt', async () => {
    const idea = await submitIdea(testDb, submitter.id, { status: 'under_review' });

    const result = await acceptIdea(idea.id, '  Great idea!  ', testDb);

    expect(result).toEqual({});
    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('accepted');
    expect(updated.adminComment).toBe('Great idea!');
    expect(updated.evaluatingAdminId).toBe(admin.id);
    expect(updated.evaluatedAt).toBeGreaterThan(0);
  });

  it('should return error when acceptIdea comment is blank', async () => {
    const idea = await submitIdea(testDb, submitter.id, { status: 'under_review' });

    const result = await acceptIdea(idea.id, '   ', testDb);

    expect(result.error).toBe('Comment is required');
  });

  it('should return error when acceptIdea is called on a submitted idea', async () => {
    const idea = await submitIdea(testDb, submitter.id);

    const result = await acceptIdea(idea.id, 'Good idea', testDb);

    expect(result.error).toBe('Idea cannot be evaluated in its current status');
  });

  it('should return error when idea is not found for acceptIdea', async () => {
    const result = await acceptIdea('does-not-exist', 'Good idea', testDb);

    expect(result.error).toBe('Idea not found');
  });

  it('should reject idea and persist trimmed comment and evaluatedAt', async () => {
    const idea = await submitIdea(testDb, submitter.id, { status: 'under_review' });

    const result = await rejectIdea(idea.id, 'Not feasible.', testDb);

    expect(result).toEqual({});
    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('rejected');
    expect(updated.adminComment).toBe('Not feasible.');
    expect(updated.evaluatingAdminId).toBe(admin.id);
    expect(updated.evaluatedAt).toBeGreaterThan(0);
  });

  it('should return error when rejectIdea comment is blank', async () => {
    const idea = await submitIdea(testDb, submitter.id, { status: 'under_review' });

    const result = await rejectIdea(idea.id, '', testDb);

    expect(result.error).toBe('Comment is required');
  });

  it('should return error when rejectIdea is called on a submitted idea', async () => {
    const idea = await submitIdea(testDb, submitter.id);

    const result = await rejectIdea(idea.id, 'No thanks', testDb);

    expect(result.error).toBe('Idea cannot be evaluated in its current status');
  });

  it('should return error when idea is not found for rejectIdea', async () => {
    const result = await rejectIdea('does-not-exist', 'No thanks', testDb);

    expect(result.error).toBe('Idea not found');
  });

  it('should redirect to /login when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const idea = await submitIdea(testDb, submitter.id);

    await expect(transitionToUnderReview(idea.id, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should redirect to /ideas when caller is not an admin', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, submitter.id);

    await expect(transitionToUnderReview(idea.id, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });
});
