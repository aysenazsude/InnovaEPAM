import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { getMyIdeas, getIdeaById, getAdminIdeas } from '@/lib/actions/ideas';
import { ideas, ideaCategoryData } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

// Mock 3rd-party boundaries: NextAuth + Next.js framework
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

describe('getMyIdeas / getIdeaById / getAdminIdeas server actions', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should return only the submitter\'s own ideas', async () => {
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    await submitIdea(testDb, alice.id, { title: 'Alice Idea 1' });
    await submitIdea(testDb, alice.id, { title: 'Alice Idea 2' });
    await submitIdea(testDb, bob.id, { title: 'Bob Idea' });

    const aliceIdeas = await getMyIdeas(testDb);

    expect(aliceIdeas).toHaveLength(2);
    aliceIdeas.forEach((idea) => expect(idea.submitterId).toBe(alice.id));
  });

  it('should return empty array when submitter has no ideas', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    const result = await getMyIdeas(testDb);

    expect(result).toEqual([]);
  });

  it('should include attachment field (null when no attachment)', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    await submitIdea(testDb, alice.id, { title: 'No Attachment Idea' });

    const [idea] = await getMyIdeas(testDb);

    expect(idea.attachment).toBeNull();
  });

  it('should redirect to /login when session is missing for getMyIdeas', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(getMyIdeas(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should return all ideas for admin', async () => {
    const admin = await loginAs(testDb, 'admin');
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    await submitIdea(testDb, alice.id);
    await submitIdea(testDb, bob.id);

    const allIdeas = await getAdminIdeas(testDb);

    expect(allIdeas).toHaveLength(2);
  });

  it('should redirect to /ideas when non-admin calls getAdminIdeas', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    await expect(getAdminIdeas(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should redirect to /login when session is missing for getAdminIdeas', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(getAdminIdeas(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should return correct idea for the owner', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { title: 'Special Idea' });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.title).toBe('Special Idea');
    expect(found?.attachment).toBeNull();
  });

  it('should return null for an idea belonging to another submitter', async () => {
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const bobIdea = await submitIdea(testDb, bob.id, { title: 'Bob Private Idea' });

    const found = await getIdeaById(bobIdea.id, testDb);

    expect(found).toBeNull();
  });

  it('should return null when idea does not exist', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    const found = await getIdeaById('does-not-exist', testDb);

    expect(found).toBeNull();
  });

  it('should allow admin to get any idea by id', async () => {
    const admin = await loginAs(testDb, 'admin');
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });
    const idea = await submitIdea(testDb, alice.id, { title: 'Alice Idea' });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.title).toBe('Alice Idea');
  });

  it('should reflect status changes in subsequent fetch', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id);

    await testDb.update(ideas).set({ status: 'under_review' }).where(eq(ideas.id, idea.id));

    const updated = await getIdeaById(idea.id, testDb);
    expect(updated?.status).toBe('under_review');
  });
});

describe('getIdeaById — categoryData join', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should return null categoryData when no category fields were submitted', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { category: 'other' });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.categoryData).toBeNull();
  });

  it('should return categoryData with fields when present', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { category: 'process_improvement' });

    // Manually insert category data row
    await testDb.insert(ideaCategoryData).values({
      ideaId: idea.id,
      category: 'process_improvement',
      fields: { affected_team: 'Platform', current_pain_point: 'Slow deploys.' },
      createdAt: Math.floor(Date.now() / 1000),
    });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.categoryData).not.toBeNull();
    expect(found?.categoryData?.fields).toMatchObject({ affected_team: 'Platform' });
  });
});
