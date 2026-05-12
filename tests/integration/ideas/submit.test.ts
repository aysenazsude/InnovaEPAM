import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { ideas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { submitIdea } from '@/lib/actions/ideas';
import { auth } from '@/auth';

// Mock 3rd-party boundaries: NextAuth + Next.js framework
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

describe('submitIdea server action', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should insert an idea row with status submitted and correct submitterId', async () => {
    const formData = new FormData();
    formData.set('title', 'Test Idea');
    formData.set('description', 'A detailed description of the test idea.');
    formData.set('category', 'technical_innovation');

    // redirect throws on success — catch and verify DB state
    await expect(submitIdea(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const [idea] = await testDb.select().from(ideas).where(eq(ideas.submitterId, submitter.id)).limit(1);
    expect(idea.status).toBe('submitted');
    expect(idea.title).toBe('Test Idea');
    expect(idea.submitterId).toBe(submitter.id);
  });

  it('should return validation errors for missing title', async () => {
    const formData = new FormData();
    formData.set('title', '');
    formData.set('description', 'A valid description.');
    formData.set('category', 'technical_innovation');

    const result = await submitIdea(null, formData, testDb);

    expect(result.errors?.title).toBeDefined();
    const all = await testDb.select().from(ideas);
    expect(all).toHaveLength(0);
  });

  it('should return validation errors for title exceeding 100 chars', async () => {
    const formData = new FormData();
    formData.set('title', 'A'.repeat(101));
    formData.set('description', 'A valid description.');
    formData.set('category', 'technical_innovation');

    const result = await submitIdea(null, formData, testDb);

    expect(result.errors?.title).toBeDefined();
  });

  it('should return validation errors for description exceeding 2000 chars', async () => {
    const formData = new FormData();
    formData.set('title', 'Valid Title');
    formData.set('description', 'A'.repeat(2001));
    formData.set('category', 'technical_innovation');

    const result = await submitIdea(null, formData, testDb);

    expect(result.errors?.description).toBeDefined();
  });

  it('should return validation errors for invalid category', async () => {
    const formData = new FormData();
    formData.set('title', 'Valid Title');
    formData.set('description', 'A valid description.');
    formData.set('category', 'not_a_real_category');

    const result = await submitIdea(null, formData, testDb);

    expect(result.errors?.category).toBeDefined();
  });

  it('should redirect to /login when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const formData = new FormData();
    formData.set('title', 'Valid Title');
    formData.set('description', 'A valid description.');
    formData.set('category', 'technical_innovation');

    await expect(submitIdea(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const all = await testDb.select().from(ideas);
    expect(all).toHaveLength(0);
  });
});
