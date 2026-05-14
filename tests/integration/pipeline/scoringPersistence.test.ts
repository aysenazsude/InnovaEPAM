import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { evaluationScores, stageTransitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { advanceStage, rejectAtStage, approveAtFinalDecision } from '@/lib/actions/pipeline';
import { getScoreSummary, getIdeaAggregateScores } from '@/lib/pipeline/pipelineRepository';
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

describe('scoring persistence integration (US1)', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  function makeFormData(fields: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      fd.append(key, value);
    }
    return fd;
  }

  it('advanceStage: persists evaluation scores alongside the stage transition', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin.id, role: 'admin' } } as never);

    const fd = makeFormData({
      ideaId: idea.id,
      expectedStatus: 'screening',
      notes: 'looks good',
      score_innovation: '4',
      score_feasibility: '3',
      score_business_impact: '5',
      score_strategic_alignment: '2',
      score_technical_soundness: '4',
    });

    await advanceStage(null, fd, testDb);

    const scores = await testDb
      .select()
      .from(evaluationScores)
      .where(eq(evaluationScores.ideaId, idea.id));

    expect(scores).toHaveLength(5);
    const dims = scores.map((s) => s.dimension).sort();
    expect(dims).toEqual([
      'business_impact',
      'feasibility',
      'innovation',
      'strategic_alignment',
      'technical_soundness',
    ]);
    const innovation = scores.find((s) => s.dimension === 'innovation');
    expect(innovation?.score).toBe(4);
    expect(innovation?.adminId).toBe(admin.id);
  });

  it('advanceStage: stores no scores when no score fields are submitted', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin.id, role: 'admin' } } as never);

    const fd = makeFormData({ ideaId: idea.id, expectedStatus: 'screening', notes: 'looks good' });
    await advanceStage(null, fd, testDb);

    const scores = await testDb
      .select()
      .from(evaluationScores)
      .where(eq(evaluationScores.ideaId, idea.id));

    expect(scores).toHaveLength(0);
  });

  it('advanceStage: returns error and stores no transition when score is out of range', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin.id, role: 'admin' } } as never);

    const fd = makeFormData({ ideaId: idea.id, expectedStatus: 'screening', notes: 'bad score', score_innovation: '6' });
    const result = await advanceStage(null, fd, testDb);

    expect(result?.error).toBeTruthy();

    const scores = await testDb
      .select()
      .from(evaluationScores)
      .where(eq(evaluationScores.ideaId, idea.id));
    expect(scores).toHaveLength(0);
  });

  it('rejectAtStage: persists evaluation scores with the rejection transition', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin.id, role: 'admin' } } as never);

    const fd = makeFormData({
      ideaId: idea.id,
      expectedStatus: 'screening',
      notes: 'Not feasible',
      score_innovation: '1',
      score_feasibility: '2',
    });

    await rejectAtStage(null, fd, testDb);

    const scores = await testDb
      .select()
      .from(evaluationScores)
      .where(eq(evaluationScores.ideaId, idea.id));

    expect(scores).toHaveLength(2);
  });

  it('approveAtFinalDecision: persists evaluation scores', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'final_decision' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin.id, role: 'admin' } } as never);

    const fd = makeFormData({
      ideaId: idea.id,
      expectedStatus: 'final_decision',
      notes: 'Excellent',
      score_innovation: '5',
      score_feasibility: '5',
    });

    await approveAtFinalDecision(null, fd, testDb);

    const scores = await testDb
      .select()
      .from(evaluationScores)
      .where(eq(evaluationScores.ideaId, idea.id));

    expect(scores).toHaveLength(2);
  });
});

describe('scoring persistence integration (US2 — getScoreSummary)', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('returns empty byStage and null overall when idea has no transitions', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    const summary = await getScoreSummary(idea.id, testDb);
    expect(summary.byStage).toHaveLength(0);
    expect(summary.overallAverage).toBeNull();
  });

  it('returns per-stage scores and correct averages after a scored transition', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    // Insert a transition and 2 scores manually
    const transitionId = randomUUID();
    await testDb.insert(stageTransitions).values({
      id: transitionId,
      ideaId: idea.id,
      stage: 'screening',
      action: 'advanced',
      notes: '',
      adminId: admin.id,
      createdAt: Math.floor(Date.now() / 1000),
    });

    await testDb.insert(evaluationScores).values([
      {
        id: randomUUID(),
        ideaId: idea.id,
        stageTransitionId: transitionId,
        adminId: admin.id,
        dimension: 'innovation',
        score: 4,
        createdAt: Math.floor(Date.now() / 1000),
      },
      {
        id: randomUUID(),
        ideaId: idea.id,
        stageTransitionId: transitionId,
        adminId: admin.id,
        dimension: 'feasibility',
        score: 2,
        createdAt: Math.floor(Date.now() / 1000),
      },
    ]);

    const summary = await getScoreSummary(idea.id, testDb);
    expect(summary.byStage).toHaveLength(1);
    expect(summary.byStage[0].scores.innovation).toBe(4);
    expect(summary.byStage[0].scores.feasibility).toBe(2);
    expect(summary.byStage[0].stageAverage).toBe(3); // (4+2)/2
    expect(summary.overallAverage).toBe(3);
  });
});

describe('scoring persistence integration (US3 — getIdeaAggregateScores)', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('returns empty array when given no idea IDs', async () => {
    const result = await getIdeaAggregateScores([], testDb);
    expect(result).toEqual([]);
  });

  it('returns aggregated averages keyed by ideaId', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea1 = await submitIdea(testDb, submitter.id, { status: 'screening' });
    const idea2 = await submitIdea(testDb, submitter.id, { status: 'screening' });

    // Insert transitions first to satisfy FK constraints
    const t1 = randomUUID();
    const t2 = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await testDb.insert(stageTransitions).values([
      { id: t1, ideaId: idea1.id, stage: 'screening', action: 'advanced', notes: '', adminId: admin.id, createdAt: now },
      { id: t2, ideaId: idea2.id, stage: 'screening', action: 'advanced', notes: '', adminId: admin.id, createdAt: now },
    ]);

    // Insert raw scores for both ideas
    await testDb.insert(evaluationScores).values([
      { id: randomUUID(), ideaId: idea1.id, stageTransitionId: t1, adminId: admin.id, dimension: 'innovation', score: 4, createdAt: now },
      { id: randomUUID(), ideaId: idea1.id, stageTransitionId: t1, adminId: admin.id, dimension: 'feasibility', score: 2, createdAt: now },
      { id: randomUUID(), ideaId: idea2.id, stageTransitionId: t2, adminId: admin.id, dimension: 'innovation', score: 5, createdAt: now },
    ]);

    const result = await getIdeaAggregateScores([idea1.id, idea2.id], testDb);
    expect(result).toHaveLength(2);

    const idea1Score = result.find((r) => r.ideaId === idea1.id);
    expect(idea1Score?.average).toBe(3); // (4+2)/2

    const idea2Score = result.find((r) => r.ideaId === idea2.id);
    expect(idea2Score?.average).toBe(5);
  });

  it('omits ideas with no scores from the result', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    const result = await getIdeaAggregateScores([idea.id], testDb);
    expect(result).toHaveLength(0);
  });
});
