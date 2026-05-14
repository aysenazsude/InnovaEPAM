import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { ideas, stageTransitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rejectAtStage } from '@/lib/actions/pipeline';
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

describe('rejectAtStage integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should reject an idea at screening and set status to rejected', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'screening' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening');
    formData.set('notes', 'Does not meet basic criteria');

    const result = await rejectAtStage(null, formData, testDb);

    expect(result.error).toBeUndefined();
    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('rejected');
    expect(updated.evaluatedAt).not.toBeNull();

    const transitions = await testDb
      .select()
      .from(stageTransitions)
      .where(eq(stageTransitions.ideaId, idea.id));
    expect(transitions).toHaveLength(1);
    expect(transitions[0].action).toBe('rejected');
    expect(transitions[0].stage).toBe('screening');
    expect(transitions[0].notes).toBe('Does not meet basic criteria');
  });

  it('should reject an idea at final_decision', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'final_decision' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'final_decision');
    formData.set('notes', 'Not financially viable');

    const result = await rejectAtStage(null, formData, testDb);

    expect(result.error).toBeUndefined();
    const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updated.status).toBe('rejected');
  });

  it('should return error when rejection notes is empty', async () => {
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

    const result = await rejectAtStage(null, formData, testDb);

    expect(result.error).toBe('Notes are required');
    const [unchanged] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(unchanged.status).toBe('screening');
  });

  it('should return conflict when expectedStatus is stale', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id, { status: 'technical_review' });

    mockAuth.mockResolvedValueOnce({
      user: { id: admin.id, role: 'admin' },
    } as never);

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening'); // stale
    formData.set('notes', 'Rejection reason');

    const result = await rejectAtStage(null, formData, testDb);

    expect(result.conflict).toBe(true);
    const [unchanged] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(unchanged.status).toBe('technical_review');
  });
});
