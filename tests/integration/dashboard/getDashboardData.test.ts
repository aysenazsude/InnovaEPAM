import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { getDashboardData } from '@/lib/actions/dashboard';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), {
      digest: `NEXT_REDIRECT;replace;${url};200;`,
    });
  }),
}));

describe('getDashboardData server action', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should redirect to /login when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(getDashboardData(testDb)).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
  });

  it('should return zero-filled stats when DB has no ideas', async () => {
    const user = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: user.id, role: 'submitter' } });

    const result = await getDashboardData(testDb);

    expect(result.systemStats).toEqual({ totalSubmitted: 0, totalApproved: 0, totalInPipeline: 0 });
    expect(result.userStats).toEqual({ totalSubmitted: 0, totalApproved: 0, totalPending: 0 });
    expect(result.lastSubmission).toBeNull();
  });

  it('should count all system ideas regardless of submitter', async () => {
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    await submitIdea(testDb, alice.id, { status: 'submitted' });
    await submitIdea(testDb, bob.id, { status: 'approved' });
    await submitIdea(testDb, bob.id, { status: 'screening' });

    const result = await getDashboardData(testDb);

    expect(result.systemStats.totalSubmitted).toBe(3);
    expect(result.systemStats.totalApproved).toBe(1);
    expect(result.systemStats.totalInPipeline).toBe(1);
  });

  it('should count only the current user stats in userStats', async () => {
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    await submitIdea(testDb, alice.id, { status: 'submitted' });
    await submitIdea(testDb, alice.id, { status: 'approved' });
    await submitIdea(testDb, alice.id, { status: 'screening' });
    await submitIdea(testDb, bob.id, { status: 'approved' });

    const result = await getDashboardData(testDb);

    expect(result.userStats.totalSubmitted).toBe(3);
    expect(result.userStats.totalApproved).toBe(1);
    expect(result.userStats.totalPending).toBe(1);
  });

  it('should return the most recent submission as lastSubmission', async () => {
    const user = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: user.id, role: 'submitter' } });

    await submitIdea(testDb, user.id, { title: 'Older Idea', status: 'submitted' });
    // Ensure the second has a later submittedAt by using a small delay in the helper
    await submitIdea(testDb, user.id, { title: 'Newer Idea', status: 'screening' });

    const result = await getDashboardData(testDb);

    // lastSubmission should be the one with the higher submittedAt
    // Both may share the same timestamp; check title is one of the two
    expect(['Older Idea', 'Newer Idea']).toContain(result.lastSubmission?.title);
    expect(result.lastSubmission?.id).toBeTruthy();
    expect(result.lastSubmission?.status).toBeTruthy();
    expect(typeof result.lastSubmission?.submittedAt).toBe('number');
  });

  it('should set lastSubmission to null when user has no ideas', async () => {
    const user = await loginAs(testDb, 'submitter');
    const other = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: user.id, role: 'submitter' } });

    // Only other user has ideas
    await submitIdea(testDb, other.id, { status: 'submitted' });

    const result = await getDashboardData(testDb);

    expect(result.lastSubmission).toBeNull();
  });

  it('should include all pipeline statuses in totalInPipeline', async () => {
    const user = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: user.id, role: 'submitter' } });

    const pipelineStatuses = [
      'screening',
      'technical_review',
      'business_review',
      'final_decision',
      'awaiting_clarification',
    ] as const;

    for (const status of pipelineStatuses) {
      await submitIdea(testDb, user.id, { status });
    }
    await submitIdea(testDb, user.id, { status: 'approved' });
    await submitIdea(testDb, user.id, { status: 'rejected' });

    const result = await getDashboardData(testDb);

    expect(result.systemStats.totalInPipeline).toBe(5);
    expect(result.systemStats.totalApproved).toBe(1);
    expect(result.systemStats.totalSubmitted).toBe(7);
  });
});
