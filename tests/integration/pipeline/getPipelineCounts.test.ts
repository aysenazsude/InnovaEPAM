import { describe, it, expect, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { getPipelineCounts } from '@/lib/actions/pipeline';
import { advanceIdeaToStage } from '../../helpers/pipelineHelpers';
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

describe('getPipelineCounts', () => {
  it('should return zero counts when no pipeline ideas exist', async () => {
    const db = createTestDb();
    const admin = await loginAs(db, 'admin');
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);

    const result = await getPipelineCounts(db);

    expect(result).toEqual({
      screening: 0,
      technical_review: 0,
      business_review: 0,
      final_decision: 0,
      awaiting_clarification: 0,
    });
  });

  it('should count ideas by pipeline stage', async () => {
    const db = createTestDb();
    const admin = await loginAs(db, 'admin');
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);

    const submitter = await loginAs(db, 'submitter');

    const idea1 = await submitIdea(db, submitter.id);
    const idea2 = await submitIdea(db, submitter.id);
    const idea3 = await submitIdea(db, submitter.id);

    await advanceIdeaToStage(db, idea1.id, admin.id, 'screening');
    await advanceIdeaToStage(db, idea2.id, admin.id, 'screening');
    await advanceIdeaToStage(db, idea3.id, admin.id, 'technical_review');

    const result = await getPipelineCounts(db);

    expect(result.screening).toBe(2);
    expect(result.technical_review).toBe(1);
    expect(result.business_review).toBe(0);
    expect(result.final_decision).toBe(0);
  });

  it('should redirect non-admins', async () => {
    const db = createTestDb();
    const user = await loginAs(db, 'submitter');
    mockAuth.mockResolvedValue({ user } as Awaited<ReturnType<typeof auth>>);

    await expect(getPipelineCounts(db)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });
});
