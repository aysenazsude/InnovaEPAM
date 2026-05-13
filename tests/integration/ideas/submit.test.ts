import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { ideas, ideaCategoryData } from '@/lib/db/schema';
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

describe('submitIdea — category-specific fields', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should persist category fields to idea_category_data on success', async () => {
    const formData = new FormData();
    formData.set('title', 'Process Idea');
    formData.set('description', 'Detailed process description.');
    formData.set('category', 'process_improvement');
    formData.set('affected_team', 'Platform Engineering');
    formData.set('current_pain_point', 'Slow CI pipeline.');

    await expect(submitIdea(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const [idea] = await testDb.select().from(ideas).where(eq(ideas.submitterId, submitter.id)).limit(1);
    const [catData] = await testDb.select().from(ideaCategoryData).where(eq(ideaCategoryData.ideaId, idea.id));

    expect(catData).toBeDefined();
    expect(catData.category).toBe('process_improvement');
    expect(catData.fields).toMatchObject({
      affected_team: 'Platform Engineering',
      current_pain_point: 'Slow CI pipeline.',
    });
  });

  it('should succeed without inserting a category data row when no category fields are submitted', async () => {
    const formData = new FormData();
    formData.set('title', 'Generic Idea');
    formData.set('description', 'Just a basic idea with no extra fields.');
    formData.set('category', 'process_improvement');

    await expect(submitIdea(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const allCatData = await testDb.select().from(ideaCategoryData);
    expect(allCatData).toHaveLength(0);
  });

  it('should return a field error when a text category field exceeds 100 chars', async () => {
    const formData = new FormData();
    formData.set('title', 'Process Idea');
    formData.set('description', 'Detailed description.');
    formData.set('category', 'process_improvement');
    formData.set('affected_team', 'A'.repeat(101));

    const result = await submitIdea(null, formData, testDb);

    expect(result.errors?.['affected_team']).toBeDefined();
    const allIdeas = await testDb.select().from(ideas);
    expect(allIdeas).toHaveLength(0);
  });

  it('should return a field error when a textarea category field exceeds 500 chars', async () => {
    const formData = new FormData();
    formData.set('title', 'Process Idea');
    formData.set('description', 'Detailed description.');
    formData.set('category', 'process_improvement');
    formData.set('current_pain_point', 'B'.repeat(501));

    const result = await submitIdea(null, formData, testDb);

    expect(result.errors?.['current_pain_point']).toBeDefined();
    const allIdeas = await testDb.select().from(ideas);
    expect(allIdeas).toHaveLength(0);
  });

  it('should not persist non-whitelisted FormData keys to idea_category_data', async () => {
    const formData = new FormData();
    formData.set('title', 'Process Idea');
    formData.set('description', 'Detailed description.');
    formData.set('category', 'process_improvement');
    formData.set('affected_team', 'Engineering');
    formData.set('__proto__', 'injection'); // should be ignored

    await expect(submitIdea(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const [idea] = await testDb.select().from(ideas).where(eq(ideas.submitterId, submitter.id)).limit(1);
    const [catData] = await testDb.select().from(ideaCategoryData).where(eq(ideaCategoryData.ideaId, idea.id));

    const ownKeys = Object.keys(catData.fields);
    expect(ownKeys).not.toContain('__proto__');
    expect(ownKeys).toContain('affected_team');
  });

  it('should not insert a category data row for "other" category', async () => {
    const formData = new FormData();
    formData.set('title', 'Other Idea');
    formData.set('description', 'Some idea without category fields.');
    formData.set('category', 'other');

    await expect(submitIdea(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const allCatData = await testDb.select().from(ideaCategoryData);
    expect(allCatData).toHaveLength(0);
  });
});
