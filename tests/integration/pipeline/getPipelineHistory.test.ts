import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { advanceIdeaToStage } from '../../helpers/pipelineHelpers';
import { getPipelineHistory } from '@/lib/actions/pipeline';
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

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('getPipelineHistory integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should return empty array for idea with no transitions', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const history = await getPipelineHistory(idea.id, testDb);
    expect(history).toEqual([]);
  });

  it('should return transitions in ascending createdAt order', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'business_review');

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const history = await getPipelineHistory(idea.id, testDb);
    expect(history.length).toBe(3); // screening, technical_review, business_review
    expect(history[0].stage).toBe('screening');
    expect(history[1].stage).toBe('technical_review');
    expect(history[2].stage).toBe('business_review');
    // Verify ascending order
    expect(history[0].createdAt).toBeLessThanOrEqual(history[1].createdAt);
    expect(history[1].createdAt).toBeLessThanOrEqual(history[2].createdAt);
  });

  it('should populate adminDisplayName from user JOIN', async () => {
    const admin = await loginAs(testDb, 'admin', { displayName: 'Alice Admin' });
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const history = await getPipelineHistory(idea.id, testDb);
    expect(history).toHaveLength(1);
    expect(history[0].adminDisplayName).toBe('Alice Admin');
  });

  it('should allow a submitter to fetch history of their own idea', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    mockAuth.mockResolvedValueOnce({
      user: { id: submitter.id, role: 'submitter' },
    } as never);

    const history = await getPipelineHistory(idea.id, testDb);
    expect(history).toHaveLength(1);
  });

  it('should return error when submitter tries to fetch history of another submitter\'s idea', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter1 = await loginAs(testDb, 'submitter');
    const submitter2 = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter1.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    mockAuth.mockResolvedValueOnce({
      user: { id: submitter2.id, role: 'submitter' },
    } as never);

    const result = await getPipelineHistory(idea.id, testDb);
    // Should be empty or contain error — implementation returns [] for not-authorized
    // per contract: returns { error: 'Not authorized' }
    expect(result).toEqual({ error: 'Not authorized' });
  });
});
