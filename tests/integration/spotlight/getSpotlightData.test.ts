import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { ideas, stageTransitions, evaluationScores, spotlightPicks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSpotlightData } from '@/lib/actions/spotlight';
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

// Fixed timestamps so tests are deterministic and always in May 2026
const MAY_2026_TS = Math.floor(new Date('2026-05-10T12:00:00Z').getTime() / 1000);
const APR_2026_TS = Math.floor(new Date('2026-04-10T12:00:00Z').getTime() / 1000);

describe('getSpotlightData server action', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
    // Fix current date to May 2026 so month filter '2026-05' is stable
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should redirect to /login when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(getSpotlightData(testDb)).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
  });

  it('should return null spotlight when no ideas exist for current month', async () => {
    const user = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: user.id, role: 'submitter' } });

    // Insert idea in a PREVIOUS month so it doesn't qualify
    await testDb.insert(ideas).values({
      id: randomUUID(),
      numericId: 100001,
      title: 'Old Idea',
      description: 'desc',
      category: 'technical_innovation',
      status: 'submitted',
      submitterId: user.id,
      submittedAt: APR_2026_TS,
      adminComment: null,
      evaluatingAdminId: null,
      evaluatedAt: null,
    });

    const result = await getSpotlightData(testDb);

    expect(result.spotlight).toBeNull();
  });

  it('should return Score Pending spotlight when ideas exist but none are scored', async () => {
    const user = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: user.id, role: 'submitter' } });

    await testDb.insert(ideas).values({
      id: randomUUID(),
      numericId: 100002,
      title: 'Unscored Idea',
      description: 'desc',
      category: 'technical_innovation',
      status: 'submitted',
      submitterId: user.id,
      submittedAt: MAY_2026_TS,
      adminComment: null,
      evaluatingAdminId: null,
      evaluatedAt: null,
    });

    const result = await getSpotlightData(testDb);

    expect(result.spotlight).not.toBeNull();
    expect(result.spotlight!.label).toBe('Score Pending');
    expect(result.spotlight!.compositeScore).toBeNull();
    expect(result.spotlight!.title).toBe('Unscored Idea');
  });

  it('should return Top Rated spotlight with correct composite score', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const lowId = randomUUID();
    const highId = randomUUID();
    const now = MAY_2026_TS;

    await testDb.insert(ideas).values([
      { id: lowId, numericId: 100003, title: 'Low Score Idea', description: 'desc', category: 'technical_innovation', status: 'screening', submitterId: submitter.id, submittedAt: now - 100, adminComment: null, evaluatingAdminId: null, evaluatedAt: null },
      { id: highId, numericId: 100004, title: 'High Score Idea', description: 'desc', category: 'process_improvement', status: 'screening', submitterId: submitter.id, submittedAt: now, adminComment: null, evaluatingAdminId: null, evaluatedAt: null },
    ]);

    const t1 = randomUUID();
    const t2 = randomUUID();
    await testDb.insert(stageTransitions).values([
      { id: t1, ideaId: lowId, stage: 'screening', action: 'advanced', notes: '', adminId: admin.id, createdAt: now },
      { id: t2, ideaId: highId, stage: 'screening', action: 'advanced', notes: '', adminId: admin.id, createdAt: now },
    ]);

    await testDb.insert(evaluationScores).values([
      { id: randomUUID(), ideaId: lowId, stageTransitionId: t1, adminId: admin.id, dimension: 'innovation', score: 2, createdAt: now },
      { id: randomUUID(), ideaId: highId, stageTransitionId: t2, adminId: admin.id, dimension: 'innovation', score: 4, createdAt: now },
      { id: randomUUID(), ideaId: highId, stageTransitionId: t2, adminId: admin.id, dimension: 'feasibility', score: 5, createdAt: now },
    ]);

    const result = await getSpotlightData(testDb);

    expect(result.spotlight!.label).toBe('Top Rated');
    expect(result.spotlight!.title).toBe('High Score Idea');
    // AVG(4, 5) = 4.5
    expect(result.spotlight!.compositeScore).toBeCloseTo(4.5, 1);
  });

  it("should return Editor's Pick when one is pinned, overriding scored ideas", async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const pinnedId = randomUUID();
    const highScoreId = randomUUID();
    const now = MAY_2026_TS;

    await testDb.insert(ideas).values([
      { id: pinnedId, numericId: 100005, title: 'Pinned Idea', description: 'desc', category: 'technical_innovation', status: 'submitted', submitterId: submitter.id, submittedAt: now, adminComment: null, evaluatingAdminId: null, evaluatedAt: null },
      { id: highScoreId, numericId: 100006, title: 'High Score Idea', description: 'desc', category: 'process_improvement', status: 'screening', submitterId: submitter.id, submittedAt: now, adminComment: null, evaluatingAdminId: null, evaluatedAt: null },
    ]);

    // Give highScoreId a high score
    const t1 = randomUUID();
    await testDb.insert(stageTransitions).values({ id: t1, ideaId: highScoreId, stage: 'screening', action: 'advanced', notes: '', adminId: admin.id, createdAt: now });
    await testDb.insert(evaluationScores).values({ id: randomUUID(), ideaId: highScoreId, stageTransitionId: t1, adminId: admin.id, dimension: 'innovation', score: 5, createdAt: now });

    // Pin the OTHER idea as Editor's Pick
    await testDb.insert(spotlightPicks).values({ id: randomUUID(), ideaId: pinnedId, monthYear: '2026-05', pinnedAt: now, pinnedByAdminId: admin.id });

    const result = await getSpotlightData(testDb);

    expect(result.spotlight!.label).toBe("Editor's Pick");
    expect(result.spotlight!.title).toBe('Pinned Idea');
    expect(result.currentPickIdeaId).toBe(pinnedId);
  });

  it('should return recently approved ordered by evaluatedAt DESC limited to 5', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const baseTs = MAY_2026_TS;
    const approvedIds: string[] = [];

    for (let i = 0; i < 7; i++) {
      const id = randomUUID();
      approvedIds.push(id);
      await testDb.insert(ideas).values({
        id,
        numericId: 200000 + i,
        title: `Approved Idea ${i}`,
        description: 'desc',
        category: 'technical_innovation',
        status: 'approved',
        submitterId: submitter.id,
        submittedAt: baseTs - 1000 + i,
        adminComment: 'good',
        evaluatingAdminId: submitter.id,
        evaluatedAt: baseTs + i, // increasing order
      });
    }

    const result = await getSpotlightData(testDb);

    // Should return only 5 items
    expect(result.recentlyApproved).toHaveLength(5);
    // Should be newest first (highest evaluatedAt)
    expect(result.recentlyApproved[0].title).toBe('Approved Idea 6');
    expect(result.recentlyApproved[4].title).toBe('Approved Idea 2');
    expect(result.hasMoreApproved).toBe(true);
  });

  it('should set hasMoreApproved to false when 5 or fewer approved ideas', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    for (let i = 0; i < 3; i++) {
      await testDb.insert(ideas).values({
        id: randomUUID(),
        numericId: 300000 + i,
        title: `Approved ${i}`,
        description: 'desc',
        category: 'technical_innovation',
        status: 'approved',
        submitterId: submitter.id,
        submittedAt: MAY_2026_TS,
        adminComment: 'ok',
        evaluatingAdminId: submitter.id,
        evaluatedAt: MAY_2026_TS + i,
      });
    }

    const result = await getSpotlightData(testDb);

    expect(result.recentlyApproved).toHaveLength(3);
    expect(result.hasMoreApproved).toBe(false);
  });

  it('should return correct monthly activity counts for current month', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const now = MAY_2026_TS;

    // 3 submitted this month (various statuses)
    await testDb.insert(ideas).values([
      { id: randomUUID(), numericId: 400001, title: 'Sub 1', description: 'd', category: 'technical_innovation', status: 'submitted', submitterId: submitter.id, submittedAt: now, adminComment: null, evaluatingAdminId: null, evaluatedAt: null },
      { id: randomUUID(), numericId: 400002, title: 'Sub 2', description: 'd', category: 'technical_innovation', status: 'screening', submitterId: submitter.id, submittedAt: now, adminComment: null, evaluatingAdminId: null, evaluatedAt: null },
      { id: randomUUID(), numericId: 400003, title: 'Sub 3', description: 'd', category: 'technical_innovation', status: 'approved', submitterId: submitter.id, submittedAt: APR_2026_TS, adminComment: 'good', evaluatingAdminId: submitter.id, evaluatedAt: now },
    ]);

    const result = await getSpotlightData(testDb);

    // submitted this month: 2 (Sub 1 and Sub 2 have submittedAt in May)
    expect(result.monthlyActivity.submitted).toBe(2);
    // in review this month (status = screening and submittedAt in May): 1
    expect(result.monthlyActivity.inReview).toBe(1);
    // approved this month (status = approved and evaluatedAt in May): 1
    expect(result.monthlyActivity.approved).toBe(1);
    expect(result.monthlyActivity.monthLabel).toMatch(/May 2026/i);
  });
});
