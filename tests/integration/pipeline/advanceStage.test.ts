import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { ideas, stageTransitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  startPipelineReview,
  advanceStage,
  approveAtFinalDecision,
} from '@/lib/actions/pipeline';
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

describe('advanceStage integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('startPipelineReview: sets idea status to screening and inserts a transition row', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const result = await startPipelineReview(idea.id, testDb);

    expect(result.error).toBeUndefined();

    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('screening');

    const transitions = await testDb
      .select()
      .from(stageTransitions)
      .where(eq(stageTransitions.ideaId, idea.id));
    expect(transitions).toHaveLength(1);
    expect(transitions[0].action).toBe('advanced');
    expect(transitions[0].stage).toBe('screening');
  });

  it('advanceStage: advances from screening to technical_review and persists notes', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening');
    formData.set('notes', 'Passed screening checks');

    const result = await advanceStage(null, formData, testDb);

    expect(result.error).toBeUndefined();
    expect(result.conflict).toBeUndefined();

    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('technical_review');

    const transitions = await testDb
      .select()
      .from(stageTransitions)
      .where(eq(stageTransitions.ideaId, idea.id));
    expect(transitions).toHaveLength(1);
    expect(transitions[0].notes).toBe('Passed screening checks');
  });

  it('advanceStage: returns error when notes is empty', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening');
    formData.set('notes', '');

    const result = await advanceStage(null, formData, testDb);

    expect(result.error).toBe('Notes are required');
    const [unchanged] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(unchanged.status).toBe('screening');
  });

  it('advanceStage: returns conflict when expectedStatus is stale', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'technical_review' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening'); // stale — actual is technical_review
    formData.set('notes', 'Some notes');

    const result = await advanceStage(null, formData, testDb);

    expect(result.conflict).toBe(true);
  });

  it('approveAtFinalDecision: sets status to approved and sets evaluatedAt', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'final_decision' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'final_decision');
    formData.set('notes', 'Excellent idea, fully approved');

    const result = await approveAtFinalDecision(null, formData, testDb);

    expect(result.error).toBeUndefined();
    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('approved');
    expect(updated.evaluatedAt).not.toBeNull();
  });

  it('startPipelineReview: redirects to /login when unauthenticated', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    mockAuth.mockResolvedValueOnce(null as never);

    await expect(startPipelineReview(idea.id, testDb)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT',
    });
  });

  it('startPipelineReview: redirects to /ideas when caller is not admin', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    mockAuth.mockResolvedValueOnce({
      user: { id: submitter.id, role: 'submitter' },
    } as never);

    await expect(startPipelineReview(idea.id, testDb)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT',
    });
  });
});
